// WhatsApp OTP delivery through Baileys (WhatsApp Web protocol).
// First run: a QR code is printed in the terminal. Scan it with the WhatsApp account that should send the
// codes (WhatsApp > Linked devices). The session is stored in WHATSAPP_AUTH_DIR so it only has to be done once.
const path = require('path');
const qrcode = require('qrcode-terminal');

const state = { status: 'disabled', sock: null, qr: null, starting: false, retries: 0 };

const enabled = () => String(process.env.WHATSAPP_OTP_ENABLED || '').toLowerCase() === 'true';
const isReady = () => state.status === 'connected' && Boolean(state.sock);
const getStatus = () => ({ enabled: enabled(), status: state.status, hasQr: Boolean(state.qr) });

// 0323xxxxxxx -> 92323xxxxxxx
const toJid = (phone) => `92${String(phone).replace(/^0/, '')}@s.whatsapp.net`;

async function start() {
  if (!enabled() || state.starting) return;
  state.starting = true;
  state.status = 'connecting';
  try {
    const baileys = await import('@whiskeysockets/baileys');
    const makeWASocket = baileys.default?.default || baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = baileys;
    const pino = require('pino');
    const dir = path.resolve(process.env.WHATSAPP_AUTH_DIR || './auth_info_baileys');
    const { state: auth, saveCreds } = await useMultiFileAuthState(dir);
    let version;
    try {
      version = (await fetchLatestBaileysVersion()).version;
    } catch {
      /* use library default */
    }
    const sock = makeWASocket({
      auth,
      version,
      logger: pino({ level: 'silent' }),
      browser: Browsers ? Browsers.macOS('RoshanRozgar') : ['RoshanRozgar', 'Chrome', '1.0'],
      markOnlineOnConnect: false,
    });
    state.sock = sock;
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => {
      const { connection, lastDisconnect, qr } = u;
      if (qr) {
        state.qr = qr;
        state.status = 'waiting_for_qr';
        if (state.qrShown) return; // print only the first QR of a connection attempt to avoid spamming the terminal
        state.qrShown = true;
        console.log('\nWhatsApp: scan this QR with the sender account (WhatsApp > Linked devices):\n');
        qrcode.generate(qr, { small: true });
      }
      if (connection === 'open') {
        state.status = 'connected';
        state.qr = null;
        state.qrShown = false;
        state.retries = 0;
        const me = (sock.user?.id || '').split(':')[0].split('@')[0];
        console.log(`
✅ WhatsApp service is running${me ? ` (sender +${me})` : ''}. OTP codes will be sent over WhatsApp.
`);
      }
      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        // 515 (restart required) is normal right after scanning the QR: reconnect with the saved session.
        console.log(`WhatsApp connection closed (code ${code ?? 'unknown'}); ${code === DisconnectReason.loggedOut ? 'logged out' : 'reconnecting'}...`);
        state.sock = null;
        state.starting = false;
        state.qrShown = false;
        if (code === DisconnectReason.loggedOut) {
          state.status = 'logged_out';
          console.log('WhatsApp session logged out. Delete the auth folder and restart to link again.');
          return;
        }
        state.status = 'connecting';
        state.retries += 1;
        const wait = Math.min(30000, 2000 * state.retries);
        setTimeout(() => start().catch(() => {}), wait);
      }
    });
  } catch (err) {
    state.status = 'error';
    state.starting = false;
    console.error('WhatsApp start failed:', err.message);
  }
}

async function sendOtp(phone, code) {
  if (!isReady()) throw new Error('WhatsApp is not connected');
  const jid = toJid(phone);
  const check = await state.sock.onWhatsApp(jid).catch(() => null);
  if (check && check.length && check[0].exists === false) {
    const e = new Error('This number is not on WhatsApp');
    e.code = 'NOT_ON_WHATSAPP';
    throw e;
  }
  const target = check?.[0]?.jid || jid;
  await state.sock.sendMessage(target, {
    text: `Your RoshanRozgar verification code is *${code}*. It expires in 10 minutes. Do not share it with anyone.`,
  });
}

module.exports = { start, sendOtp, isReady, getStatus, enabled };

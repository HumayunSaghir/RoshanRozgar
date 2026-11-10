const User = require('../models/User');
const OtpCode = require('../models/OtpCode');
const { signToken, normalizePhone } = require('../services/auth');
const { serializeSelf } = require('./serialize');

const whatsapp = require('../services/whatsapp');

// Demo fallback (code shown in the UI) is only used when WhatsApp delivery is unavailable and OTP_DEMO_FALLBACK != false.
const demoFallback = () => String(process.env.OTP_DEMO_FALLBACK || 'true').toLowerCase() !== 'false';

async function requestOtp(req, res) {
  const phone = normalizePhone(req.body.phone);
  if (!phone) return res.status(400).json({ error: 'Invalid phone number. Example: 0300 1234567' });

  // Seeded demo accounts have fake numbers, so they always use the demo code.
  const seededUser = await User.findOne({ phone, seeded: true }).select('_id');
  const viaWhatsApp = !seededUser && whatsapp.enabled() && whatsapp.isReady();
  if (!seededUser && whatsapp.enabled() && !viaWhatsApp && !demoFallback()) {
    return res.status(503).json({ error: 'Code delivery is temporarily unavailable. Please try again shortly.' });
  }
  const code = viaWhatsApp ? String(Math.floor(1000 + Math.random() * 9000)) : process.env.DEMO_OTP || '1234';
  await OtpCode.deleteMany({ phone });

  if (viaWhatsApp) {
    try {
      await whatsapp.sendOtp(phone, code);
    } catch (err) {
      if (err.code === 'NOT_ON_WHATSAPP') return res.status(400).json({ error: 'This number is not registered on WhatsApp.' });
      console.error('WhatsApp OTP failed:', err.message);
      return res.status(502).json({ error: 'Could not send the code on WhatsApp. Please try again.' });
    }
  }
  await OtpCode.create({ phone, code, expiresAt: new Date(Date.now() + 10 * 60000) });

  const existing = await User.findOne({ phone }).select('role name');
  return res.json({
    ok: true,
    phone,
    delivery: viaWhatsApp ? 'whatsapp' : 'demo',
    mocked: !viaWhatsApp,
    demoOtp: viaWhatsApp ? undefined : code,
    existingRole: existing?.role || null,
  });
}

async function verifyOtp(req, res) {
  const phone = normalizePhone(req.body.phone);
  const { otp, role, name } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and code are required' });

  const rec = await OtpCode.findOne({ phone });
  if (!rec) return res.status(400).json({ error: 'The code has expired. Please request a new one.' });
  if (rec.attempts >= 5) return res.status(429).json({ error: 'Too many wrong attempts. Please request a new code.' });
  if (rec.code !== String(otp)) {
    rec.attempts += 1;
    await rec.save();
    return res.status(400).json({ error: 'That code is incorrect' });
  }
  await OtpCode.deleteMany({ phone });

  let user = await User.findOne({ phone });
  let isNew = false;
  if (!user) {
    const adminPhones = String(process.env.ADMIN_PHONES || '').split(',').map((p) => normalizePhone(p.trim())).filter(Boolean);
    if (adminPhones.includes(phone)) {
      user = await User.create({ phone, role: 'admin', name: (name || 'Admin').trim(), profileComplete: true });
      isNew = true;
    } else if (!['customer', 'worker'].includes(role)) return res.status(400).json({ error: 'Choose a role: customer or worker' });
    else {
      user = await User.create({ phone, role, name: (name || '').trim() });
      isNew = true;
    }
  }

  const token = signToken(user);
  res.cookie('rr_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 3600 * 1000,
  });
  return res.json({ token, isNew, user: serializeSelf(user) });
}

async function me(req, res) {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(401).json({ error: 'Account not found' });
  return res.json({ user: serializeSelf(user) });
}

function logout(req, res) {
  res.clearCookie('rr_token');
  return res.json({ ok: true });
}

async function updateMe(req, res) {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(401).json({ error: 'Account not found' });
  const { name, area } = req.body;
  if (typeof name === 'string') user.name = name.trim().slice(0, 60);
  if (typeof area === 'string') user.area = area.slice(0, 60);
  await user.save();
  return res.json({ user: serializeSelf(user) });
}

module.exports = { requestOtp, verifyOtp, me, logout, updateMe };

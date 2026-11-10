import { UR } from './ur';

// Two display modes: en (default) and ur (Urdu script). The whole site follows the selected one.
export const LANGS = ['en', 'ur'];

export const DICT = {
  'nav.find': { rm: 'Worker dhoondein', ur: 'کاریگر ڈھونڈیں', en: 'Find a worker' },
  'nav.how': { rm: 'Kaise kaam karta hai', ur: 'یہ کیسے کام کرتا ہے', en: 'How it works' },
  'nav.join': { rm: 'Worker banein', ur: 'کاریگر بنیں', en: 'Become a worker' },
  'nav.login': { rm: 'Login', ur: 'لاگ ان', en: 'Log in' },
  'nav.start': { rm: 'Shuru karein', ur: 'شروع کریں', en: 'Get started' },
  'nav.menu': { rm: 'Menu', ur: 'مینو', en: 'Menu' },
  'nav.logout': { rm: 'Logout', ur: 'لاگ آؤٹ', en: 'Log out' },
  'nav.profile': { rm: 'Profile', ur: 'پروفائل', en: 'Profile' },
  'nav.bookings': { rm: 'Meri bookings', ur: 'میری بکنگز', en: 'My bookings' },
  'nav.messages': { rm: 'Baat-cheet', ur: 'بات چیت', en: 'Messages' },

  'hero.line1': { rm: 'Har hunar ko', ur: 'ہر ہنر کو', en: 'Every skill gets' },
  'hero.line2': { rm: 'qareeb ka kaam.', ur: 'قریب کا کام۔', en: 'work nearby.' },
  'hero.sub': {
    rm: 'Ghar mein kuch kharab? Qareeb ka, abhi available, bharosemand electrician ya plumber — bol kar ya photo bhej kar dhoondein.',
    ur: 'گھر میں کچھ خراب؟ قریب کا، ابھی دستیاب، بھروسے مند الیکٹریشن یا پلمبر — بول کر یا تصویر بھیج کر ڈھونڈیں۔',
    en: 'Something broken at home? Find a nearby, available, trusted electrician or plumber by speaking or sending a photo.',
  },
  'search.q': { rm: 'Kya kharab hai? · What needs fixing?', ur: 'کیا خراب ہے؟', en: 'What needs fixing?' },
  'search.placeholder': { rm: 'Bolein, likhein ya photo lagayein...', ur: 'بولیں، لکھیں یا تصویر لگائیں...', en: 'Speak, type or attach a photo...' },
  'search.cta': { rm: 'Qareeb ke workers dhoondein', ur: 'قریب کے کاریگر ڈھونڈیں', en: 'Find workers nearby' },
  'search.change': { rm: 'Badlein', ur: 'بدلیں', en: 'Change' },
  'when.now': { rm: 'Abhi · Now', ur: 'ابھی', en: 'Now' },
  'when.tonight': { rm: 'Aaj shaam', ur: 'آج شام', en: 'This evening' },
  'when.tomorrow': { rm: 'Kal', ur: 'کل', en: 'Tomorrow' },
  'stats.line': { rm: '12,400+ hunarmand · 4.8★ average · Islamabad & Rawalpindi', ur: '۱۲٬۴۰۰+ ہنرمند · اوسط ۴.۸★ · اسلام آباد اور راولپنڈی', en: '12,400+ skilled workers · 4.8★ average · Islamabad & Rawalpindi' },
  'trades.title': { rm: 'Kaam chunein · Pick a trade', ur: 'کام چنیں', en: 'Pick a trade' },
  'trades.all': { rm: 'Sab dekhein', ur: 'سب دیکھیں', en: 'See all' },
  'how.title': { rm: 'Kaise kaam karta hai · How it works', ur: 'یہ کیسے کام کرتا ہے', en: 'How it works' },
  'how.1.t': { rm: 'Bolein ya photo', ur: 'بولیں یا تصویر', en: 'Speak or send a photo' },
  'how.1.d': { rm: 'Masla Urdu mein bolein — AI samajh leta hai.', ur: 'مسئلہ اردو میں بولیں — اے آئی سمجھ لیتا ہے۔', en: 'Describe the problem in Urdu. AI understands.' },
  'how.2.t': { rm: 'Qareeb ka worker', ur: 'قریب کا کاریگر', en: 'A nearby worker' },
  'how.2.d': { rm: 'Sirf woh jo abhi available aur qareeb hain.', ur: 'صرف وہ جو ابھی دستیاب اور قریب ہیں۔', en: 'Only those who are free and close.' },
  'how.3.t': { rm: 'Awaz se baat', ur: 'آواز سے بات', en: 'Talk by voice' },
  'how.3.d': { rm: 'Voice notes, transcript, qeemat pe agreement.', ur: 'وائس نوٹس، ٹرانسکرپٹ، قیمت پر اتفاق۔', en: 'Voice notes, transcripts and a price agreement.' },
  'how.4.t': { rm: 'Review', ur: 'ریویو', en: 'Review' },
  'how.4.d': { rm: 'Agla customer behtar faisla kare.', ur: 'اگلا گاہک بہتر فیصلہ کرے۔', en: 'So the next customer can decide better.' },
  'cta.title': { rm: 'Aap hunarmand hain?', ur: 'آپ ہنرمند ہیں؟', en: 'Are you a skilled worker?' },
  'cta.urdu': { rm: 'آپ ہنرمند ہیں؟ بول کر پروفائل بنائیں', ur: 'بول کر پروفائل بنائیں', en: 'Build your profile by speaking' },
  'cta.sub': { rm: 'Bina form, bina CV — 2 minute mein awaz se profile banayein.', ur: 'بغیر فارم، بغیر سی وی — دو منٹ میں آواز سے پروفائل بنائیں۔', en: 'No form, no CV. Build a profile by voice in 2 minutes.' },
  'cta.btn': { rm: 'Bol kar join karein', ur: 'بول کر شامل ہوں', en: 'Join by speaking' },
  'footer.note': { rm: '© 2026 Roshan Rozgar · Demo build — seeded data, payments mocked', ur: '© 2026 روشن روزگار · ڈیمو — فرضی ڈیٹا، ادائیگیاں نقلی', en: '© 2026 Roshan Rozgar · Demo build. Seeded data, payments mocked' },

  'status.available': { rm: 'Abhi available', ur: 'ابھی دستیاب', en: 'Available now' },
  'status.busy': { rm: 'Masroof · Busy', ur: 'مصروف', en: 'Busy' },
  'status.offline': { rm: 'Offline', ur: 'آف لائن', en: 'Offline' },
  'status.off_hours': { rm: 'Kaam ke waqt se bahar', ur: 'کام کے وقت سے باہر', en: 'Outside working hours' },
  'visit': { rm: '/visit', ur: '/وزٹ', en: '/visit' },
  'chat': { rm: 'Baat karein · Chat', ur: 'بات کریں', en: 'Chat' },
  'call': { rm: 'Call', ur: 'کال', en: 'Call' },

  'trade.electrician': { rm: 'Electrician', ur: 'الیکٹریشن', en: 'Electrician' },
  'trade.plumber': { rm: 'Plumber', ur: 'پلمبر', en: 'Plumber' },
  'trade.ac_technician': { rm: 'AC Technician', ur: 'اے سی ٹیکنیشن', en: 'AC Technician' },
  'trade.carpenter': { rm: 'Carpenter', ur: 'ترکھان', en: 'Carpenter' },
  'trade.mechanic': { rm: 'Mechanic', ur: 'مکینک', en: 'Mechanic' },
  'trade.painter': { rm: 'Painter', ur: 'پینٹر', en: 'Painter' },
  'trade.mason': { rm: 'Mason', ur: 'مستری', en: 'Mason' },
  'trade.welder': { rm: 'Welder', ur: 'ویلڈر', en: 'Welder' },
};

export function translate(lang, key, fallback) {
  const e = DICT[key];
  if (!e) return fallback ?? key;
  return e[lang] || e.en || fallback || key;
}

// tr('Hello {name}', { name: 'Ali' }): looks the English phrase up in the Urdu dictionary when lang === 'ur'.
export function tr(lang, text, vars) {
  let out = text;
  if (lang === 'ur' && UR[text]) out = UR[text];
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return out;
}

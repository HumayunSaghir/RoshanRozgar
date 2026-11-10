// AI layer.
//   1. If GEMINI_API_KEY is set: audio is transcribed and understood by Gemini (Urdu speech to text +
//      structured extraction in one call). Photos are interpreted with the same model.
//   2. Otherwise: the browser's own speech recognition supplies a transcript and a transparent
//      rule-based parser extracts the fields. Every result carries `source` ('gemini' or 'rules')
//      so the UI can say which one produced it. Nothing here is hard-coded demo output.
const { findArea, TRADES } = require('./geo');

const hasGemini = () => Boolean(process.env.GEMINI_API_KEY);

function aiStatus() {
  return { gemini: hasGemini(), model: hasGemini() ? process.env.GEMINI_MODEL || 'gemini-2.0-flash' : null };
}

// ---------------------------------------------------------------------------------------------
// Gemini REST helper
// ---------------------------------------------------------------------------------------------
async function callGemini(parts, schema) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 },
  };
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) {
      console.error('Gemini error', r.status, (await r.text()).slice(0, 300));
      return null;
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? JSON.parse(text) : null;
  } catch (err) {
    console.error('Gemini call failed:', err.message);
    return null;
  }
}

const audioPart = (audio) => ({ inlineData: { mimeType: audio.mime || 'audio/wav', data: audio.buffer.toString('base64') } });
const imagePart = (image) => ({ inlineData: { mimeType: image.mime || 'image/jpeg', data: image.buffer.toString('base64') } });

// ---------------------------------------------------------------------------------------------
// Text utilities (Urdu script and Roman Urdu)
// ---------------------------------------------------------------------------------------------
const EASTERN_DIGITS = { '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9, '۰': 0, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9 };

function normalize(text) {
  return String(text || '')
    .replace(/[٠-٩۰-۹]/g, (d) => String(EASTERN_DIGITS[d]))
    .replace(/[،؟۔]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NUM_WORDS = {
  ek: 1, ایک: 1, do: 2, دو: 2, teen: 3, تین: 3, char: 4, chaar: 4, چار: 4, panch: 5, paanch: 5, پانچ: 5,
  chhe: 6, che: 6, chay: 6, چھ: 6, saat: 7, سات: 7, aath: 8, آٹھ: 8, nau: 9, نو: 9, das: 10, دس: 10,
  gyarah: 11, گیارہ: 11, barah: 12, bara: 12, بارہ: 12, terah: 13, تیرہ: 13, chaudah: 14, چودہ: 14,
  pandrah: 15, پندرہ: 15, solah: 16, سولہ: 16, satrah: 17, ستارہ: 17, atharah: 18, اٹھارہ: 18, unnees: 19,
  انیس: 19, bees: 20, بیس: 20, pachees: 25, پچیس: 25, tees: 30, تیس: 30, chalees: 40, چالیس: 40,
  pachas: 50, pachaas: 50, پچاس: 50, dhai: 2.5, ڈھائی: 2.5, derh: 1.5, ڈیڑھ: 1.5,
};

const NUM_ALT = Object.keys(NUM_WORDS).join('|');

function toNumber(token) {
  if (token === undefined || token === null) return NaN;
  const t = String(token).trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  return NUM_WORDS[t] ?? NaN;
}

// "hazaar rupay", "paanch sau", "1200", "dhai hazaar" -> number
function parseAmount(raw) {
  const text = normalize(raw).toLowerCase();
  if (!text) return null;
  let m = text.match(new RegExp(`(\\d+(?:\\.\\d+)?|${NUM_ALT})\\s*(?:hazaar|hazar|ہزار)(?:\\s+(\\d+(?:\\.\\d+)?|${NUM_ALT})\\s*(?:sau|سو))?`));
  if (m) {
    const thousands = toNumber(m[1]);
    const hundreds = m[2] ? toNumber(m[2]) : 0;
    if (!Number.isNaN(thousands)) return Math.round(thousands * 1000 + (Number.isNaN(hundreds) ? 0 : hundreds * 100));
  }
  if (/(?:^|\s)(?:hazaar|hazar|ہزار)(?:\s|$)/.test(text)) return 1000;
  m = text.match(new RegExp(`(\\d+(?:\\.\\d+)?|${NUM_ALT})\\s*(?:sau|سو)`));
  if (m) {
    const n = toNumber(m[1]);
    if (!Number.isNaN(n)) return Math.round(n * 100);
  }
  const nums = [...text.matchAll(/\d[\d,]*/g)].map((x) => parseInt(x[0].replace(/,/g, ''), 10)).filter((n) => n >= 50);
  return nums.length ? Math.max(...nums) : null;
}

// ---------------------------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------------------------
const TRADE_KEYWORDS = {
  electrician: ['electrician', 'bijli', 'بجلی', 'الیکٹریشن', 'socket', 'سوکٹ', 'سوئچ', 'switch', 'wiring', 'taar', 'تار', 'ups', 'fan', 'پنکھا', 'short circuit', 'meter', 'light', 'bulb'],
  plumber: ['plumber', 'پلمبر', 'paani', 'pani', 'پانی', 'nal', 'نل', 'tapak', 'ٹپک', 'leak', 'leakage', 'pipe', 'پائپ', 'tanki', 'ٹینکی', 'sink', 'سنک', 'washroom', 'basin', 'naali', 'نالی', 'flush', 'tap'],
  ac_technician: ['ac technician', 'ac', 'اے سی', 'cooling', 'split', 'compressor', 'gas fill', 'thanda', 'ٹھنڈا', 'air conditioner'],
  carpenter: ['carpenter', 'barhai', 'بڑھئی', 'tarkhan', 'ترکھان', 'darwaza', 'دروازہ', 'door', 'almari', 'الماری', 'furniture', 'lakri', 'لکڑی', 'cupboard', 'wardrobe', 'bed', 'table'],
  mechanic: ['mechanic', 'مکینک', 'mistri', 'gaari', 'گاڑی', 'car', 'bike', 'موٹر سائیکل', 'motorcycle', 'engine', 'انجن', 'tyre', 'brake'],
  painter: ['painter', 'پینٹر', 'rang', 'رنگ', 'paint', 'deewar', 'دیوار', 'whitewash', 'polish'],
  mason: ['mason', 'مستری', 'raj mistri', 'rajmistri', 'tiles', 'tile', 'ٹائل', 'cement', 'سیمنٹ', 'chunai', 'چنائی', 'plaster', 'brick', 'اینٹ'],
  welder: ['welder', 'ویلڈر', 'welding', 'grill', 'گرل', 'lohar', 'لوہار', 'gate', 'گیٹ', 'iron', 'لوہا'],
};

const TRADE_LABEL = {
  electrician: 'Electrician',
  plumber: 'Plumber',
  ac_technician: 'AC Technician',
  carpenter: 'Carpenter',
  mechanic: 'Mechanic',
  painter: 'Painter',
  mason: 'Mason',
  welder: 'Welder',
};

const TRADE_PRICE = {
  electrician: [600, 1500],
  plumber: [800, 1500],
  ac_technician: [1500, 4000],
  carpenter: [1000, 3000],
  mechanic: [1000, 3500],
  painter: [1500, 5000],
  mason: [1500, 4000],
  welder: [1000, 3000],
};

const SKILL_KEYWORDS = {
  electrician: { wiring: ['wiring', 'taar', 'تار'], 'UPS fitting': ['ups'], 'Fan fitting': ['fan', 'پنکھا'], 'Switch board': ['switch', 'سوئچ', 'socket', 'سوکٹ'], Geyser: ['geyser', 'گیزر'] },
  plumber: { 'Leak repair': ['leak', 'tapak', 'ٹپک'], 'Pipe fitting': ['pipe', 'پائپ'], 'Tank cleaning': ['tank', 'tanki', 'ٹینکی'], 'Bathroom fitting': ['washroom', 'basin', 'commode'] },
  ac_technician: { 'AC installation': ['install'], 'Gas filling': ['gas'], 'AC service': ['service'] },
  carpenter: { 'Door fitting': ['door', 'darwaza', 'دروازہ'], Wardrobe: ['almari', 'الماری', 'wardrobe'], Furniture: ['furniture', 'table', 'bed'] },
  mechanic: { 'Engine work': ['engine', 'انجن'], 'Brake work': ['brake'], 'Bike repair': ['bike', 'motorcycle'] },
  painter: { 'Wall paint': ['paint', 'rang', 'رنگ', 'deewar'], Polish: ['polish'] },
  mason: { Tiles: ['tile', 'ٹائل'], Plaster: ['plaster'], Brickwork: ['brick', 'chunai'] },
  welder: { 'Gate and grill': ['gate', 'grill', 'گرل', 'گیٹ'], Welding: ['weld', 'ویلڈ'] },
};

function ruleTrade(text) {
  const t = normalize(text).toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const [trade, words] of Object.entries(TRADE_KEYWORDS)) {
    let score = 0;
    for (const w of words) {
      const re = /^[a-z0-9 ]+$/.test(w) ? new RegExp(`(^|[^a-z])${w}([^a-z]|$)`) : null;
      if (re ? re.test(t) : t.includes(w)) score += w.length > 3 ? 2 : 1;
    }
    if (score > bestScore) {
      best = trade;
      bestScore = score;
    }
  }
  return best;
}

function ruleSkills(trade, text) {
  const t = normalize(text).toLowerCase();
  const table = SKILL_KEYWORDS[trade] || {};
  return Object.entries(table)
    .filter(([, words]) => words.some((w) => t.includes(w)))
    .map(([name]) => name);
}

function ruleUrgency(text) {
  const t = normalize(text).toLowerCase();
  if (/(kal|کل)\b/.test(t) && !/(kal se|کل سے)/.test(t)) return 'tomorrow';
  if (/(shaam|sham|شام|raat|رات|evening|tonight)/.test(t)) return 'tonight';
  return 'now';
}

// Urdu spelling of sector letters and numbers -> "G-9"
function urduSectorToLatin(text) {
  const letters = { جی: 'g', ایف: 'f', ای: 'e', آئی: 'i', ایچ: 'h' };
  const digits = { سکس: 6, سیون: 7, ایٹ: 8, نائن: 9, ٹین: 10, الیون: 11, ٹویلو: 12, تھرٹین: 13 };
  let out = normalize(text);
  for (const [l, lat] of Object.entries(letters)) {
    for (const [w, n] of Object.entries(digits)) out = out.replace(new RegExp(`${l}\\s*${w}`, 'g'), `${lat}-${n}`);
    out = out.replace(new RegExp(`${l}\\s*(\\d{1,2})`, 'g'), `${lat}-$1`);
  }
  return out;
}

function capitalise(s) {
  return String(s || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------------------------
// Rule-based fallbacks
// ---------------------------------------------------------------------------------------------
function ruleProfile(transcript) {
  const t = normalize(transcript);
  const latin = urduSectorToLatin(t);
  const out = { transcriptUrdu: transcript, transcriptRoman: transcript, name: '', trade: null, experienceYears: null, area: '', rate: null, skills: [] };

  let m = latin.match(/(?:mera naam|my name is|naam)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(?:hai|he|h|and|aur)\b/i);
  if (m) out.name = capitalise(m[1]);
  if (!out.name) {
    m = t.match(/نام\s+([^\s]+(?:\s+[^\s]+)?)\s+(?:ہے|ھے|ہوں)/);
    if (m) out.name = m[1];
  }
  out.trade = ruleTrade(t);

  m = t.toLowerCase().match(new RegExp(`(\\d+(?:\\.\\d+)?|${NUM_ALT})\\s*(?:saal|sal|سال|year|years)`));
  if (m) {
    const n = toNumber(m[1]);
    if (!Number.isNaN(n)) out.experienceYears = Math.round(n);
  }

  const area = findArea(latin);
  if (area) out.area = `${area.name}, ${area.city}`;

  // rate: number near rupay/rs/visit/fee words
  const rateCtx = t.toLowerCase().match(/(?:rate|rs\.?|rupay|rupees|rupaye|روپے|ریٹ|فی|visit|وزٹ|charge|charges|لیتا|leta)[^\d]{0,12}(\d[\d,]*)|(\d[\d,]*)\s*(?:rs|rupay|rupees|rupaye|روپے)/);
  if (rateCtx) out.rate = parseInt((rateCtx[1] || rateCtx[2]).replace(/,/g, ''), 10);
  else {
    const amt = parseAmount(t.replace(new RegExp(`(\\d+|${NUM_ALT})\\s*(?:saal|sal|سال|year|years)`, 'g'), ''));
    if (amt && amt >= 200) out.rate = amt;
  }

  if (out.trade) out.skills = ruleSkills(out.trade, t);
  return out;
}

function ruleJob(transcript, imageHint) {
  const t = normalize(`${transcript || ''} ${imageHint || ''}`);
  const trade = ruleTrade(t);
  const urgency = ruleUrgency(t);
  const [lo, hi] = TRADE_PRICE[trade] || [800, 2000];
  const label = trade ? TRADE_LABEL[trade] : 'Worker';
  return {
    transcriptUrdu: transcript || '',
    transcriptRoman: transcript || '',
    trade,
    urgency,
    priceMin: lo,
    priceMax: hi,
    title: trade ? `${label} job` : 'Job',
    summary: (transcript || '').slice(0, 140),
  };
}

const TAG_KEYWORDS = {
  punctual: ['waqt', 'time par', 'time pe', 'on time', 'punctual', 'وقت', 'پابند', 'jaldi', 'جلدی'],
  clean: ['saaf', 'clean', 'safai', 'صاف', 'صفائی'],
  fair_price: ['munasib', 'rate', 'paise', 'price', 'sasta', 'مناسب', 'ریٹ', 'پیسے'],
  polite: ['polite', 'rawaiya', 'izzat', 'polite', 'اچھا رویہ', 'رویہ', 'عزت', 'akhlaq', 'اخلاق', 'respect'],
  late: ['late', 'der se', 'der', 'دیر'],
};

function ruleTags(transcript) {
  const t = normalize(transcript).toLowerCase();
  const tags = [];
  for (const [tag, words] of Object.entries(TAG_KEYWORDS)) {
    if (tag === 'late') {
      if (/(late|der se|دیر سے)/.test(t) && !/(nahi|نہیں|na |not)/.test(t)) tags.push('late');
      continue;
    }
    if (words.some((w) => t.includes(w))) tags.push(tag);
  }
  return tags;
}

// ---------------------------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------------------------
const STR = { type: 'STRING' };
const NUM = { type: 'NUMBER' };

async function extractWorkerProfile({ audio, transcript }) {
  if (hasGemini() && audio) {
    const prompt =
      'You listen to a Pakistani skilled trade worker introducing themselves, speaking Urdu or Roman Urdu. ' +
      'Transcribe the audio into Urdu script (transcriptUrdu) and Roman Urdu (transcriptRoman). Then extract: ' +
      'name, trade (one of: ' + TRADES.join(', ') + '), experienceYears (number), ' +
      'area (an Islamabad or Rawalpindi sector or locality such as "G-9, Islamabad"), rate (price per visit in PKR, number, 0 if not said), ' +
      'skills (short English skill names, max 6). Use empty string or 0 when something was not said. Never invent facts.';
    const schema = {
      type: 'OBJECT',
      properties: {
        transcriptUrdu: STR, transcriptRoman: STR, name: STR, trade: STR, experienceYears: NUM, area: STR, rate: NUM,
        skills: { type: 'ARRAY', items: STR },
      },
      required: ['transcriptUrdu', 'transcriptRoman', 'name', 'trade', 'experienceYears', 'area', 'rate', 'skills'],
    };
    const r = await callGemini([{ text: prompt }, audioPart(audio)], schema);
    if (r) {
      return {
        ...r,
        trade: TRADES.includes(r.trade) ? r.trade : ruleTrade(`${r.transcriptUrdu} ${r.transcriptRoman}`),
        experienceYears: r.experienceYears || null,
        rate: r.rate || null,
        skills: r.skills || [],
        source: 'gemini',
      };
    }
  }
  const base = ruleProfile(transcript || '');
  return { ...base, source: 'rules', hadTranscript: Boolean(transcript) };
}

async function parseJobRequest({ audio, transcript, text, image }) {
  const typed = text || transcript || '';
  if (hasGemini() && (audio || image || typed)) {
    const prompt =
      'A household in Islamabad/Rawalpindi describes something that needs fixing by voice (Urdu or Roman Urdu), text, and/or a photo. ' +
      'Return: transcriptUrdu (Urdu script transcript, empty if no audio), transcriptRoman (Roman Urdu), ' +
      'trade (one of: ' + TRADES.join(', ') + ', or empty if unclear), urgency (now, tonight or tomorrow), ' +
      'priceMin and priceMax (a realistic PKR visit estimate range for this kind of job in Pakistan), ' +
      'title (max 6 words, English), summary (one short English sentence describing the problem). ' +
      'If a photo is provided, use it to identify the problem. Never invent details.' +
      (typed ? `\nTyped description: ${typed}` : '');
    const schema = {
      type: 'OBJECT',
      properties: { transcriptUrdu: STR, transcriptRoman: STR, trade: STR, urgency: STR, priceMin: NUM, priceMax: NUM, title: STR, summary: STR },
      required: ['transcriptUrdu', 'transcriptRoman', 'trade', 'urgency', 'priceMin', 'priceMax', 'title', 'summary'],
    };
    const parts = [{ text: prompt }];
    if (audio) parts.push(audioPart(audio));
    if (image) parts.push(imagePart(image));
    const r = await callGemini(parts, schema);
    if (r) {
      const trade = TRADES.includes(r.trade) ? r.trade : ruleTrade(`${r.transcriptRoman} ${r.summary} ${typed}`);
      const [lo, hi] = TRADE_PRICE[trade] || [800, 2000];
      return {
        ...r,
        trade,
        urgency: ['now', 'tonight', 'tomorrow'].includes(r.urgency) ? r.urgency : ruleUrgency(r.transcriptRoman),
        priceMin: r.priceMin > 0 ? r.priceMin : lo,
        priceMax: r.priceMax > r.priceMin ? r.priceMax : hi,
        source: 'gemini',
      };
    }
  }
  return { ...ruleJob(typed, image ? 'photo' : ''), source: 'rules', hadTranscript: Boolean(typed) };
}

async function transcribeVoice({ audio, transcript }) {
  if (hasGemini() && audio) {
    const prompt =
      'Transcribe this short voice note (Urdu or Roman Urdu) between a customer and a tradesperson. ' +
      'Return transcriptUrdu (Urdu script) and transcriptRoman (Roman Urdu). If a price in PKR is mentioned return it as amount, otherwise 0.';
    const schema = {
      type: 'OBJECT',
      properties: { transcriptUrdu: STR, transcriptRoman: STR, amount: NUM },
      required: ['transcriptUrdu', 'transcriptRoman', 'amount'],
    };
    const r = await callGemini([{ text: prompt }, audioPart(audio)], schema);
    if (r) return { ...r, amount: r.amount || parseAmount(r.transcriptRoman) || null, source: 'gemini' };
  }
  const t = transcript || '';
  return { transcriptUrdu: t, transcriptRoman: t, amount: parseAmount(t), source: 'rules', hadTranscript: Boolean(t) };
}

async function tagReview({ audio, transcript }) {
  if (hasGemini() && audio) {
    const prompt =
      'Transcribe this spoken review (Urdu or Roman Urdu) of a tradesperson. Return transcriptUrdu, transcriptRoman, ' +
      'tags (subset of: punctual, clean, fair_price, polite, late; only those clearly stated), ' +
      'rating (1 to 5 inferred from tone, 0 if unclear).';
    const schema = {
      type: 'OBJECT',
      properties: { transcriptUrdu: STR, transcriptRoman: STR, tags: { type: 'ARRAY', items: STR }, rating: NUM },
      required: ['transcriptUrdu', 'transcriptRoman', 'tags', 'rating'],
    };
    const r = await callGemini([{ text: prompt }, audioPart(audio)], schema);
    if (r) {
      return { ...r, tags: (r.tags || []).filter((x) => Object.keys(TAG_KEYWORDS).includes(x)), rating: r.rating || null, source: 'gemini' };
    }
  }
  const t = transcript || '';
  return { transcriptUrdu: t, transcriptRoman: t, tags: ruleTags(t), rating: null, source: 'rules', hadTranscript: Boolean(t) };
}

const TAG_PHRASE = {
  punctual: 'punctual',
  clean: 'clean work',
  fair_price: 'fair prices',
  polite: 'polite',
};

async function summarizeReviews(worker, reviews) {
  const counts = {};
  const src = worker.reviewTagCounts;
  if (src && typeof src.forEach === 'function') src.forEach((v, k) => { counts[k] = v; });
  const lateCount = counts.late || 0;
  const top = Object.entries(counts)
    .filter(([k]) => TAG_PHRASE[k])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => TAG_PHRASE[k]);

  if (hasGemini() && reviews.length) {
    const prompt =
      'Summarise customer reviews of a Pakistani tradesperson in at most 2 short sentences of English so that the next customer can decide. ' +
      'Mention only what the reviews actually say, including any repeated complaint.\n' +
      reviews.map((r, i) => `${i + 1}. (${r.rating}/5) tags: ${(r.tags || []).join(',')} text: ${r.comment || r.transcriptUrdu || ''}`).join('\n');
    const r = await callGemini([{ text: prompt }], { type: 'OBJECT', properties: { summary: STR }, required: ['summary'] });
    if (r?.summary) return { text: r.summary, source: 'gemini' };
  }
  if (!top.length) return { text: '', source: 'rules' };
  let text = top.join(', ');
  text = text[0].toUpperCase() + text.slice(1) + '.';
  if (lateCount >= 2) text += ` ${lateCount} customers mentioned arriving a little late.`;
  return { text, source: 'rules' };
}

module.exports = {
  aiStatus,
  extractWorkerProfile,
  parseJobRequest,
  transcribeVoice,
  tagReview,
  summarizeReviews,
  parseAmount,
  TRADE_LABEL,
  TRADE_PRICE,
};

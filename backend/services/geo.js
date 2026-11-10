// Simulated area centroids for Islamabad and Rawalpindi (approximate, for the demo only).
const AREAS = [
  { name: 'G-6', city: 'Islamabad', lat: 33.7125, lng: 73.087 },
  { name: 'G-7', city: 'Islamabad', lat: 33.7138, lng: 73.068 },
  { name: 'G-8', city: 'Islamabad', lat: 33.71, lng: 73.048 },
  { name: 'G-9', city: 'Islamabad', lat: 33.7, lng: 73.034 },
  { name: 'G-10', city: 'Islamabad', lat: 33.687, lng: 73.016 },
  { name: 'G-11', city: 'Islamabad', lat: 33.6695, lng: 72.9985 },
  { name: 'G-13', city: 'Islamabad', lat: 33.65, lng: 72.97 },
  { name: 'F-6', city: 'Islamabad', lat: 33.728, lng: 73.078 },
  { name: 'F-7', city: 'Islamabad', lat: 33.732, lng: 73.056 },
  { name: 'F-8', city: 'Islamabad', lat: 33.72, lng: 73.04 },
  { name: 'F-10', city: 'Islamabad', lat: 33.705, lng: 73.015 },
  { name: 'F-11', city: 'Islamabad', lat: 33.692, lng: 72.995 },
  { name: 'E-11', city: 'Islamabad', lat: 33.704, lng: 72.983 },
  { name: 'I-8', city: 'Islamabad', lat: 33.665, lng: 73.075 },
  { name: 'I-10', city: 'Islamabad', lat: 33.65, lng: 73.035 },
  { name: 'Blue Area', city: 'Islamabad', lat: 33.709, lng: 73.056 },
  { name: 'Satellite Town', city: 'Rawalpindi', lat: 33.636, lng: 73.069 },
  { name: 'Saddar', city: 'Rawalpindi', lat: 33.595, lng: 73.056 },
  { name: 'Chaklala', city: 'Rawalpindi', lat: 33.614, lng: 73.098 },
  { name: 'Commercial Market', city: 'Rawalpindi', lat: 33.601, lng: 73.064 },
  { name: 'Bahria Phase 7', city: 'Rawalpindi', lat: 33.547, lng: 73.11 },
];

const TRADES = [
  'electrician',
  'plumber',
  'ac_technician',
  'carpenter',
  'mechanic',
  'painter',
  'mason',
  'welder',
];

function findArea(text) {
  if (!text) return null;
  const t = String(text).toLowerCase().replace(/[\s_]+/g, '-');
  // longest names first so "Bahria Phase 7" wins over shorter matches
  const sorted = [...AREAS].sort((a, b) => b.name.length - a.name.length);
  for (const a of sorted) {
    const key = a.name.toLowerCase().replace(/\s+/g, '-');
    if (t.includes(key)) return a;
  }
  // "g9", "g 9", "g-9/2"
  const m = String(text).toLowerCase().match(/\b([a-z])\s*-?\s*(\d{1,2})\b/);
  if (m) {
    const key = `${m[1]}-${m[2]}`;
    const a = AREAS.find((x) => x.name.toLowerCase() === key);
    if (a) return a;
  }
  return null;
}

// ---- time (Pakistan Standard Time is UTC+5, no DST) ----
const PKT_OFFSET_MIN = 5 * 60;

function toPkt(date) {
  return new Date(date.getTime() + PKT_OFFSET_MIN * 60000);
}

function fromPkt(y, m, d, hh, mm) {
  return new Date(Date.UTC(y, m, d, hh, mm) - PKT_OFFSET_MIN * 60000);
}

function whenToDate(when, now = new Date()) {
  if (!when || when === 'now') return new Date(now);
  const p = toPkt(now);
  if (when === 'tonight') {
    let t = fromPkt(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate(), 18, 0);
    if (t.getTime() < now.getTime() + 30 * 60000) t = new Date(now.getTime() + 60 * 60000);
    return t;
  }
  if (when === 'tomorrow') {
    return fromPkt(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate() + 1, 10, 0);
  }
  const d = new Date(when);
  return Number.isNaN(d.getTime()) ? new Date(now) : d;
}

function pktMinutes(date) {
  const p = toPkt(date);
  return p.getUTCHours() * 60 + p.getUTCMinutes();
}

function hhmmToMin(s) {
  const [h, m] = String(s || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function withinWorkingHours(worker, date) {
  const t = pktMinutes(date);
  return t >= hhmmToMin(worker.workingHours?.from || '08:00') && t < hhmmToMin(worker.workingHours?.to || '21:00');
}

function whenLabelText(label, date) {
  if (label === 'now') return 'Now';
  const p = toPkt(date);
  const h = p.getUTCHours();
  const hh = ((h + 11) % 12) + 1;
  const ap = h >= 12 ? 'PM' : 'AM';
  const time = `${hh}:${String(p.getUTCMinutes()).padStart(2, '0')} ${ap}`;
  if (label === 'tonight') return `Today ${time}`;
  if (label === 'tomorrow') return `Tomorrow ${time}`;
  return time;
}

function distanceKm(a, b) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

module.exports = {
  AREAS,
  TRADES,
  findArea,
  whenToDate,
  withinWorkingHours,
  whenLabelText,
  distanceKm,
  toPkt,
};

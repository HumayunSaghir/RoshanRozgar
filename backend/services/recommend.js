// AI worker recommendation: Gemini text embeddings (semantic match between a job and each worker's
// profile) blended with distance, rating, availability and price fit. Without a Gemini key the
// semantic part falls back to keyword overlap, so the feature still works offline.
const crypto = require('crypto');
const User = require('../models/User');
const { distanceKm } = require('./geo');
const { workerFreeAt } = require('./slots');

const EMBED_MODEL = () => process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const DIMS = 768;
const jobCache = new Map(); // jobId:hash -> vector (small, short lived)

const hasGemini = () => Boolean(process.env.GEMINI_API_KEY);

// Batch-embed texts with the Gemini REST API. Returns an array of vectors or null on failure.
async function embedBatch(texts, taskType) {
  if (!hasGemini() || !texts.length) return null;
  const model = EMBED_MODEL();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        requests: texts.map((t) => ({
          model: `models/${model}`,
          content: { parts: [{ text: t.slice(0, 2000) }] },
          taskType,
          outputDimensionality: DIMS,
        })),
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) {
      console.error('Gemini embed error', r.status, (await r.text()).slice(0, 200));
      return null;
    }
    const data = await r.json();
    const vectors = (data.embeddings || []).map((e) => e.values);
    return vectors.length === texts.length ? vectors : null;
  } catch (err) {
    console.error('Gemini embed failed:', err.message);
    return null;
  }
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'for', 'is', 'it', 'my', 'i', 'we', 'on', 'at', 'with', 'need', 'please', 'have', 'has', 'are', 'can', 'you', 'this', 'that', 'from', 'are', 'ka', 'ki', 'ke', 'hai', 'ko', 'se']);
const tokens = (text) => String(text || '').toLowerCase().split(/[^a-z0-9؀-ۿ]+/).filter((t) => t.length > 2 && !STOP.has(t));

function jobText(job) {
  return [job.trade, job.title, job.description, job.transcriptUrdu].filter(Boolean).join('. ');
}

function workerText(w) {
  return [
    `${w.trade} with ${w.experienceYears || 0} years of experience in ${w.area || 'Islamabad'}`,
    (w.skills || []).length ? `Skills: ${w.skills.join(', ')}` : '',
    w.bio,
    w.voiceTranscript,
    w.aiReviewSummary,
  ].filter(Boolean).join('. ');
}

const hashOf = (text) => crypto.createHash('sha1').update(`${EMBED_MODEL()}|${text}`).digest('hex');

// Make sure every candidate has an up-to-date stored embedding (only changed profiles are re-embedded).
async function ensureWorkerEmbeddings(workers) {
  const stale = workers.filter((w) => !w.embedding?.length || w.embeddingHash !== hashOf(workerText(w)));
  if (!stale.length) return true;
  const vectors = await embedBatch(stale.map(workerText), 'RETRIEVAL_DOCUMENT');
  if (!vectors) return false;
  await Promise.all(
    stale.map((w, i) => {
      w.embedding = vectors[i];
      w.embeddingHash = hashOf(workerText(w));
      return User.updateOne({ _id: w._id }, { $set: { embedding: vectors[i], embeddingHash: w.embeddingHash } });
    })
  );
  return true;
}

async function jobVector(job) {
  const text = jobText(job);
  const key = `${job._id}:${hashOf(text)}`;
  if (jobCache.has(key)) return jobCache.get(key);
  const v = await embedBatch([text], 'RETRIEVAL_QUERY');
  if (!v) return null;
  if (jobCache.size > 200) jobCache.clear();
  jobCache.set(key, v[0]);
  return v[0];
}

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

// Returns the best `limit` workers for a job, each with a 0-100 match score and plain-language reasons.
async function recommendWorkers(job, { limit = 3, exclude = [] } = {}) {
  const [lng, lat] = job.address?.location?.coordinates || [72.9985, 33.6695];
  const pool = await User.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceM',
        spherical: true,
        maxDistance: 35000,
        query: { role: 'worker', trade: job.trade, profileComplete: true, 'verification.status': 'approved' },
      },
    },
    { $limit: 40 },
    { $project: { phone: 0, reviewTagCounts: 0, 'verification.idUrl': 0, 'verification.selfieUrl': 0 } },
  ]);
  const skip = new Set(exclude.map(String));
  const candidates = pool.filter((w) => !skip.has(String(w._id)));
  if (!candidates.length) return { workers: [], method: 'none' };

  // Semantic similarity (Gemini embeddings) or keyword overlap fallback.
  let method = 'keywords';
  let semantic = candidates.map(() => 0);
  const embeddedOk = hasGemini() && (await ensureWorkerEmbeddings(candidates));
  const jv = embeddedOk ? await jobVector(job) : null;
  if (jv) {
    method = 'embeddings';
    semantic = candidates.map((w) => cosine(jv, w.embedding));
  } else {
    const jt = new Set(tokens(jobText(job)));
    semantic = candidates.map((w) => {
      const wt = new Set(tokens(workerText(w)));
      let hit = 0;
      jt.forEach((t) => wt.has(t) && (hit += 1));
      return jt.size ? hit / Math.sqrt(jt.size * Math.max(wt.size, 1)) : 0;
    });
  }
  // Normalise to 0..1 within the candidate pool so the ranking is relative, not absolute.
  const lo = Math.min(...semantic);
  const hi = Math.max(...semantic);
  const semNorm = semantic.map((s) => (hi - lo < 1e-6 ? 0.6 : 0.2 + 0.8 * ((s - lo) / (hi - lo))));

  const date = new Date(job.scheduledFor || Date.now());
  const scored = await Promise.all(
    candidates.map(async (w, i) => {
      const km = w.distanceM / 1000;
      const free = (await workerFreeAt(w, date)).free;
      const bayes = (w.rating * w.reviewCount + 4 * 3) / (w.reviewCount + 3) / 5;
      const priceFit = job.budget > 0 ? clamp(job.budget / Math.max(w.rate, 1)) : 0.7;
      const score = 0.4 * semNorm[i] + 0.2 * clamp(1 - km / 25) + 0.2 * bayes + 0.1 * (free ? 1 : 0) + 0.1 * priceFit;
      const reasons = [];
      const jt = new Set(tokens(jobText(job)));
      const matched = (w.skills || []).filter((s) => tokens(s).some((t) => jt.has(t)));
      if (matched.length) reasons.push({ t: 'Skills match: {list}', v: { list: matched.slice(0, 3).join(', ') } });
      else if (semNorm[i] >= 0.7) reasons.push({ t: 'Profile closely matches this job' });
      reasons.push({ t: '{n} km away', v: { n: Math.round(km * 10) / 10 } });
      if (w.reviewCount) reasons.push({ t: '{r} stars from {n} reviews', v: { r: Number(w.rating).toFixed(1), n: w.reviewCount } });
      if (w.experienceYears) reasons.push({ t: '{n} years of experience', v: { n: w.experienceYears } });
      reasons.push({ t: free ? 'Free at the requested time' : 'May be busy at that time' });
      if (job.budget > 0 && w.rate <= job.budget) reasons.push({ t: 'Rate fits your budget' });
      return { worker: w, score, km, free, reasons: reasons.slice(0, 4) };
    })
  );
  scored.sort((a, b) => b.score - a.score);
  return { workers: scored.slice(0, limit), method };
}

module.exports = { recommendWorkers, embedBatch, cosine, workerText };

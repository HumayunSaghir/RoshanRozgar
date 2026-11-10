const { persist, asAI } = require('../middlewares/upload');
const ai = require('../services/ai');

function files(req) {
  const audioFile = req.files?.audio?.[0] || null;
  const imageFiles = req.files?.image || [];
  return { audioFile, imageFiles };
}

// POST /api/ai/status
function status(req, res) {
  return res.json(ai.aiStatus());
}

// POST /api/ai/worker-profile   audio (+ transcript from the browser) -> profile fields
async function workerProfile(req, res) {
  const { audioFile, imageFiles } = files(req);
  const result = await ai.extractWorkerProfile({ audio: asAI(audioFile), transcript: req.body.transcript || '' });
  const audioUrl = await persist(audioFile, 'voice');
  const photoUrls = (await Promise.all(imageFiles.map((f) => persist(f, 'image')))).filter(Boolean);
  // Work photos refine the skills when Gemini is available; without it they are simply stored.
  return res.json({ ...result, audioUrl, photoUrls });
}

// POST /api/ai/job   voice / photo / text -> trade, urgency, price range
async function job(req, res) {
  const { audioFile, imageFiles } = files(req);
  const result = await ai.parseJobRequest({
    audio: asAI(audioFile),
    image: asAI(imageFiles[0]),
    transcript: req.body.transcript || '',
    text: req.body.text || '',
  });
  const audioUrl = await persist(audioFile, 'voice');
  const imageUrls = (await Promise.all(imageFiles.map((f) => persist(f, 'image')))).filter(Boolean);
  return res.json({ ...result, audioUrl, imageUrls });
}

// POST /api/ai/transcribe  voice note -> Urdu + Roman transcript (+ amount if a price was said)
async function transcribe(req, res) {
  const { audioFile } = files(req);
  const result = await ai.transcribeVoice({ audio: asAI(audioFile), transcript: req.body.transcript || '' });
  return res.json({ ...result, audioUrl: await persist(audioFile, 'voice') });
}

// POST /api/ai/review  spoken review -> transcript + tags
async function review(req, res) {
  const { audioFile } = files(req);
  const result = await ai.tagReview({ audio: asAI(audioFile), transcript: req.body.transcript || '' });
  return res.json({ ...result, audioUrl: await persist(audioFile, 'voice') });
}

module.exports = { status, workerProfile, job, transcribe, review };

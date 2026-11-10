const Job = require('../models/Job');
const Bid = require('../models/Bid');
const User = require('../models/User');
const { recommendWorkers } = require('../services/recommend');
const { notify } = require('../services/notify');
const { serializeWorker } = require('./serialize');

async function ownJob(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) { res.status(404).json({ error: 'Job not found' }); return null; }
  if (String(job.customer) !== String(req.user._id)) { res.status(403).json({ error: 'This is not your job' }); return null; }
  return job;
}

// GET /api/jobs/:id/recommendations  -> the best 3 workers for this job (customer only)
async function forJob(req, res) {
  const job = await ownJob(req, res);
  if (!job) return;
  const { workers, method } = await recommendWorkers(job, { limit: 3 });
  const ids = workers.map((x) => x.worker._id);
  const [bids] = await Promise.all([Bid.find({ job: job._id, worker: { $in: ids }, status: { $ne: 'withdrawn' } }).select('worker price')]);
  const bidBy = new Map(bids.map((b) => [String(b.worker), b.price]));
  const invited = new Set((job.invited || []).map(String));
  return res.json({
    method,
    recommendations: workers.map((x, i) => ({
      rank: i + 1,
      match: Math.round(x.score * 100),
      reasons: x.reasons,
      available: x.free,
      bidPrice: bidBy.get(String(x.worker._id)) || null,
      invited: invited.has(String(x.worker._id)),
      worker: serializeWorker(x.worker, { distanceKm: Math.round(x.km * 10) / 10 }),
    })),
  });
}

// POST /api/jobs/:id/invite  { workerId }  -> nudges a recommended worker to bid
async function invite(req, res) {
  const job = await ownJob(req, res);
  if (!job) return;
  if (job.status !== 'open') return res.status(409).json({ error: 'This job is no longer open' });
  const worker = await User.findOne({ _id: req.body.workerId, role: 'worker', trade: job.trade, 'verification.status': 'approved' });
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  if ((job.invited || []).some((w) => String(w) === String(worker._id))) return res.json({ ok: true, already: true });
  await Job.updateOne({ _id: job._id }, { $addToSet: { invited: worker._id } });
  await notify(worker._id, { type: 'job', title: 'You were invited to bid', body: `${req.user.name || 'A customer'} invited you to bid on "${job.title}"`, link: `/worker/find-jobs/${job._id}` });
  return res.json({ ok: true });
}

module.exports = { forJob, invite };

const User = require('../models/User');
const { persist } = require('../middlewares/upload');
const { notify, notifyMany } = require('../services/notify');
const { computeBadges } = require('../services/trust');
const { serializeSelf } = require('./serialize');

const initialsOf = (name) => String(name || 'W').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

// POST /api/worker/verification  (worker; multipart: idFront, selfie). First submission or resubmission after rejection.
async function submit(req, res) {
  const worker = await User.findById(req.user._id);
  if (!worker.profileComplete) return res.status(400).json({ error: 'Finish your profile before submitting documents' });
  const status = worker.verification?.status || 'none';
  if (status === 'pending') return res.status(409).json({ error: 'Your documents are already under review' });
  if (status === 'approved') return res.status(409).json({ error: 'Your documents are already approved' });

  const idFile = req.files?.idFront?.[0];
  const selfieFile = req.files?.selfie?.[0];
  if (!idFile || !selfieFile) return res.status(400).json({ error: 'Please upload both your ID card photo and a selfie' });
  const [idUrl, selfieUrl] = await Promise.all([persist(idFile, 'document'), persist(selfieFile, 'document')]);
  if (!idUrl || !selfieUrl) return res.status(400).json({ error: 'Please upload images in jpg, png or webp format' });

  worker.verification = {
    status: 'pending',
    idUrl,
    selfieUrl,
    submittedAt: new Date(),
    adminComment: '',
    attempts: (worker.verification?.attempts || 0) + 1,
  };
  await worker.save();

  await notify(worker._id, { type: 'verification', title: 'Documents under approval', body: 'We received your documents. An admin will review them shortly. You will be notified of the result.', link: '/worker/verification' });
  const admins = await User.find({ role: 'admin' }).select('_id');
  await notifyMany(admins.map((a) => a._id), { type: 'verification', title: 'New worker verification', body: `${worker.name || 'A worker'} submitted documents for review`, link: '/admin/dashboard' });
  return res.json({ user: serializeSelf(worker) });
}

// ---------------------------------------------------------------- admin
function serializeApplicant(u) {
  return {
    id: String(u._id),
    name: u.name,
    initials: initialsOf(u.name),
    phone: u.phone,
    trade: u.trade,
    area: u.area,
    city: u.city,
    experienceYears: u.experienceYears,
    skills: u.skills || [],
    rate: u.rate,
    status: u.verification?.status || 'none',
    idUrl: u.verification?.idUrl || '',
    selfieUrl: u.verification?.selfieUrl || '',
    submittedAt: u.verification?.submittedAt || null,
    reviewedAt: u.verification?.reviewedAt || null,
    adminComment: u.verification?.adminComment || '',
    attempts: u.verification?.attempts || 0,
  };
}

// GET /api/admin/workers?status=pending|approved|rejected
async function listWorkers(req, res) {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const [rows, counts] = await Promise.all([
    User.find({ role: 'worker', profileComplete: true, 'verification.status': status })
      .sort(status === 'pending' ? { 'verification.submittedAt': 1 } : { 'verification.reviewedAt': -1 })
      .limit(100),
    User.aggregate([
      { $match: { role: 'worker', profileComplete: true } },
      { $group: { _id: '$verification.status', n: { $sum: 1 } } },
    ]),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x._id || 'none', x.n]));
  return res.json({
    workers: rows.map(serializeApplicant),
    counts: { pending: c.pending || 0, approved: c.approved || 0, rejected: c.rejected || 0, none: c.none || 0 },
  });
}

async function loadPending(req, res) {
  const worker = await User.findOne({ _id: req.params.id, role: 'worker' });
  if (!worker) { res.status(404).json({ error: 'Worker not found' }); return null; }
  if (worker.verification?.status !== 'pending') { res.status(409).json({ error: 'This application is not waiting for review' }); return null; }
  return worker;
}

// POST /api/admin/workers/:id/approve
async function approve(req, res) {
  const worker = await loadPending(req, res);
  if (!worker) return;
  worker.verification.status = 'approved';
  worker.verification.reviewedAt = new Date();
  worker.verification.reviewedBy = req.user._id;
  worker.verification.adminComment = String(req.body.comment || '').trim().slice(0, 300);
  worker.badges = computeBadges(worker);
  await worker.save();
  await notify(worker._id, { type: 'verification', title: 'Documents approved', body: 'You are now verified. Customers can find you and you can bid on jobs.', link: '/worker/dashboard' });
  return res.json({ worker: serializeApplicant(worker) });
}

// POST /api/admin/workers/:id/reject  { comment }  (comment is required so the worker knows what to fix)
async function reject(req, res) {
  const comment = String(req.body.comment || '').trim().slice(0, 300);
  if (comment.length < 3) return res.status(400).json({ error: 'Please tell the worker why the documents were rejected' });
  const worker = await loadPending(req, res);
  if (!worker) return;
  worker.verification.status = 'rejected';
  worker.verification.reviewedAt = new Date();
  worker.verification.reviewedBy = req.user._id;
  worker.verification.adminComment = comment;
  worker.badges = computeBadges(worker);
  await worker.save();
  await notify(worker._id, { type: 'verification', title: 'Documents rejected', body: comment, link: '/worker/verification' });
  return res.json({ worker: serializeApplicant(worker) });
}

module.exports = { submit, listWorkers, approve, reject };

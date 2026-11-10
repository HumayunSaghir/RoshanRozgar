const Job = require('../models/Job');
const Bid = require('../models/Bid');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const User = require('../models/User');
const { nextBookingRef, nextJobRef } = require('../models/Counter');
const { whenToDate, findArea, distanceKm, TRADES } = require('../services/geo');
const { workerFreeAt } = require('../services/slots');
const { notify, notifyMany } = require('../services/notify');
const { initials, serializeWorker } = require('./serialize');

const isHostedUrl = (u) => /^https:\/\/res\.cloudinary\.com\//.test(String(u)) || String(u).startsWith('/uploads/');
const loc = (doc) => {
  const c = doc?.address?.location?.coordinates || [72.9985, 33.6695];
  return { lat: c[1], lng: c[0] };
};
const rs = (n) => `Rs ${Number(n).toLocaleString('en-US')}`;

function serializeJob(job, extra = {}) {
  const j = job.toObject ? job.toObject() : job;
  const l = loc(j);
  const customer = j.customer && j.customer.name !== undefined ? j.customer : null;
  return {
    id: String(j._id),
    ref: j.ref,
    trade: j.trade,
    title: j.title,
    description: j.description,
    transcriptUrdu: j.transcriptUrdu,
    audioUrl: j.audioUrl,
    imageUrls: j.imageUrls || [],
    budget: j.budget,
    whenLabel: j.whenLabel,
    scheduledFor: j.scheduledFor,
    address: { area: j.address?.area, text: j.address?.text, lat: l.lat, lng: l.lng },
    status: j.status,
    bidCount: j.bidCount,
    awardedBid: j.awardedBid ? String(j.awardedBid) : null,
    bookingId: j.booking ? String(j.booking) : null,
    expiresAt: j.expiresAt,
    createdAt: j.createdAt,
    customer: customer ? { id: String(customer._id), name: customer.name || 'Customer', initials: initials(customer.name || 'Customer') } : undefined,
    ...extra,
  };
}

function serializeBid(bid, extra = {}) {
  const b = bid.toObject ? bid.toObject() : bid;
  return { id: String(b._id), jobId: String(b.job?._id || b.job), price: b.price, message: b.message, status: b.status, createdAt: b.createdAt, updatedAt: b.updatedAt, ...extra };
}

// POST /api/jobs   (customer)
async function createJob(req, res) {
  const b = req.body || {};
  const trade = TRADES.includes(b.trade) ? b.trade : null;
  if (!trade) return res.status(400).json({ error: 'Please choose a trade' });
  const title = String(b.title || '').trim().slice(0, 100);
  if (title.length < 3) return res.status(400).json({ error: 'Please add a short title for the job' });

  const whenLabel = ['now', 'tonight', 'tomorrow'].includes(b.whenLabel) ? b.whenLabel : 'now';
  const area = findArea(b.address?.area) || findArea('G-11');
  const lat = Number.isFinite(Number(b.address?.lat)) ? Number(b.address.lat) : area.lat;
  const lng = Number.isFinite(Number(b.address?.lng)) ? Number(b.address.lng) : area.lng;
  const budget = Number(b.budget) > 0 ? Math.min(Math.round(Number(b.budget)), 1000000) : 0;

  const job = await Job.create({
    ref: await nextJobRef(),
    customer: req.user._id,
    trade,
    title,
    description: String(b.description || '').slice(0, 1200),
    transcriptUrdu: String(b.transcriptUrdu || '').slice(0, 1200),
    audioUrl: isHostedUrl(b.audioUrl) ? b.audioUrl : '',
    imageUrls: (b.imageUrls || []).filter(isHostedUrl).slice(0, 4),
    budget,
    whenLabel,
    scheduledFor: whenToDate(whenLabel),
    address: {
      area: area.name,
      text: String(b.address?.text || `${area.name}, ${area.city}`).slice(0, 160),
      location: { type: 'Point', coordinates: [lng, lat] },
    },
    expiresAt: new Date(Date.now() + (whenLabel === 'tomorrow' ? 48 : 24) * 3600 * 1000),
  });

  // Tell nearby workers of this trade.
  const nearby = await User.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceM',
        spherical: true,
        maxDistance: 20000,
        query: { role: 'worker', trade, profileComplete: true, 'verification.status': 'approved' },
      },
    },
    { $limit: 50 },
    { $project: { _id: 1 } },
  ]);
  await notifyMany(nearby.map((n) => n._id), { type: 'job', title: 'New job nearby', body: `${title} · ${area.name}`, link: `/worker/find-jobs/${job._id}` });

  return res.status(201).json({ job: serializeJob(job) });
}

// GET /api/jobs/mine   (customer)
async function myJobs(req, res) {
  const jobs = await Job.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const now = new Date();
  for (const j of jobs) {
    if (j.status === 'open' && j.expiresAt < now) {
      j.status = 'expired';
      await j.save();
    }
  }
  return res.json({ jobs: jobs.map((j) => serializeJob(j)) });
}

// GET /api/jobs/feed   (worker)  open jobs for the worker's trade, nearest first
async function feed(req, res) {
  const me = await User.findById(req.user._id);
  const mine = loc({ address: { location: me.location } });
  const jobs = await Job.find({ status: 'open', expiresAt: { $gt: new Date() }, trade: me.trade }).populate('customer', 'name').sort({ createdAt: -1 }).limit(60);
  const bids = await Bid.find({ worker: me._id, status: { $ne: 'withdrawn' }, job: { $in: jobs.map((j) => j._id) } });
  const byJob = new Map(bids.map((x) => [String(x.job), x]));
  const items = jobs
    .map((j) => {
      const km = Math.round(distanceKm(mine, loc(j)) * 10) / 10;
      const bid = byJob.get(String(j._id));
      return serializeJob(j, { distanceKm: km, myBid: bid ? serializeBid(bid) : null });
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
  return res.json({ jobs: items });
}

// GET /api/jobs/bids/mine   (worker) all my bids
async function myBids(req, res) {
  const bids = await Bid.find({ worker: req.user._id, status: { $ne: 'withdrawn' } })
    .populate({ path: 'job', populate: { path: 'customer', select: 'name' } })
    .sort({ updatedAt: -1 })
    .limit(60);
  return res.json({ bids: bids.filter((b) => b.job).map((b) => serializeBid(b, { job: serializeJob(b.job) })) });
}

// GET /api/jobs/:id
async function getJob(req, res) {
  const job = await Job.findById(req.params.id).populate('customer', 'name');
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const uid = String(req.user._id);

  if (req.user.role === 'customer') {
    if (String(job.customer._id) !== uid) return res.status(403).json({ error: 'This is not your job' });
    const bids = await Bid.find({ job: job._id, status: { $ne: 'withdrawn' } }).populate('worker').sort({ price: 1 });
    const l = loc(job);
    const out = bids.map((b) => {
      const w = b.worker;
      const wl = w.location?.coordinates || [72.9985, 33.6695];
      const km = Math.round(distanceKm({ lat: wl[1], lng: wl[0] }, l) * 10) / 10;
      return serializeBid(b, { worker: serializeWorker(w, { distanceKm: km }) });
    });
    return res.json({ job: serializeJob(job), bids: out, role: 'customer' });
  }

  const me = await User.findById(uid);
  const mine = loc({ address: { location: me.location } });
  const bid = await Bid.findOne({ job: job._id, worker: uid });
  const km = Math.round(distanceKm(mine, loc(job)) * 10) / 10;
  return res.json({
    job: serializeJob(job, { distanceKm: km }),
    myBid: bid && bid.status !== 'withdrawn' ? serializeBid(bid) : null,
    canBid: me.trade === job.trade && job.status === 'open' && me.verification?.status === 'approved',
    needsVerification: me.verification?.status !== 'approved',
    role: 'worker',
  });
}

// POST /api/jobs/:id/bids   (worker) { price, message }
async function placeBid(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'open' || job.expiresAt < new Date()) return res.status(409).json({ error: 'This job is no longer open for bids' });
  const me = await User.findById(req.user._id);
  if (me.verification?.status !== 'approved') return res.status(403).json({ error: 'Your documents must be approved before you can bid' });
  if (me.trade !== job.trade) return res.status(403).json({ error: 'This job is for a different trade' });
  const price = Math.round(Number(req.body.price));
  if (!Number.isFinite(price) || price < 50 || price > 1000000) return res.status(400).json({ error: 'Enter a valid price' });
  const message = String(req.body.message || '').trim().slice(0, 400);

  let bid = await Bid.findOne({ job: job._id, worker: me._id });
  const isNew = !bid || bid.status === 'withdrawn';
  if (bid) {
    bid.price = price;
    bid.message = message;
    bid.status = 'pending';
    await bid.save();
  } else {
    bid = await Bid.create({ job: job._id, worker: me._id, price, message });
  }
  if (isNew) await Job.updateOne({ _id: job._id }, { $inc: { bidCount: 1 } });
  await notify(job.customer, {
    type: 'bid',
    title: isNew ? 'New bid on your job' : 'A bid was updated',
    body: `${me.name} bid ${rs(price)} on "${job.title}"`,
    link: `/jobs/${job._id}`,
  });
  return res.status(isNew ? 201 : 200).json({ bid: serializeBid(bid) });
}

// DELETE /api/jobs/:id/bids/mine   (worker)
async function withdrawBid(req, res) {
  const bid = await Bid.findOne({ job: req.params.id, worker: req.user._id });
  if (!bid || bid.status !== 'pending') return res.status(404).json({ error: 'No active bid to withdraw' });
  bid.status = 'withdrawn';
  await bid.save();
  await Job.updateOne({ _id: bid.job }, { $inc: { bidCount: -1 } });
  return res.json({ ok: true });
}

// POST /api/jobs/:id/bids/:bidId/accept   (customer) - turns the winning bid into an agreed booking
async function acceptBid(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job || String(job.customer) !== String(req.user._id)) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'open') return res.status(409).json({ error: 'This job is no longer open' });
  const bid = await Bid.findOne({ _id: req.params.bidId, job: job._id, status: 'pending' });
  if (!bid) return res.status(404).json({ error: 'Bid not found' });
  const worker = await User.findById(bid.worker);
  const free = await workerFreeAt(worker, job.scheduledFor);
  if (!free.free) return res.status(409).json({ code: 'WORKER_BUSY', error: 'This worker is not free at that time. Choose another bid.' });

  // Claim the job atomically so two clicks cannot create two bookings.
  const claimed = await Job.findOneAndUpdate({ _id: job._id, status: 'open' }, { $set: { status: 'awarded', awardedBid: bid._id } }, { new: true });
  if (!claimed) return res.status(409).json({ error: 'This job is no longer open' });

  const booking = await Booking.create({
    ref: await nextBookingRef(),
    customer: job.customer,
    worker: worker._id,
    trade: job.trade,
    problem: { text: job.description || job.title, transcriptUrdu: job.transcriptUrdu, audioUrl: job.audioUrl, imageUrls: job.imageUrls },
    aiSummary: { title: job.title, summary: (job.description || '').slice(0, 300), urgency: job.whenLabel, priceMin: 0, priceMax: 0, source: 'rules' },
    whenLabel: job.whenLabel,
    scheduledFor: job.scheduledFor,
    address: job.address,
    offeredPrice: bid.price,
    price: bid.price,
    status: 'agreed',
  });
  await Message.create({ booking: booking._id, sender: worker._id, type: 'offer', offer: { amount: bid.price, whenLabel: job.whenLabel, status: 'agreed' } });
  if (bid.message) await Message.create({ booking: booking._id, sender: worker._id, type: 'text', text: bid.message });
  await Message.create({ booking: booking._id, type: 'system', text: 'You both agreed on the price' });

  bid.status = 'accepted';
  await bid.save();
  job.booking = booking._id;
  await job.save();
  const others = await Bid.find({ job: job._id, status: 'pending' });
  await Bid.updateMany({ job: job._id, status: 'pending' }, { $set: { status: 'rejected' } });

  await notify(worker._id, { type: 'bid', title: 'Your bid was accepted', body: `"${job.title}" · ${rs(bid.price)}. Waiting for the customer to confirm.`, link: `/messages?b=${booking._id}` });
  await notifyMany(others.map((o) => o.worker), { type: 'bid', title: 'Job awarded to another worker', body: `"${job.title}" was given to someone else.`, link: '/worker/find-jobs' });

  return res.status(201).json({ bookingId: String(booking._id) });
}

// POST /api/jobs/:id/cancel   (customer)
async function cancelJob(req, res) {
  const job = await Job.findById(req.params.id);
  if (!job || String(job.customer) !== String(req.user._id)) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'open') return res.status(400).json({ error: 'Only open jobs can be cancelled' });
  job.status = 'cancelled';
  await job.save();
  const pending = await Bid.find({ job: job._id, status: 'pending' });
  await Bid.updateMany({ job: job._id, status: 'pending' }, { $set: { status: 'rejected' } });
  await notifyMany(pending.map((p) => p.worker), { type: 'job', title: 'A job was cancelled', body: `"${job.title}" is no longer available.`, link: '/worker/find-jobs' });
  return res.json({ job: serializeJob(job) });
}

module.exports = { createJob, myJobs, feed, getJob, placeBid, withdrawBid, acceptBid, cancelJob, myBids };

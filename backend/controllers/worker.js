const User = require('../models/User');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const SlotLock = require('../models/SlotLock');
const { findArea, whenToDate, withinWorkingHours, TRADES, toPkt, AREAS } = require('../services/geo');
const { busyWorkerIds, workerFreeAt } = require('../services/slots');
const { computeBadges } = require('../services/trust');
const { persist } = require('../middlewares/upload');
const { serializeWorker, serializeBooking, serializeSelf, initials } = require('./serialize');

function resolveCenter(query) {
  const lat = parseFloat(query.lat);
  const lng = parseFloat(query.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  const a = findArea(query.area) || findArea('G-11');
  return { lat: a.lat, lng: a.lng };
}

function statusFor(worker, free) {
  if (free.free) return 'available';
  if (free.reason === 'busy') return 'busy';
  if (free.reason === 'off_hours') return 'off_hours';
  return 'offline';
}

// GET /api/workers  - nearby workers, with availability at the requested time
async function searchWorkers(req, res) {
  const { trade, when = 'now', maxKm, minRating, maxPrice, verified, sort = 'distance' } = req.query;
  const center = resolveCenter(req.query);
  const date = whenToDate(when);

  const match = { role: 'worker', profileComplete: true, 'verification.status': 'approved' };
  if (trade && TRADES.includes(trade)) match.trade = trade;
  if (minRating) match.rating = { $gte: Number(minRating) };
  if (maxPrice) match.rate = { $lte: Number(maxPrice) };
  if (verified === '1' || verified === 'true') match.phoneVerified = true;

  const maxM = (Number(maxKm) > 0 ? Number(maxKm) : 40) * 1000;
  const docs = await User.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [center.lng, center.lat] },
        distanceField: 'distanceM',
        spherical: true,
        maxDistance: maxM,
        query: match,
      },
    },
    { $limit: 80 },
    { $project: { phone: 0, reviewTagCounts: 0 } },
  ]);

  const busy = await busyWorkerIds(docs.map((d) => String(d._id)), date);
  const list = docs.map((d) => {
    const free = !d.isAvailable
      ? { free: false, reason: 'offline' }
      : !withinWorkingHours(d, date)
        ? { free: false, reason: 'off_hours' }
        : busy.has(String(d._id))
          ? { free: false, reason: 'busy' }
          : { free: true };
    const km = d.distanceM / 1000;
    return serializeWorker(d, {
      distanceKm: Math.round(km * 10) / 10,
      etaMin: Math.max(2, Math.round(km * 5)),
      available: free.free,
      status: statusFor(d, free),
    });
  });

  const cmp = {
    distance: (a, b) => a.distanceKm - b.distanceKm,
    rating: (a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm,
    price: (a, b) => a.rate - b.rate || a.distanceKm - b.distanceKm,
  }[sort] || ((a, b) => a.distanceKm - b.distanceKm);
  list.sort(cmp);

  return res.json({
    workers: list,
    total: list.length,
    availableCount: list.filter((w) => w.available).length,
    center,
    when,
    at: date,
  });
}

// GET /api/workers/:id  - public profile
async function getWorkerPublicProfile(req, res) {
  const worker = await User.findOne({ _id: req.params.id, role: 'worker' }).select('-phone');
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  const isOwner = req.user && (String(req.user._id) === String(worker._id) || req.user.role === 'admin');
  if (worker.verification?.status !== 'approved' && !isOwner) return res.status(404).json({ error: 'Worker not found' });

  const center = resolveCenter(req.query);
  const date = whenToDate(req.query.when || 'now');
  const free = await workerFreeAt(worker, date);
  const wLoc = worker.location.coordinates;
  const { distanceKm } = require('../services/geo');
  const km = distanceKm({ lat: wLoc[1], lng: wLoc[0] }, center);

  const reviews = await Review.find({ worker: worker._id }).sort({ createdAt: -1 }).limit(10).populate('customer', 'name area');
  return res.json({
    worker: serializeWorker(worker, {
      distanceKm: Math.round(km * 10) / 10,
      etaMin: Math.max(2, Math.round(km * 5)),
      available: free.free,
      status: statusFor(worker, free),
      workPhotos: worker.workPhotos,
    }),
    reviews: reviews.map((r) => ({
      id: String(r._id),
      rating: r.rating,
      tags: r.tags,
      comment: r.comment || r.transcriptUrdu,
      audioUrl: r.audioUrl,
      verifiedBooking: r.verifiedBooking,
      customerName: r.customer?.name || 'Customer',
      customerArea: r.customer?.area || '',
      createdAt: r.createdAt,
    })),
  });
}

// GET /api/worker/dashboard
async function getWorkerDashboard(req, res) {
  const worker = await User.findById(req.user._id);
  const now = new Date();
  const p = toPkt(now);
  const dayStart = new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate()) - 5 * 3600000);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600000);
  const weekStart = new Date(dayStart.getTime() - 6 * 24 * 3600000);

  const [requests, active, todayCount, weekDone] = await Promise.all([
    Booking.find({ worker: worker._id, status: { $in: ['requested', 'agreed'] } })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('customer', 'name phone area')
      .populate('worker', 'name location trade rating reviewCount area rate'),
    Booking.find({ worker: worker._id, status: { $in: ['confirmed', 'on_the_way'] } })
      .sort({ scheduledFor: 1 })
      .limit(10)
      .populate('customer', 'name phone area')
      .populate('worker', 'name location trade rating reviewCount area rate'),
    Booking.countDocuments({
      worker: worker._id,
      status: { $in: ['confirmed', 'on_the_way', 'completed'] },
      scheduledFor: { $gte: dayStart, $lt: dayEnd },
    }),
    Booking.find({ worker: worker._id, status: 'completed', completedAt: { $gte: weekStart } }).select('price'),
  ]);

  const free = await workerFreeAt(worker, now);
  return res.json({
    worker: serializeSelf(worker),
    status: statusFor(worker, free),
    stats: {
      today: todayCount,
      rating: worker.rating,
      reviewCount: worker.reviewCount,
      weekEarnings: weekDone.reduce((s, b) => s + (b.price || 0), 0),
    },
    requests: requests.map((b) => serializeBooking(b, worker._id)),
    schedule: active.map((b) => serializeBooking(b, worker._id)),
  });
}

// PUT /api/worker/profile  - fields extracted from the voice intro (or edited afterwards)
async function updateWorkerProfile(req, res) {
  const worker = await User.findById(req.user._id);
  const b = req.body || {};
  if (typeof b.name === 'string') worker.name = b.name.trim().slice(0, 60);
  if (TRADES.includes(b.trade)) worker.trade = b.trade;
  if (Array.isArray(b.skills)) worker.skills = b.skills.map((s) => String(s).slice(0, 40)).slice(0, 10);
  if (b.experienceYears !== undefined && b.experienceYears !== null && b.experienceYears !== '') {
    worker.experienceYears = Math.max(0, Math.min(60, Number(b.experienceYears) || 0));
  }
  if (b.rate !== undefined && b.rate !== null && b.rate !== '') worker.rate = Math.max(0, Math.min(100000, Number(b.rate) || 0));
  if (typeof b.bio === 'string') worker.bio = b.bio.slice(0, 400);
  if (typeof b.voiceTranscript === 'string') worker.voiceTranscript = b.voiceTranscript.slice(0, 1500);
  if (typeof b.voiceIntroUrl === 'string' && (b.voiceIntroUrl.startsWith('/uploads/') || b.voiceIntroUrl.startsWith('https://res.cloudinary.com/'))) worker.voiceIntroUrl = b.voiceIntroUrl;
  if (typeof b.area === 'string' && b.area) {
    const a = findArea(b.area);
    worker.area = a ? a.name : b.area.slice(0, 60);
    if (a) {
      worker.city = a.city;
      worker.location = { type: 'Point', coordinates: [a.lng, a.lat] };
    }
  }
  if (b.workingHours && /^\d{2}:\d{2}$/.test(b.workingHours.from) && /^\d{2}:\d{2}$/.test(b.workingHours.to)) {
    worker.workingHours = { from: b.workingHours.from, to: b.workingHours.to };
  }
  worker.profileComplete = Boolean(worker.name && worker.trade && worker.area && worker.rate > 0);
  worker.badges = computeBadges(worker);
  await worker.save();
  return res.json({ user: serializeSelf(worker) });
}

// PUT /api/worker/availability  { isAvailable }
async function updateAvailability(req, res) {
  const worker = await User.findById(req.user._id);
  worker.isAvailable = Boolean(req.body.isAvailable);
  await worker.save();
  const free = await workerFreeAt(worker, new Date());
  return res.json({ isAvailable: worker.isAvailable, status: statusFor(worker, free) });
}

// POST /api/worker/photos  (multipart, field "image")
async function addPhotos(req, res) {
  const worker = await User.findById(req.user._id);
  const files = req.files?.image || [];
  const urls = (await Promise.all(files.map((f) => persist(f, 'image')))).filter(Boolean);
  if (!urls.length) return res.status(400).json({ error: 'Please upload images in jpg or png format' });
  worker.workPhotos = [...worker.workPhotos, ...urls].slice(-12);
  await worker.save();
  return res.json({ workPhotos: worker.workPhotos });
}

function listAreas(req, res) {
  return res.json({ areas: AREAS });
}

module.exports = {
  searchWorkers,
  getWorkerPublicProfile,
  getWorkerDashboard,
  updateWorkerProfile,
  updateAvailability,
  addPhotos,
  listAreas,
  initials,
  SlotLock,
};

const Booking = require('../models/Booking');
const Message = require('../models/Message');
const User = require('../models/User');
const { nextBookingRef } = require('../models/Counter');
const { whenToDate, findArea, distanceKm, TRADES } = require('../services/geo');
const { acquireSlots, releaseSlots, workerFreeAt, busyWorkerIds } = require('../services/slots');
const { computeBadges } = require('../services/trust');
const { transcribeVoice, parseAmount } = require('../services/ai');
const { persist, asAI } = require('../middlewares/upload');
const { serializeBooking, serializeMessage, serializeWorker } = require('./serialize');
const { notify } = require('../services/notify');

const isHostedUrl = (u) => String(u).startsWith('https://res.cloudinary.com/') || String(u).startsWith('/uploads/');
// Tell the other person in a booking that something happened.
const notifyOther = (booking, byId, payload) => {
  const other = String(booking.worker._id) === String(byId) ? booking.customer._id : booking.worker._id;
  return notify(other, { link: `/messages?b=${booking._id}`, ...payload });
};

const WORKER_FIELDS = 'name avatarUrl phone location trade rating reviewCount area rate isAvailable';
const CUSTOMER_FIELDS = 'name avatarUrl phone area';

function populate(q) {
  return q.populate('worker', WORKER_FIELDS).populate('customer', CUSTOMER_FIELDS);
}

async function loadForUser(req, res) {
  const booking = await populate(Booking.findById(req.params.id));
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return null;
  }
  const uid = String(req.user._id);
  if (String(booking.worker._id) !== uid && String(booking.customer._id) !== uid) {
    res.status(403).json({ error: 'This is not your booking' });
    return null;
  }
  return booking;
}

const side = (booking, uid) => (String(booking.worker._id) === String(uid) ? 'worker' : 'customer');

async function sys(bookingId, text) {
  return Message.create({ booking: bookingId, type: 'system', text });
}

function roundTo100(n) {
  return Math.max(100, Math.round(n / 100) * 100);
}

// POST /api/bookings  (customer) - open a request with a worker
async function createBooking(req, res) {
  const b = req.body || {};
  const worker = await User.findOne({ _id: b.workerId, role: 'worker', profileComplete: true, 'verification.status': 'approved' });
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const whenLabel = ['now', 'tonight', 'tomorrow'].includes(b.whenLabel) ? b.whenLabel : 'now';
  const scheduledFor = whenToDate(whenLabel);

  // Reuse an open request between the same two people instead of creating duplicates.
  const open = await populate(
    Booking.findOne({ customer: req.user._id, worker: worker._id, status: { $in: ['requested', 'agreed'] } })
  );
  if (open) return res.json({ booking: serializeBooking(open, req.user._id), reused: true });

  const free = await workerFreeAt(worker, scheduledFor);
  if (!free.free) {
    return res.status(409).json({ code: 'WORKER_BUSY', error: 'This worker is not free at that time', reason: free.reason });
  }

  const area = findArea(b.address?.area) || findArea('G-11');
  const lat = Number.isFinite(Number(b.address?.lat)) ? Number(b.address.lat) : area.lat;
  const lng = Number.isFinite(Number(b.address?.lng)) ? Number(b.address.lng) : area.lng;
  const ai = b.aiSummary || {};
  const problem = b.problem || {};
  const mid = ai.priceMin && ai.priceMax ? (Number(ai.priceMin) + Number(ai.priceMax)) / 2 : worker.rate;
  const offeredPrice = Number(b.offeredPrice) > 0 ? Math.round(Number(b.offeredPrice)) : roundTo100(mid || worker.rate || 1000);

  const booking = await Booking.create({
    ref: await nextBookingRef(),
    customer: req.user._id,
    worker: worker._id,
    trade: TRADES.includes(b.trade) ? b.trade : worker.trade,
    problem: {
      text: String(problem.text || '').slice(0, 600),
      transcriptUrdu: String(problem.transcriptUrdu || '').slice(0, 1200),
      transcriptRoman: String(problem.transcriptRoman || '').slice(0, 1200),
      audioUrl: isHostedUrl(problem.audioUrl) ? problem.audioUrl : '',
      imageUrls: (problem.imageUrls || []).filter(isHostedUrl).slice(0, 3),
    },
    aiSummary: {
      title: String(ai.title || '').slice(0, 80),
      summary: String(ai.summary || '').slice(0, 300),
      urgency: ['now', 'tonight', 'tomorrow'].includes(ai.urgency) ? ai.urgency : whenLabel,
      priceMin: Number(ai.priceMin) || 0,
      priceMax: Number(ai.priceMax) || 0,
      source: ai.source === 'gemini' ? 'gemini' : 'rules',
    },
    whenLabel,
    scheduledFor,
    address: {
      area: area.name,
      text: String(b.address?.text || `${area.name}, ${area.city}`).slice(0, 160),
      location: { type: 'Point', coordinates: [lng, lat] },
    },
    offeredPrice,
  });

  if (isHostedUrl(problem.audioUrl)) {
    await Message.create({
      booking: booking._id,
      sender: req.user._id,
      type: 'voice',
      audioUrl: problem.audioUrl,
      transcriptUrdu: problem.transcriptUrdu || '',
      transcriptRoman: problem.transcriptRoman || '',
      transcriptSource: ai.source === 'gemini' ? 'gemini' : 'rules',
      duration: Number(problem.duration) || 0,
    });
  } else if (problem.text || problem.transcriptRoman) {
    await Message.create({ booking: booking._id, sender: req.user._id, type: 'text', text: problem.text || problem.transcriptRoman });
  }
  await Message.create({
    booking: booking._id,
    sender: req.user._id,
    type: 'offer',
    offer: { amount: offeredPrice, whenLabel: booking.whenLabel, status: 'pending' },
  });

  const full = await populate(Booking.findById(booking._id));
  await notify(worker._id, { type: 'booking', title: 'New job request', body: `${full.customer.name || 'A customer'} · ${full.aiSummary.title || full.address.area}`, link: `/messages?b=${booking._id}` });
  return res.status(201).json({ booking: serializeBooking(full, req.user._id) });
}

// GET /api/bookings/mine
async function myBookings(req, res) {
  const key = req.user.role === 'worker' ? 'worker' : 'customer';
  const list = await populate(Booking.find({ [key]: req.user._id }).sort({ updatedAt: -1 }).limit(50));
  const ids = list.map((b) => b._id);
  const lasts = await Message.aggregate([
    { $match: { booking: { $in: ids } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$booking', msg: { $first: '$$ROOT' } } },
  ]);
  const byId = new Map(lasts.map((l) => [String(l._id), l.msg]));
  return res.json({
    bookings: list.map((b) => ({
      ...serializeBooking(b, req.user._id),
      lastMessage: byId.get(String(b._id)) ? serializeMessage(byId.get(String(b._id))) : null,
    })),
  });
}

// GET /api/bookings/:id
async function getBooking(req, res) {
  const booking = await loadForUser(req, res);
  if (!booking) return;
  return res.json({ booking: serializeBooking(booking, req.user._id), side: side(booking, req.user._id) });
}

// GET /api/bookings/:id/messages
async function getMessages(req, res) {
  const booking = await loadForUser(req, res);
  if (!booking) return;
  const messages = await Message.find({ booking: booking._id }).sort({ createdAt: 1 }).limit(300);
  return res.json({
    messages: messages.map(serializeMessage),
    booking: serializeBooking(booking, req.user._id),
    side: side(booking, req.user._id),
  });
}

const CLOSED = ['completed', 'cancelled', 'declined'];

// POST /api/bookings/:id/messages   text or voice (multipart audio + transcript)
async function sendMessage(req, res) {
  const booking = await loadForUser(req, res);
  if (!booking) return;
  if (CLOSED.includes(booking.status) && booking.status !== 'completed') {
    return res.status(400).json({ error: 'This booking is closed' });
  }
  const audioFile = req.files?.audio?.[0];
  if (audioFile) {
    const t = await transcribeVoice({ audio: asAI(audioFile), transcript: req.body.transcript || '' });
    const msg = await Message.create({
      booking: booking._id,
      sender: req.user._id,
      type: 'voice',
      audioUrl: (await persist(audioFile, 'voice')) || '',
      duration: Number(req.body.duration) || 0,
      transcriptUrdu: t.transcriptUrdu,
      transcriptRoman: t.transcriptRoman,
      transcriptSource: t.source,
    });
    await notifyOther(booking, req.user._id, { type: 'message', title: 'New voice message', body: t.transcriptRoman || '' });
    return res.status(201).json({ message: serializeMessage(msg), amount: t.amount || null });
  }
  const text = String(req.body.text || '').trim().slice(0, 500);
  if (!text) return res.status(400).json({ error: 'The message is empty' });
  const msg = await Message.create({ booking: booking._id, sender: req.user._id, type: 'text', text });
  await notifyOther(booking, req.user._id, { type: 'message', title: 'New message', body: text });
  return res.status(201).json({ message: serializeMessage(msg) });
}

// POST /api/bookings/:id/offers   { amount } or voice (multipart audio + transcript)
async function makeOffer(req, res) {
  const booking = await loadForUser(req, res);
  if (!booking) return;
  if (!['requested', 'agreed'].includes(booking.status)) {
    return res.status(400).json({ error: 'The price can no longer be changed' });
  }
  let amount = Number(req.body.amount);
  const audioFile = req.files?.audio?.[0];
  let heard = null;
  if (audioFile) {
    heard = await transcribeVoice({ audio: asAI(audioFile), transcript: req.body.transcript || '' });
    amount = heard.amount || parseAmount(heard.transcriptRoman || '') || NaN;
    await Message.create({
      booking: booking._id,
      sender: req.user._id,
      type: 'voice',
      audioUrl: (await persist(audioFile, 'voice')) || '',
      duration: Number(req.body.duration) || 0,
      transcriptUrdu: heard.transcriptUrdu,
      transcriptRoman: heard.transcriptRoman,
      transcriptSource: heard.source,
    });
  }
  if (!Number.isFinite(amount) || amount < 50 || amount > 1000000) {
    return res.status(422).json({ code: 'AMOUNT_NOT_HEARD', error: 'We could not understand the price. Say it again or use +/-.', transcript: heard?.transcriptRoman || '' });
  }
  amount = Math.round(amount);

  await Message.updateMany({ booking: booking._id, type: 'offer', 'offer.status': 'pending' }, { $set: { 'offer.status': 'countered' } });
  if (booking.status === 'agreed') {
    booking.status = 'requested';
    booking.price = 0;
    await booking.save();
  }
  const msg = await Message.create({
    booking: booking._id,
    sender: req.user._id,
    type: 'offer',
    offer: { amount, whenLabel: booking.whenLabel, status: 'pending' },
  });
  await notifyOther(booking, req.user._id, { type: 'offer', title: 'New price offer', body: `Rs ${amount.toLocaleString('en-US')}` });
  return res.status(201).json({ message: serializeMessage(msg), booking: serializeBooking(booking, req.user._id) });
}

// POST /api/bookings/:id/offers/:messageId/agree  - the other side accepts the offer
async function agreeOffer(req, res) {
  const booking = await loadForUser(req, res);
  if (!booking) return;
  const msg = await Message.findOne({ _id: req.params.messageId, booking: booking._id, type: 'offer' });
  if (!msg) return res.status(404).json({ error: 'Offer not found' });
  if (String(msg.sender) === String(req.user._id)) return res.status(400).json({ error: 'You cannot accept your own offer' });
  if (msg.offer.status !== 'pending' || booking.status !== 'requested') {
    return res.status(409).json({ error: 'This offer is no longer available' });
  }
  msg.offer.status = 'agreed';
  await msg.save();
  booking.price = msg.offer.amount;
  booking.status = 'agreed';
  await booking.save();
  await sys(booking._id, 'You both agreed on the price');
  await notifyOther(booking, req.user._id, { type: 'offer', title: 'Price agreed', body: `Rs ${msg.offer.amount.toLocaleString('en-US')}` });
  return res.json({ booking: serializeBooking(booking, req.user._id) });
}

// POST /api/bookings/:id/confirm  (customer) - the atomic step that marks the worker Busy
async function confirmBooking(req, res) {
  const booking = await loadForUser(req, res);
  if (!booking) return;
  if (side(booking, req.user._id) !== 'customer') return res.status(403).json({ error: 'Only the customer can confirm the booking' });
  if (booking.status === 'confirmed') return res.json({ booking: serializeBooking(booking, req.user._id) });
  if (booking.status !== 'agreed') return res.status(400).json({ error: 'Both sides must agree on the price first' });

  const worker = await User.findById(booking.worker._id);
  const alternatives = async () => {
    const near = await User.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: booking.address.location.coordinates },
          distanceField: 'distanceM',
          spherical: true,
          maxDistance: 15000,
          query: { role: 'worker', trade: booking.trade, profileComplete: true, _id: { $ne: worker._id }, isAvailable: true },
        },
      },
      { $limit: 12 },
      { $project: { phone: 0, reviewTagCounts: 0 } },
    ]);
      const busy = await busyWorkerIds(near.map((n) => String(n._id)), booking.scheduledFor);
      return near
        .filter((n) => !busy.has(String(n._id)))
        .slice(0, 2)
        .map((n) => serializeWorker(n, { distanceKm: Math.round((n.distanceM / 1000) * 10) / 10, available: true, status: 'available' }));
  };

  if (!worker.isAvailable) {
    return res.status(409).json({ code: 'SLOT_TAKEN', error: 'This worker is no longer available', alternatives: await alternatives() });
  }
  try {
    await acquireSlots(worker._id, booking._id, booking.scheduledFor);
  } catch (err) {
    if (err.code === 'SLOT_TAKEN') {
      return res.status(409).json({ code: 'SLOT_TAKEN', error: 'This worker was just booked', alternatives: await alternatives() });
    }
    throw err;
  }
  booking.status = 'confirmed';
  booking.confirmedAt = new Date();
  await booking.save();
  await sys(booking._id, `${booking.worker.name} is now Busy for other customers`);
  await notify(booking.worker._id, { type: 'booking', title: 'Booking confirmed', body: `#${booking.ref} · ${booking.address.area}`, link: '/worker/dashboard' });
  return res.json({ booking: serializeBooking(booking, req.user._id) });
}

// POST /api/bookings/:id/status  (worker)  { status: 'on_the_way' | 'completed' }
async function updateStatus(req, res) {
  const booking = await loadForUser(req, res);
  if (!booking) return;
  if (side(booking, req.user._id) !== 'worker') return res.status(403).json({ error: 'Only the worker can change the status' });
  const next = req.body.status;
  if (next === 'on_the_way' && booking.status === 'confirmed') {
    booking.status = 'on_the_way';
    await booking.save();
    await sys(booking._id, 'The worker is on the way');
    await notifyOther(booking, req.user._id, { type: 'booking', title: 'Your worker is on the way', link: `/bookings/${booking._id}` });
  } else if (next === 'completed' && ['confirmed', 'on_the_way'].includes(booking.status)) {
    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();
    await releaseSlots(booking._id);
    const worker = await User.findById(booking.worker._id);
    worker.jobsDone += 1;
    worker.badges = computeBadges(worker);
    await worker.save();
    await sys(booking._id, 'Job completed. The worker is free again.');
    await notifyOther(booking, req.user._id, { type: 'booking', title: 'Job completed', body: 'Please leave a review', link: `/bookings/${booking._id}` });
  } else {
    return res.status(400).json({ error: 'The status cannot be changed right now' });
  }
  return res.json({ booking: serializeBooking(booking, req.user._id) });
}

// POST /api/bookings/:id/decline  (worker)
async function declineBooking(req, res) {
  const booking = await loadForUser(req, res);
  if (!booking) return;
  if (side(booking, req.user._id) !== 'worker') return res.status(403).json({ error: 'Only the worker can decline' });
  if (!['requested', 'agreed'].includes(booking.status)) return res.status(400).json({ error: 'This request can no longer be declined' });
  booking.status = 'declined';
  await booking.save();
  await sys(booking._id, 'The worker declined the request');
  await notifyOther(booking, req.user._id, { type: 'booking', title: 'Request declined', body: `#${booking.ref}` });
  return res.json({ booking: serializeBooking(booking, req.user._id) });
}

// POST /api/bookings/:id/cancel  (customer)
async function cancelBooking(req, res) {
  const booking = await loadForUser(req, res);
  if (!booking) return;
  if (side(booking, req.user._id) !== 'customer') return res.status(403).json({ error: 'Only the customer can cancel here' });
  if (!['requested', 'agreed', 'confirmed'].includes(booking.status)) return res.status(400).json({ error: 'This booking can no longer be cancelled' });
  booking.status = 'cancelled';
  await booking.save();
  await releaseSlots(booking._id);
  await sys(booking._id, 'Booking cancelled. The worker is free again.');
  await notifyOther(booking, req.user._id, { type: 'booking', title: 'Booking cancelled', body: `#${booking.ref}` });
  return res.json({ booking: serializeBooking(booking, req.user._id) });
}

module.exports = {
  createBooking,
  myBookings,
  getBooking,
  getMessages,
  sendMessage,
  makeOffer,
  agreeOffer,
  confirmBooking,
  updateStatus,
  declineBooking,
  cancelBooking,
  distanceKm,
};

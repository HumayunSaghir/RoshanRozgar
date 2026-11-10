const Review = require('../models/Review');
const Booking = require('../models/Booking');
const { applyReview } = require('../services/trust');
const { persist } = require('../middlewares/upload');
const { notify } = require('../services/notify');
const User = require('../models/User');

const ALLOWED_TAGS = ['punctual', 'clean', 'fair_price', 'polite', 'late'];

// POST /api/reviews  (customer, only for their own completed booking)
async function postReview(req, res) {
  const { bookingId, rating, tags = [], comment = '', transcriptUrdu = '', audioUrl = '' } = req.body;
  const booking = await Booking.findById(bookingId);
  if (!booking || String(booking.customer) !== String(req.user._id)) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'completed') return res.status(400).json({ error: 'Reviews can only be left after the job is completed' });
  if (booking.reviewed) return res.status(409).json({ error: 'This booking has already been reviewed' });
  const stars = Math.round(Number(rating));
  if (!(stars >= 1 && stars <= 5)) return res.status(400).json({ error: 'Choose between 1 and 5 stars' });

  const review = await Review.create({
    booking: booking._id,
    customer: req.user._id,
    worker: booking.worker,
    rating: stars,
    tags: [...new Set((Array.isArray(tags) ? tags : []).filter((t) => ALLOWED_TAGS.includes(t)))],
    comment: String(comment).slice(0, 500),
    transcriptUrdu: String(transcriptUrdu).slice(0, 800),
    audioUrl: (String(audioUrl).startsWith('https://res.cloudinary.com/') || String(audioUrl).startsWith('/uploads/')) ? audioUrl : '',
    verifiedBooking: true,
  });
  booking.reviewed = true;
  await booking.save();
  const worker = await applyReview(review);
  await notify(booking.worker, { type: 'review', title: 'New review received', body: `${req.user.name || 'A customer'} gave you ${stars} star${stars > 1 ? 's' : ''}${review.comment ? ': ' + review.comment : ''}`, link: '/worker/reviews' });
  return res.status(201).json({
    review: { id: String(review._id), rating: review.rating, tags: review.tags },
    worker: worker && { rating: worker.rating, reviewCount: worker.reviewCount, aiReviewSummary: worker.aiReviewSummary },
  });
}

// GET /api/reviews/mine  (worker) - reviews received
async function myReviews(req, res) {
  const list = await Review.find({ worker: req.user._id }).sort({ createdAt: -1 }).limit(50).populate('customer', 'name area');
  const w = await User.findById(req.user._id).select('rating reviewCount jobsDone aiReviewSummary');
  return res.json({
    stats: { rating: w?.rating || 0, reviewCount: w?.reviewCount || 0, jobsDone: w?.jobsDone || 0, aiReviewSummary: w?.aiReviewSummary || '' },
    reviews: list.map((r) => ({
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

module.exports = { postReview, myReviews, persist };

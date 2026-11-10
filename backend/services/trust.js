const User = require('../models/User');
const Review = require('../models/Review');
const { summarizeReviews } = require('./ai');

const TAGS = {
  punctual: { label: 'On time', badge: 'Punctual' },
  clean: { label: 'Clean work' },
  fair_price: { label: 'Fair price' },
  polite: { label: 'Polite' },
  late: { label: 'Arrived late' },
};

function computeBadges(worker) {
  const badges = ['Phone verified'];
  if (worker.verification?.status === 'approved') badges.push('ID verified');
  if (worker.jobsDone > 0) badges.push(`${worker.jobsDone} jobs done`);
  if (worker.rating >= 4.8 && worker.reviewCount >= 10) badges.push('Top rated');
  const punctual = Number(worker.reviewTagCounts?.get?.('punctual') || 0);
  if (worker.reviewCount >= 5 && punctual / Math.max(worker.reviewCount, 1) >= 0.3) badges.push('Punctual');
  return badges;
}

// Called after a new review. Rating and counts are updated incrementally so seeded totals survive.
async function applyReview(review) {
  const worker = await User.findById(review.worker);
  if (!worker) return null;
  const total = worker.rating * worker.reviewCount + review.rating;
  worker.reviewCount += 1;
  worker.rating = Math.round((total / worker.reviewCount) * 10) / 10;
  for (const t of review.tags) {
    worker.reviewTagCounts.set(t, Number(worker.reviewTagCounts.get(t) || 0) + 1);
  }
  worker.badges = computeBadges(worker);
  const recent = await Review.find({ worker: worker._id }).sort({ createdAt: -1 }).limit(20);
  const { text } = await summarizeReviews(worker, recent);
  worker.aiReviewSummary = text;
  await worker.save();
  return worker;
}

module.exports = { applyReview, computeBadges, TAGS };

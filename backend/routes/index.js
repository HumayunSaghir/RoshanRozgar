const express = require('express');
const { checkAuth, optionalAuth, checkRole, rateLimit } = require('../middlewares/auth');
const { upload, fieldsAudioImage, fieldsDocs } = require('../middlewares/upload');
const auth = require('../controllers/auth');
const worker = require('../controllers/worker');
const ai = require('../controllers/ai');
const booking = require('../controllers/booking');
const review = require('../controllers/review');
const job = require('../controllers/job');
const notification = require('../controllers/notification');
const verification = require('../controllers/verification');
const recommend = require('../controllers/recommend');

const router = express.Router();

// ---- auth (phone + OTP, no passwords) ----
router.post('/auth/request-otp', rateLimit({ max: 10 }), auth.requestOtp);
router.post('/auth/verify-otp', rateLimit({ max: 20 }), auth.verifyOtp);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', checkAuth, auth.me);
router.put('/auth/me', checkAuth, auth.updateMe);

// ---- discovery ----
router.get('/areas', worker.listAreas);
router.get('/workers', optionalAuth, worker.searchWorkers);
router.get('/workers/:id', optionalAuth, worker.getWorkerPublicProfile);

// ---- worker self-service ----
router.get('/worker/dashboard', checkAuth, checkRole('worker'), worker.getWorkerDashboard);
router.put('/worker/profile', checkAuth, checkRole('worker'), worker.updateWorkerProfile);
router.put('/worker/availability', checkAuth, checkRole('worker'), worker.updateAvailability);
router.post('/worker/photos', checkAuth, checkRole('worker'), upload.fields([{ name: 'image', maxCount: 6 }]), worker.addPhotos);

router.post('/worker/verification', checkAuth, checkRole('worker'), rateLimit({ max: 10 }), fieldsDocs, verification.submit);

// ---- admin ----
router.get('/admin/workers', checkAuth, checkRole('admin'), verification.listWorkers);
router.post('/admin/workers/:id/approve', checkAuth, checkRole('admin'), verification.approve);
router.post('/admin/workers/:id/reject', checkAuth, checkRole('admin'), verification.reject);

// ---- AI ----
router.get('/ai/status', ai.status);
router.post('/ai/job', rateLimit({ max: 15 }), fieldsAudioImage, ai.job); // public: customers search before logging in
router.post('/ai/worker-profile', checkAuth, checkRole('worker'), fieldsAudioImage, ai.workerProfile);
router.post('/ai/transcribe', checkAuth, fieldsAudioImage, ai.transcribe);
router.post('/ai/review', checkAuth, checkRole('customer'), fieldsAudioImage, ai.review);

// ---- bookings + chat ----
router.post('/bookings', checkAuth, checkRole('customer'), booking.createBooking);
router.get('/bookings/mine', checkAuth, booking.myBookings);
router.get('/bookings/:id', checkAuth, booking.getBooking);
router.get('/bookings/:id/messages', checkAuth, booking.getMessages);
router.post('/bookings/:id/messages', checkAuth, fieldsAudioImage, booking.sendMessage);
router.post('/bookings/:id/offers', checkAuth, fieldsAudioImage, booking.makeOffer);
router.post('/bookings/:id/offers/:messageId/agree', checkAuth, booking.agreeOffer);
router.post('/bookings/:id/confirm', checkAuth, checkRole('customer'), booking.confirmBooking);
router.post('/bookings/:id/status', checkAuth, checkRole('worker'), booking.updateStatus);
router.post('/bookings/:id/decline', checkAuth, checkRole('worker'), booking.declineBooking);
router.post('/bookings/:id/cancel', checkAuth, checkRole('customer'), booking.cancelBooking);

// ---- job posts + bids ----
router.post('/jobs', checkAuth, checkRole('customer'), job.createJob);
router.get('/jobs/mine', checkAuth, checkRole('customer'), job.myJobs);
router.get('/jobs/feed', checkAuth, checkRole('worker'), job.feed);
router.get('/jobs/bids/mine', checkAuth, checkRole('worker'), job.myBids);
router.get('/jobs/:id', checkAuth, job.getJob);
router.post('/jobs/:id/bids', checkAuth, checkRole('worker'), job.placeBid);
router.delete('/jobs/:id/bids/mine', checkAuth, checkRole('worker'), job.withdrawBid);
router.post('/jobs/:id/bids/:bidId/accept', checkAuth, checkRole('customer'), job.acceptBid);
router.get('/jobs/:id/recommendations', checkAuth, checkRole('customer'), recommend.forJob);
router.post('/jobs/:id/invite', checkAuth, checkRole('customer'), recommend.invite);
router.post('/jobs/:id/cancel', checkAuth, checkRole('customer'), job.cancelJob);

// ---- notifications ----
router.get('/notifications', checkAuth, notification.list);
router.post('/notifications/read', checkAuth, notification.markRead);

// ---- reviews ----
router.post('/reviews', checkAuth, checkRole('customer'), review.postReview);
router.get('/reviews/mine', checkAuth, checkRole('worker'), review.myReviews);

module.exports = router;

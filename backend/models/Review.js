const { Schema, model, Types } = require('mongoose');

const reviewSchema = new Schema(
  {
    booking: { type: Types.ObjectId, ref: 'Booking', required: true, unique: true },
    customer: { type: Types.ObjectId, ref: 'User', required: true },
    worker: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    tags: [{ type: String }],
    comment: { type: String, default: '' },
    transcriptUrdu: { type: String, default: '' },
    audioUrl: { type: String, default: '' },
    verifiedBooking: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model('Review', reviewSchema);

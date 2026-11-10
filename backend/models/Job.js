const { Schema, model, Types } = require('mongoose');

// A job posted by a customer. Workers of the matching trade can bid on it with a price.
const jobSchema = new Schema(
  {
    ref: { type: String, unique: true },
    customer: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    trade: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 1200 },
    transcriptUrdu: { type: String, default: '' },
    audioUrl: { type: String, default: '' },
    imageUrls: [{ type: String }],
    budget: { type: Number, default: 0 }, // optional customer budget in PKR (0 = open)
    whenLabel: { type: String, enum: ['now', 'tonight', 'tomorrow'], default: 'now' },
    scheduledFor: { type: Date, required: true },
    address: {
      area: { type: String, default: '' },
      text: { type: String, default: '' },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [72.9985, 33.6695] },
      },
    },
    status: { type: String, enum: ['open', 'awarded', 'cancelled', 'expired'], default: 'open', index: true },
    bidCount: { type: Number, default: 0 },
    awardedBid: { type: Types.ObjectId, ref: 'Bid' },
    booking: { type: Types.ObjectId, ref: 'Booking' },
    invited: [{ type: Types.ObjectId, ref: 'User' }],
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = model('Job', jobSchema);

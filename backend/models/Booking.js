const { Schema, model, Types } = require('mongoose');

const bookingSchema = new Schema(
  {
    ref: { type: String, unique: true },
    customer: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    worker: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    trade: { type: String, required: true },
    problem: {
      text: { type: String, default: '' },
      transcriptUrdu: { type: String, default: '' },
      transcriptRoman: { type: String, default: '' },
      audioUrl: { type: String, default: '' },
      imageUrls: [{ type: String }],
    },
    aiSummary: {
      title: { type: String, default: '' },
      summary: { type: String, default: '' },
      urgency: { type: String, default: 'now' },
      priceMin: { type: Number, default: 0 },
      priceMax: { type: Number, default: 0 },
      source: { type: String, default: 'rules' }, // 'gemini' or 'rules'
    },
    whenLabel: { type: String, enum: ['now', 'tonight', 'tomorrow', 'custom'], default: 'now' },
    scheduledFor: { type: Date, required: true },
    address: {
      area: { type: String, default: '' },
      text: { type: String, default: '' },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [72.9985, 33.6695] },
      },
    },
    offeredPrice: { type: Number, default: 0 }, // customer's first offer
    price: { type: Number, default: 0 }, // price both sides agreed on
    status: {
      type: String,
      enum: ['requested', 'agreed', 'confirmed', 'on_the_way', 'completed', 'cancelled', 'declined'],
      default: 'requested',
      index: true,
    },
    confirmedAt: Date,
    completedAt: Date,
    reviewed: { type: Boolean, default: false },
    seeded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model('Booking', bookingSchema);

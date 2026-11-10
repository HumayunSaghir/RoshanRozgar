const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, required: true, unique: true },
    role: { type: String, enum: ['customer', 'worker', 'admin'], required: true },
    city: { type: String, default: 'Islamabad' },
    area: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [72.9985, 33.6695] }, // [lng, lat]
    },

    // ---- worker fields ----
    trade: { type: String, default: '' },
    skills: [{ type: String }],
    experienceYears: { type: Number, default: 0 },
    rate: { type: Number, default: 0 }, // Rs per visit
    bio: { type: String, default: '' },
    voiceTranscript: { type: String, default: '' },
    voiceIntroUrl: { type: String, default: '' },
    workPhotos: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
    workingHours: {
      from: { type: String, default: '08:00' },
      to: { type: String, default: '21:00' },
    },
    profileComplete: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: true },

    // ---- identity verification (manual review by an admin) ----
    verification: {
      status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
      idUrl: { type: String, default: '' },
      selfieUrl: { type: String, default: '' },
      submittedAt: Date,
      reviewedAt: Date,
      reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      adminComment: { type: String, default: '' },
      attempts: { type: Number, default: 0 },
    },

    // ---- AI matching (Gemini embedding of the profile text, computed lazily) ----
    embedding: { type: [Number], select: false, default: undefined },
    embeddingHash: { type: String, select: false, default: '' },

    // ---- trust ----
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    jobsDone: { type: Number, default: 0 },
    badges: [{ type: String }],
    reviewTagCounts: { type: Map, of: Number, default: {} },
    aiReviewSummary: { type: String, default: '' },
    seeded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, trade: 1 });
userSchema.index({ role: 1, 'verification.status': 1 });

module.exports = model('User', userSchema);

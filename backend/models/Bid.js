const { Schema, model, Types } = require('mongoose');

const bidSchema = new Schema(
  {
    job: { type: Types.ObjectId, ref: 'Job', required: true, index: true },
    worker: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    price: { type: Number, required: true, min: 50 },
    message: { type: String, default: '', maxlength: 400 },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'withdrawn'], default: 'pending' },
  },
  { timestamps: true }
);
bidSchema.index({ job: 1, worker: 1 }, { unique: true }); // one live bid per worker per job

module.exports = model('Bid', bidSchema);

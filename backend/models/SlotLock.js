const { Schema, model, Types } = require('mongoose');

// One document per (worker, hour). The unique _id makes double booking impossible:
// a second insert for the same worker-hour fails with a duplicate key error.
const slotLockSchema = new Schema({
  _id: { type: String },
  worker: { type: Types.ObjectId, ref: 'User', index: true },
  booking: { type: Types.ObjectId, ref: 'Booking', index: true },
  expireAt: { type: Date, index: { expires: 0 } },
});

module.exports = model('SlotLock', slotLockSchema);

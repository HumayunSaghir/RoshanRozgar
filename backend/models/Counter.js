const { Schema, model } = require('mongoose');

const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 2047 } });
const Counter = model('Counter', counterSchema);

async function nextBookingRef() {
  const c = await Counter.findOneAndUpdate({ _id: 'booking' }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `RR-${c.seq}`;
}

async function nextJobRef() {
  const c = await Counter.findOneAndUpdate({ _id: 'job' }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `JOB-${c.seq}`;
}

module.exports = { Counter, nextBookingRef, nextJobRef };

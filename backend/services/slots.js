const SlotLock = require('../models/SlotLock');
const { withinWorkingHours } = require('./geo');

const JOB_HOURS = 2; // a booking blocks the worker for 2 hour-buckets

function hourBucket(date) {
  return new Date(date).toISOString().slice(0, 13); // e.g. 2026-11-10T09
}

function bucketsFor(date) {
  const start = new Date(date);
  start.setUTCMinutes(0, 0, 0);
  const out = [];
  for (let i = 0; i < JOB_HOURS; i += 1) out.push(hourBucket(new Date(start.getTime() + i * 3600000)));
  return out;
}

function lockId(workerId, bucket) {
  return `${workerId}:${bucket}`;
}

// Atomically reserve a worker for a booking. Throws code 'SLOT_TAKEN' if any hour is taken.
async function acquireSlots(workerId, bookingId, date) {
  const buckets = bucketsFor(date);
  const expireAt = new Date(new Date(date).getTime() + (JOB_HOURS + 1) * 3600000);
  const created = [];
  try {
    for (const b of buckets) {
      await SlotLock.create({ _id: lockId(workerId, b), worker: workerId, booking: bookingId, expireAt });
      created.push(lockId(workerId, b));
    }
  } catch (err) {
    if (created.length) await SlotLock.deleteMany({ _id: { $in: created } });
    if (err && err.code === 11000) {
      const e = new Error('Worker is no longer free for this time');
      e.code = 'SLOT_TAKEN';
      throw e;
    }
    throw err;
  }
}

async function releaseSlots(bookingId) {
  await SlotLock.deleteMany({ booking: bookingId });
}

// Which of these workers are busy at `date`? Returns a Set of worker id strings.
async function busyWorkerIds(workerIds, date) {
  if (!workerIds.length) return new Set();
  const buckets = bucketsFor(date);
  const ids = [];
  for (const w of workerIds) for (const b of buckets) ids.push(lockId(w, b));
  const locks = await SlotLock.find({ _id: { $in: ids } }).select('worker');
  return new Set(locks.map((l) => String(l.worker)));
}

// Is this worker free for a new booking at `date`?
async function workerFreeAt(worker, date) {
  if (!worker.isAvailable) return { free: false, reason: 'offline' };
  if (!withinWorkingHours(worker, date)) return { free: false, reason: 'off_hours' };
  const busy = await busyWorkerIds([String(worker._id)], date);
  if (busy.has(String(worker._id))) return { free: false, reason: 'busy' };
  return { free: true };
}

module.exports = { acquireSlots, releaseSlots, busyWorkerIds, workerFreeAt };

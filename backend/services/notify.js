const Notification = require('../models/Notification');

// Fire-and-forget: a failed notification must never break the main action.
async function notify(userId, { type = 'info', title, body = '', link = '' }) {
  if (!userId || !title) return null;
  try {
    return await Notification.create({ user: userId, type, title, body: String(body).slice(0, 200), link });
  } catch (err) {
    console.error('notify failed:', err.message);
    return null;
  }
}

async function notifyMany(userIds, payload) {
  await Promise.all(userIds.map((id) => notify(id, payload)));
}

module.exports = { notify, notifyMany };

const Notification = require('../models/Notification');

const ser = (n) => ({ id: String(n._id), type: n.type, title: n.title, body: n.body, link: n.link, read: n.read, createdAt: n.createdAt });

// GET /api/notifications
async function list(req, res) {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  return res.json({ notifications: items.map(ser), unread });
}

// POST /api/notifications/read   { id } or {} (all)
async function markRead(req, res) {
  const filter = { user: req.user._id, read: false };
  if (req.body?.id) filter._id = req.body.id;
  await Notification.updateMany(filter, { $set: { read: true } });
  const unread = await Notification.countDocuments({ user: req.user._id, read: false });
  return res.json({ ok: true, unread });
}

module.exports = { list, markRead };

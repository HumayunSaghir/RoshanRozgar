const { verifyToken } = require('../services/auth');

function readToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.rr_token || null;
}

function checkAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Please log in first' });
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Session expired, please log in again' });
  req.user = user;
  return next();
}

function optionalAuth(req, res, next) {
  const token = readToken(req);
  const user = token ? verifyToken(token) : null;
  if (user) req.user = user;
  return next();
}

function checkRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'This action is not available for your account type' });
    }
    return next();
  };
}

// Tiny in-memory rate limiter (per IP) for public AI endpoints.
function rateLimit({ windowMs = 60000, max = 12 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip || 'anon';
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: 'Too many requests, please wait a moment' });
    arr.push(now);
    hits.set(key, arr);
    return next();
  };
}

module.exports = { checkAuth, optionalAuth, checkRole, rateLimit };

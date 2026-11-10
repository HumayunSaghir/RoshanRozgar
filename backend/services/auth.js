const jwt = require('jsonwebtoken');

const SECRET = () => process.env.JWT_SECRET || 'roshanrozgar-dev-secret';

function signToken(user) {
  return jwt.sign({ _id: String(user._id), role: user.role }, SECRET(), { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET());
  } catch {
    return null;
  }
}

function normalizePhone(input) {
  let d = String(input || '').replace(/[^\d]/g, '');
  if (d.startsWith('0092')) d = d.slice(4);
  else if (d.startsWith('92')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  if (!/^3\d{9}$/.test(d)) return null;
  return `0${d}`;
}

module.exports = { signToken, verifyToken, normalizePhone };

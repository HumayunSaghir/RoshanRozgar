const { Schema, model } = require('mongoose');

const otpSchema = new Schema({
  phone: { type: String, required: true, index: true },
  code: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

module.exports = model('OtpCode', otpSchema);

const { Schema, model, Types } = require('mongoose');

const messageSchema = new Schema(
  {
    booking: { type: Types.ObjectId, ref: 'Booking', required: true, index: true },
    sender: { type: Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['text', 'voice', 'offer', 'system'], default: 'text' },
    text: { type: String, default: '' },
    audioUrl: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    transcriptUrdu: { type: String, default: '' },
    transcriptRoman: { type: String, default: '' },
    transcriptSource: { type: String, default: '' },
    offer: {
      amount: Number,
      whenLabel: String,
      status: { type: String, enum: ['pending', 'agreed', 'countered'], default: 'pending' },
    },
  },
  { timestamps: true }
);

module.exports = model('Message', messageSchema);

const mongoose = require('mongoose');

// FR7: Real-time chat messages, scoped to an Accepted SwapRequest ("room")
const messageSchema = new mongoose.Schema(
  {
    swapRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'SwapRequest', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 1000 },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

messageSchema.index({ swapRequest: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);

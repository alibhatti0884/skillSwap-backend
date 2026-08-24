const mongoose = require('mongoose');

// FR6: Swap Request State System (Pending -> Accepted / Rejected)
const swapRequestSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // The specific skills this swap is about (denormalized for viva clarity)
    offeredSkill: { type: String, required: true },
    requestedSkill: { type: String, required: true },

    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Completed'],
      default: 'Pending'
    },

    message: { type: String, default: '', maxlength: 300 }
  },
  { timestamps: true }
);

swapRequestSchema.index({ sender: 1, receiver: 1, status: 1 });

module.exports = mongoose.model('SwapRequest', swapRequestSchema);

const express = require('express');
const Message = require('../models/Message');
const SwapRequest = require('../models/SwapRequest');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route  GET /api/messages/:swapId
// @desc   FR7: Fetch chat history for an Accepted swap request (used to hydrate the chat window on load)
router.get('/:swapId', protect, async (req, res) => {
  try {
    const swap = await SwapRequest.findById(req.params.swapId);
    if (!swap) return res.status(404).json({ message: 'Swap request not found' });

    const isParticipant =
      swap.sender.toString() === req.user.id || swap.receiver.toString() === req.user.id;
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    if (swap.status !== 'Accepted') {
      return res.status(403).json({ message: 'Chat is only available for accepted swap requests' });
    }

    const messages = await Message.find({ swapRequest: swap._id })
      .populate('sender', 'name avatarUrl')
      .sort({ createdAt: 1 });

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
});

module.exports = router;

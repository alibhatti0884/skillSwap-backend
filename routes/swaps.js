const express = require('express');
const SwapRequest = require('../models/SwapRequest');
const { protect } = require('../middleware/auth');
const { sendNotification } = require('../services/notificationService');

const router = express.Router();

// @route  POST /api/swaps
// @desc   FR6: Send a swap request (state = Pending)
router.post('/', protect, async (req, res) => {
  try {
    const { receiverId, offeredSkill, requestedSkill, message } = req.body;

    if (!receiverId || !offeredSkill || !requestedSkill) {
      return res.status(400).json({ message: 'receiverId, offeredSkill and requestedSkill are required' });
    }

    if (receiverId === req.user.id) {
      return res.status(400).json({ message: 'You cannot send a swap request to yourself' });
    }

    const swap = await SwapRequest.create({
      sender: req.user.id,
      receiver: receiverId,
      offeredSkill,
      requestedSkill,
      message: message || '',
      status: 'Pending'
    });

    const populated = await swap.populate(['sender', 'receiver']);

    // Real-time notification (Firestore) to the receiver
    await sendNotification(receiverId, {
      type: 'swap_request',
      title: 'New Swap Request',
      body: `${populated.sender.name} wants to swap "${offeredSkill}" for "${requestedSkill}"`,
      relatedId: swap._id,
      relatedType: 'swap'
    });

    res.status(201).json({ swap: populated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create swap request', error: err.message });
  }
});

// @route  GET /api/swaps
// @desc   List swap requests involving the logged-in user (sent + received)
router.get('/', protect, async (req, res) => {
  try {
    const swaps = await SwapRequest.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }]
    })
      .populate('sender', 'name email avatarUrl location')
      .populate('receiver', 'name email avatarUrl location')
      .sort({ createdAt: -1 });

    res.json({ swaps });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch swap requests', error: err.message });
  }
});

// @route  PUT /api/swaps/:id
// @desc   FR6: Accept or reject a pending swap request (state transition)
router.put('/:id', protect, async (req, res) => {
  try {
    const { status } = req.body; // 'Accepted' | 'Rejected'

    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: "status must be 'Accepted' or 'Rejected'" });
    }

    const swap = await SwapRequest.findById(req.params.id);
    if (!swap) return res.status(404).json({ message: 'Swap request not found' });

    // Only the receiver may accept/reject the request
    if (swap.receiver.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the recipient can respond to this request' });
    }

    if (swap.status !== 'Pending') {
      return res.status(400).json({ message: `Request already ${swap.status}` });
    }

    swap.status = status;
    await swap.save();

    const populated = await swap.populate(['sender', 'receiver']);

    // Real-time notification (Firestore) back to the original sender
    await sendNotification(populated.sender._id, {
      type: status === 'Accepted' ? 'swap_accepted' : 'swap_rejected',
      title: status === 'Accepted' ? 'Swap Request Accepted' : 'Swap Request Rejected',
      body: `${populated.receiver.name} ${status === 'Accepted' ? 'accepted' : 'rejected'} your request for "${swap.requestedSkill}"`,
      relatedId: swap._id,
      relatedType: 'swap'
    });

    res.json({ swap: populated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update swap request', error: err.message });
  }
});

// @route  PUT /api/swaps/:id/complete
// @desc   Mark an Accepted swap as Completed (either participant may do this)
router.put('/:id/complete', protect, async (req, res) => {
  try {
    const swap = await SwapRequest.findById(req.params.id);
    if (!swap) return res.status(404).json({ message: 'Swap request not found' });

    const isParticipant =
      swap.sender.toString() === req.user.id || swap.receiver.toString() === req.user.id;
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized for this request' });
    }

    if (swap.status !== 'Accepted') {
      return res.status(400).json({ message: 'Only Accepted swaps can be marked Completed' });
    }

    swap.status = 'Completed';
    await swap.save();

    const populated = await swap.populate(['sender', 'receiver']);
    res.json({ swap: populated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to complete swap request', error: err.message });
  }
});

module.exports = router;

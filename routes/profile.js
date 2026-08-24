const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route  PUT /api/profile
// @desc   FR2: Update bio, location, avatar, and skill tags for the logged-in user
router.put('/', protect, async (req, res) => {
  try {
    const { bio, location, avatarUrl, skillsToTeach, skillsToLearn, name } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    // FR3: Skill tag selection ("Skills to Teach" / "Skills to Learn")
    if (Array.isArray(skillsToTeach)) user.skillsToTeach = skillsToTeach;
    if (Array.isArray(skillsToLearn)) user.skillsToLearn = skillsToLearn;

    await user.save();
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: 'Profile update failed', error: err.message });
  }
});

// @route  GET /api/profile/:id
// @desc   View another user's public profile
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
});

// @route  GET /api/profile/search?q=<term>
// @desc   Search Skills page: search other users by name, skill name, or skill category
router.get('/search/query', protect, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ users: [] });

    const regex = new RegExp(q, 'i');

    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { name: regex },
        { location: regex },
        { 'skillsToTeach.name': regex },
        { 'skillsToTeach.category': regex },
        { 'skillsToLearn.name': regex },
        { 'skillsToLearn.category': regex }
      ]
    }).limit(30);

    res.json({ users: users.map((u) => u.toSafeObject()) });
  } catch (err) {
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

module.exports = router;

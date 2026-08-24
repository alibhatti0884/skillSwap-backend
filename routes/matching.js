const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * FR5: Matching Logic Engine
 *
 * Algorithm:
 *  1. Load the current user's skillsToTeach and skillsToLearn arrays.
 *  2. Query all other users.
 *  3. For each candidate, compute:
 *       - teachOverlap: skills the candidate teaches that I want to learn
 *       - learnOverlap: skills the candidate wants to learn that I can teach
 *  4. matchScore = weighted overlap count (mutual matches score higher).
 *  5. Sort descending by matchScore and return top N.
 *
 * This is intentionally implemented in-app (not a raw DB aggregation) so it
 * is easy to explain line-by-line during the viva's "Backend Query
 * Verification" checkpoint.
 */
function computeMatchScore(me, candidate) {
  const myTeachNames = me.skillsToTeach.map((s) => s.name.toLowerCase());
  const myLearnNames = me.skillsToLearn.map((s) => s.name.toLowerCase());
  const candidateTeachNames = candidate.skillsToTeach.map((s) => s.name.toLowerCase());
  const candidateLearnNames = candidate.skillsToLearn.map((s) => s.name.toLowerCase());

  // Skills THEY teach that I want to LEARN
  const teachOverlap = candidate.skillsToTeach.filter((s) =>
    myLearnNames.includes(s.name.toLowerCase())
  );

  // Skills THEY want to learn that I can TEACH
  const learnOverlap = candidate.skillsToLearn.filter((s) =>
    myTeachNames.includes(s.name.toLowerCase())
  );

  // Mutual matches (both directions) are weighted higher than one-directional ones
  const mutualCount = Math.min(teachOverlap.length, learnOverlap.length);
  const score = teachOverlap.length + learnOverlap.length + mutualCount * 2;

  return { score, teachOverlap, learnOverlap };
}

// @route  GET /api/matching
// @desc   FR5: Suggest users whose teaching skills match this user's learning skills (and vice versa)
router.get('/', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: 'User not found' });

    const candidates = await User.find({ _id: { $ne: me._id } });

    const matches = candidates
      .map((candidate) => {
        const { score, teachOverlap, learnOverlap } = computeMatchScore(me, candidate);
        return {
          user: candidate.toSafeObject(),
          matchScore: score,
          theyTeachThatIWantToLearn: teachOverlap,
          theyWantToLearnThatITeach: learnOverlap
        };
      })
      .filter((m) => m.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    res.json({ count: matches.length, matches });
  } catch (err) {
    res.status(500).json({ message: 'Matching failed', error: err.message });
  }
});

module.exports = router;

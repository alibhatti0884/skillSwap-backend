const express = require('express');
const { SKILL_CATEGORIES } = require('../models/User');

const router = express.Router();

// @route  GET /api/skills/categories
// @desc   FR3: Return the categorized skill list used to populate selection dropdowns
router.get('/categories', (req, res) => {
  res.json({ categories: SKILL_CATEGORIES });
});

module.exports = router;

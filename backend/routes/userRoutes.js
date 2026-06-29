const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/users/search?email=someone@example.com
// @desc    Find a user by exact email (used when adding members to a group)
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email query parameter is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      '-password'
    );

    if (!user) {
      return res.status(404).json({ message: 'No user found with this email' });
    }

    res.json(user);
  } catch (error) {
    console.error('User search error:', error.message);
    res.status(500).json({ message: 'Server error while searching for user' });
  }
});

module.exports = router;

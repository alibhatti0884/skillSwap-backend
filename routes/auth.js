const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { getFirebaseAuth } = require('../config/firebaseAdmin');

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

// @route  POST /api/auth/register
// @desc   FR1: Register a new user (password hashed via User model pre-save hook)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({ name, email, password });

    const token = generateToken(user._id);
    res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// @route  POST /api/auth/login
// @desc   FR1: Authenticate user and return JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// @route  GET /api/auth/me
// @desc   Return the currently logged-in user (validates token/session)
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
  }
});

// @route  POST /api/auth/google
// @desc   "Continue with Google" — verifies the Firebase ID token the client
//         obtained via signInWithPopup(GoogleAuthProvider), then finds or
//         creates a matching MongoDB user and issues our own JWT so the rest
//         of the app (REST routes, matching, swaps) keeps working exactly
//         the same regardless of how the person originally signed in.
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'idToken is required' });
    }

    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      return res.status(503).json({
        message: 'Google sign-in is not configured on the server yet. See server/config/firebaseAdmin.js setup instructions.'
      });
    }

    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const { email, name, picture } = decoded;

    if (!email) {
      return res.status(400).json({ message: 'Google account did not return an email address' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // First time signing in with this Google account — create a MongoDB user.
      // A random password is stored (never used/shared) purely so the schema's
      // local-auth invariants stay simple; authProvider marks it as Google-owned.
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        password: crypto.randomBytes(24).toString('hex'),
        authProvider: 'google',
        avatarUrl: picture || ''
      });
    }

    const token = generateToken(user._id);
    res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    res.status(401).json({ message: 'Google sign-in failed', error: err.message });
  }
});

// @route  PUT /api/auth/change-password
// @desc   Settings page: update the current user's password (local accounts only)
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.authProvider === 'google') {
      return res.status(400).json({ message: 'This account signs in with Google and has no local password to change' });
    }

    const isMatch = await user.comparePassword(currentPassword || '');
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to change password', error: err.message });
  }
});

module.exports = router;

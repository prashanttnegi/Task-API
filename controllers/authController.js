// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper: Generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1h' // token is valid for 1 hour
  });
};

// POST /api/auth/register
exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if username or email already exists
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ message: 'Email or username already used' });

    // Create new user
    const user = await User.create({ username, email, password });

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      user: { username: user.username, email: user.email, role: user.role },
      token
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration error', error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { emailOrUsername, password } = req.body;

  try {
    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      user: { username: user.username, email: user.email, role: user.role },
      token
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  // Since we're not blacklisting tokens, just respond with success
  res.json({ message: 'Logged out (client should remove token)' });
};
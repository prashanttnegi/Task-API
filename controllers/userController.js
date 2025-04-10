// controllers/userController.js
const User = require('../models/User');

// GET /api/users/me
exports.getMyProfile = async (req, res) => {
  try {
    const { username, email, role, team } = req.user;
    res.json({ username, email, role, team });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile', error: err.message });
  }
};

// GET /api/users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
};

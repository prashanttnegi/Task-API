const jwt = require('jsonwebtoken');
const User = require('../models/User');
const redisClient = require('../config/redis');

// Helper: Generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1h' // token is valid for 1 hour
  });
};


exports.register = async (req, res) => {
    const { username, email, password } = req.body;
  
    // ✅ Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }
  
    if (!strongPasswordRegex.test(password)) {
        return res.status(400).json({
            message: 'Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, and a number'
        });
    }
  
    try {
        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) return res.status(400).json({ message: 'Email or username already in use' });
    
        const user = await User.create({ username, email, password });
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
        res.status(201).json({
            user: { username: user.username, email: user.email, role: user.role },
            token
        });
    } catch (err) {
      res.status(500).json({ message: 'Registration failed', error: err.message });
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


exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(400).json({ message: 'Token missing' });

    const token = authHeader.split(' ')[1];

    // Add token to Redis blacklist with expiry matching token
    const decoded = jwt.decode(token);
    const exp = decoded.exp;
    const ttl = exp - Math.floor(Date.now() / 1000); // time to expire

    await redisClient.set(`bl_${token}`, '1', { EX: ttl });

    res.json({ message: 'Logged out and token invalidated' });
  } catch (err) {
    res.status(500).json({ message: 'Logout failed', error: err.message });
  }
};

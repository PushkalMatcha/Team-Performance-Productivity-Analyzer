const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No auth token, access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sepm_secret_key_2024');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Token is invalid' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is invalid' });
  }
};

const managerOnly = (req, res, next) => {
  if (req.user.role !== 'Manager') {
    return res.status(403).json({ message: 'Access denied. Manager role required.' });
  }
  next();
};

module.exports = { auth, managerOnly };

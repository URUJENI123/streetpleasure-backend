const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const { rows } = await db.query(
      'SELECT id, phone_number, role, locked_at, fcm_token FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    if (rows[0].locked_at) {
      return res.status(403).json({ error: 'Account locked pending review', locked: true });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      required: roles,
      current: req.user.role
    });
  }
  next();
};

const requireVerified = (req, res, next) => {
  const verified = ['verified_local', 'verified_tourist', 'host_guide', 'admin'];
  if (!verified.includes(req.user?.role)) {
    return res.status(403).json({
      error: 'ID verification required to perform this action',
      code: 'VERIFICATION_REQUIRED'
    });
  }
  next();
};

module.exports = { authenticate, requireRole, requireVerified };
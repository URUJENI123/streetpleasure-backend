const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const { rows } = await query(
      'SELECT id, phone_number, role, locked_at FROM users WHERE id = $1',
      [payload.userId]
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    const user = rows[0];
    if (user.locked_at) return res.status(403).json({ error: 'Account locked pending review' });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
  }
  next();
};

const requireVerified = (req, res, next) => {
  const verified = ['verified_local', 'verified_tourist', 'host_guide', 'admin'];
  if (!verified.includes(req.user?.role)) {
    return res.status(403).json({ error: 'ID verification required to perform this action' });
  }
  next();
};

module.exports = { authenticate, requireRole, requireVerified };
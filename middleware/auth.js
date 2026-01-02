const User = require('../models/User');

const authRequired = async (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const user = await User.findById(req.session.userId).select('-passwordHash');
    if (!user) return res.status(401).json({ error: 'Invalid session' });
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const adminRequired = async (req, res, next) => {
  await authRequired(req, res, () => {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    next();
  });
};

module.exports = { authRequired, adminRequired };

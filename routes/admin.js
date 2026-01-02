const router = require('express').Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const Streak = require('../models/Streak');
const { adminRequired } = require('../middleware/auth');

const getTodayDate = () => new Date().toISOString().split('T')[0];
const getLast7Days = () => {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

// Get all users with stats
router.get('/users', adminRequired, async (req, res) => {
  try {
    const today = getTodayDate();
    const users = await User.find().select('-passwordHash');
    const [activities, streaks] = await Promise.all([
      Activity.find({ date: today }),
      Streak.find()
    ]);

    const userList = users.map(u => {
      const userStreaks = streaks.filter(s => s.userId.toString() === u._id.toString());
      const userActivities = activities.filter(a => a.userId.toString() === u._id.toString());
      return {
        ...u.toObject(),
        stats: {
          completedToday: userActivities.filter(a => a.completed).length,
          totalStreak: userStreaks.reduce((sum, s) => sum + (s.currentStreak || 0), 0),
          bestStreak: Math.max(...userStreaks.map(s => s.bestStreak || 0), 0)
        }
      };
    });

    res.json({ users: userList });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', adminRequired, async (req, res) => {
  try {
    const users = await User.find().select('firstName lastName');
    const streaks = await Streak.find();

    const leaderboard = users.map(u => {
      const userStreaks = streaks.filter(s => s.userId.toString() === u._id.toString());
      return {
        name: `${u.firstName} ${u.lastName}`,
        totalStreak: userStreaks.reduce((sum, s) => sum + (s.currentStreak || 0), 0),
        bestStreak: Math.max(...userStreaks.map(s => s.bestStreak || 0), 0),
        totalDays: userStreaks.reduce((sum, s) => sum + (s.totalDays || 0), 0)
      };
    }).sort((a, b) => b.totalStreak - a.totalStreak);

    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

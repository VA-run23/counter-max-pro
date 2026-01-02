const router = require('express').Router();
const User = require('../models/User');
const Streak = require('../models/Streak');
const { authRequired } = require('../middleware/auth');

// Update selected tasks
router.put('/tasks', authRequired, async (req, res) => {
  try {
    const { selectedTasks } = req.body;
    if (!selectedTasks) return res.status(400).json({ error: 'No tasks provided' });

    await User.findByIdAndUpdate(req.user._id, { selectedTasks });

    // Initialize streaks for new tasks
    const allTaskIds = [
      ...(selectedTasks.career || []),
      ...(selectedTasks.personal || []),
      ...(selectedTasks.custom || [])
    ];

    for (const taskId of allTaskIds) {
      await Streak.findOneAndUpdate(
        { userId: req.user._id, taskId },
        { $setOnInsert: { currentStreak: 0, bestStreak: 0, totalDays: 0 } },
        { upsert: true }
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
router.get('/profile', authRequired, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

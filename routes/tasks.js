const router = require('express').Router();
const Activity = require('../models/Activity');
const Streak = require('../models/Streak');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');

const TASK_NAMES = {
  github: 'GitHub Commits', leetcode: 'LeetCode Problems', gfg: 'GeeksforGeeks Practice',
  chess: 'Chess Games', detox: 'Digital Detox', screentime: 'Screen Time Limit',
  running: 'Running', gym: 'Gym Workout', yoga: 'Yoga Practice',
  swimming: 'Swimming', productivity: 'Daily Productivity Rating'
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getDateRange = (days) => {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

const getWeekDates = () => getDateRange(7);
const getMonthDates = () => getDateRange(30);
const getLast30Days = () => getDateRange(30);

// Update global streak based on completed tasks count
async function updateGlobalStreak(userId) {
  const user = await User.findById(userId);
  const today = getTodayDate();
  const minRequired = user.streakSettings?.minTasksRequired || 3;

  // Count today's completed tasks
  const todayActivities = await Activity.find({ userId, date: today, completed: true });
  const completedCount = todayActivities.length;

  // Check if minimum requirement met
  if (completedCount >= minRequired) {
    if (user.globalStreak.lastCompletedDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Continue streak if completed yesterday, otherwise reset to 1
      if (user.globalStreak.lastCompletedDate === yesterdayStr || user.globalStreak.currentStreak === 0) {
        user.globalStreak.currentStreak = (user.globalStreak.currentStreak || 0) + 1;
      } else {
        user.globalStreak.currentStreak = 1;
      }

      user.globalStreak.bestStreak = Math.max(user.globalStreak.bestStreak || 0, user.globalStreak.currentStreak);
      user.globalStreak.lastCompletedDate = today;
      await user.save();
    }
  }

  return { completedCount, minRequired, streakUpdated: completedCount >= minRequired };
}

// Complete/uncomplete a task
router.post('/:taskId/complete', authRequired, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { completed } = req.body;
    const today = getTodayDate();

    await Activity.findOneAndUpdate(
      { userId: req.user._id, taskId, date: today },
      { completed: !!completed, source: 'web' },
      { upsert: true }
    );

    // Update global streak
    const streakResult = await updateGlobalStreak(req.user._id);

    res.json({ success: true, ...streakResult });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update streak settings (min tasks required)
router.put('/settings', authRequired, async (req, res) => {
  try {
    const { minTasksRequired } = req.body;
    if (minTasksRequired < 1) return res.status(400).json({ error: 'Minimum must be at least 1' });

    await User.findByIdAndUpdate(req.user._id, {
      'streakSettings.minTasksRequired': minTasksRequired
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// Get dashboard data
router.get('/dashboard', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const today = getTodayDate();
    const last30Days = getLast30Days();
    const weekDates = getWeekDates();
    const monthDates = getMonthDates();

    const allTasks = [
      ...(user.selectedTasks?.career || []).map(id => ({ id, type: 'career', name: TASK_NAMES[id] || id })),
      ...(user.selectedTasks?.personal || []).map(id => ({ id, type: 'personal', name: TASK_NAMES[id] || id })),
      ...(user.selectedTasks?.custom || []).map(id => ({ id, type: 'custom', name: id }))
    ];

    const activities = await Activity.find({ userId: user._id });

    const tasks = allTasks.map(task => {
      const todayAct = activities.find(a => a.taskId === task.id && a.date === today);
      
      // Count days completed this week and month
      const weekCompleted = weekDates.filter(date => 
        activities.some(a => a.taskId === task.id && a.date === date && a.completed)
      ).length;
      
      const monthCompleted = monthDates.filter(date => 
        activities.some(a => a.taskId === task.id && a.date === date && a.completed)
      ).length;

      return {
        ...task,
        completed: !!todayAct?.completed,
        weekCompleted,
        monthCompleted
      };
    });

    const completedToday = tasks.filter(t => t.completed).length;
    const minRequired = user.streakSettings?.minTasksRequired || 3;
    const streakEarned = completedToday >= minRequired;

    // Chart data - show days where minimum was met
    const chartData = last30Days.map(date => {
      const dayCompleted = activities.filter(a => a.date === date && a.completed).length;
      return {
        date,
        completed: dayCompleted,
        total: allTasks.length,
        percentage: allTasks.length ? Math.round((dayCompleted / allTasks.length) * 100) : 0,
        streakEarned: dayCompleted >= minRequired
      };
    });

    res.json({
      user: { 
        name: `${user.firstName} ${user.lastName}`, 
        isAdmin: user.isAdmin 
      },
      tasks,
      globalStreak: {
        currentStreak: user.globalStreak?.currentStreak || 0,
        bestStreak: user.globalStreak?.bestStreak || 0,
        lastCompletedDate: user.globalStreak?.lastCompletedDate
      },
      streakSettings: {
        minTasksRequired: minRequired
      },
      stats: {
        totalTasks: tasks.length,
        completedToday,
        completionRate: tasks.length ? Math.round((completedToday / tasks.length) * 100) : 0,
        streakEarned,
        progressToStreak: `${completedToday}/${minRequired}`
      },
      chartData
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available task options
router.get('/options', authRequired, (req, res) => {
  res.json({
    career: [
      { id: 'github', name: 'GitHub Commits', icon: '💻' },
      { id: 'leetcode', name: 'LeetCode Problems', icon: '🧩' },
      { id: 'gfg', name: 'GeeksforGeeks Practice', icon: '📚' },
      { id: 'chess', name: 'Chess Games', icon: '♟️' }
    ],
    personal: [
      { id: 'detox', name: 'Digital Detox', icon: '🧘' },
      { id: 'screentime', name: 'Screen Time Limit', icon: '📱' },
      { id: 'running', name: 'Running', icon: '🏃' },
      { id: 'gym', name: 'Gym Workout', icon: '💪' },
      { id: 'yoga', name: 'Yoga Practice', icon: '🧘‍♀️' },
      { id: 'swimming', name: 'Swimming', icon: '🏊' },
      { id: 'productivity', name: 'Daily Productivity Rating', icon: '⭐' }
    ]
  });
});

module.exports = router;

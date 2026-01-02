const User = require('../models/User');
const Activity = require('../models/Activity');
const Streak = require('../models/Streak');

const TASK_NAMES = {
  github: 'GitHub Commits', leetcode: 'LeetCode Problems', gfg: 'GeeksforGeeks Practice',
  chess: 'Chess Games', detox: 'Digital Detox', screentime: 'Screen Time Limit',
  running: 'Running', gym: 'Gym Workout', yoga: 'Yoga Practice',
  swimming: 'Swimming', productivity: 'Daily Productivity Rating'
};

// Twilio client
let twilioClient = null;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

function initTwilio() {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio WhatsApp enabled');
    return true;
  }
  console.log('⚠️ Twilio not configured - WhatsApp disabled');
  return false;
}

async function sendWhatsAppMessage(phone, message) {
  if (!twilioClient) {
    console.log(`[WhatsApp Mock] To ${phone}: ${message}`);
    return { success: true, mock: true };
  }
  try {
    const result = await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${phone}`,
      body: message
    });
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error(`[WhatsApp Error]:`, error.message);
    return { success: false, error: error.message };
  }
}

async function sendDailyPoll(user) {
  const allTasks = [
    ...(user.selectedTasks?.career || []),
    ...(user.selectedTasks?.personal || []),
    ...(user.selectedTasks?.custom || [])
  ];
  if (!allTasks.length || !user.phone) return null;

  let message = `🎯 *Daily Activity Check-in*\n\nHi ${user.firstName}! Which tasks did you complete today?\n\n`;
  allTasks.forEach((taskId, i) => {
    message += `${i + 1}. ${TASK_NAMES[taskId] || taskId}\n`;
  });
  message += `\n📝 Reply with numbers (e.g., "1,3,5") or "all" / "none"\n💪 Keep your streaks going!`;

  return sendWhatsAppMessage(user.phone, message);
}

async function sendRemindersToAll() {
  const users = await User.find({ phone: { $ne: '' } });
  console.log(`[WhatsApp] Sending reminders to ${users.length} users`);
  for (const user of users) {
    await sendDailyPoll(user);
  }
  return users.length;
}

const getTodayDate = () => new Date().toISOString().split('T')[0];

async function processIncomingMessage(phone, message) {
  const cleanPhone = phone.replace('whatsapp:', '');
  const user = await User.findOne({ $or: [{ phone: cleanPhone }, { phone }] });
  
  if (!user) {
    await sendWhatsAppMessage(phone, "❌ Phone not registered. Please register at the web app first.");
    return { success: false, error: 'User not found' };
  }

  const allTasks = [
    ...(user.selectedTasks?.career || []),
    ...(user.selectedTasks?.personal || []),
    ...(user.selectedTasks?.custom || [])
  ];

  const today = getTodayDate();
  const msgLower = message.toLowerCase().trim();
  let completedIndices = [];

  if (msgLower === 'none' || msgLower === 'no' || msgLower === '0') {
    completedIndices = [];
  } else if (msgLower === 'all' || msgLower === 'done all') {
    completedIndices = allTasks.map((_, i) => i);
  } else if (msgLower === 'status') {
    // Send current status
    const activities = await Activity.find({ userId: user._id, date: today });
    const streaks = await Streak.find({ userId: user._id });
    
    let status = `📊 *Your Status for Today*\n\n`;
    allTasks.forEach((taskId, i) => {
      const act = activities.find(a => a.taskId === taskId);
      const streak = streaks.find(s => s.taskId === taskId);
      const done = act?.completed ? '✅' : '⬜';
      status += `${done} ${TASK_NAMES[taskId] || taskId} (🔥${streak?.currentStreak || 0})\n`;
    });
    
    await sendWhatsAppMessage(phone, status);
    return { success: true, type: 'status' };
  } else {
    const numbers = message.match(/\d+/g);
    if (numbers) {
      completedIndices = numbers.map(n => parseInt(n) - 1).filter(i => i >= 0 && i < allTasks.length);
    }
  }

  // Record completions
  for (const index of completedIndices) {
    const taskId = allTasks[index];
    await Activity.findOneAndUpdate(
      { userId: user._id, taskId, date: today },
      { completed: true, source: 'whatsapp' },
      { upsert: true }
    );

    // Update streak
    let streak = await Streak.findOne({ userId: user._id, taskId });
    if (!streak) streak = new Streak({ userId: user._id, taskId });
    
    if (streak.lastCompleted !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      streak.currentStreak = (streak.lastCompleted === yesterdayStr || !streak.currentStreak)
        ? (streak.currentStreak || 0) + 1 : 1;
      streak.bestStreak = Math.max(streak.bestStreak || 0, streak.currentStreak);
      streak.totalDays = (streak.totalDays || 0) + 1;
      streak.lastCompleted = today;
      await streak.save();
    }
  }

  const completedNames = completedIndices.map(i => TASK_NAMES[allTasks[i]] || allTasks[i]);
  const reply = completedIndices.length > 0
    ? `✅ Recorded ${completedIndices.length} task(s):\n${completedNames.map(n => `• ${n}`).join('\n')}\n\n🔥 Keep it up!`
    : `👍 Got it! Reply with task numbers anytime to log progress.`;

  await sendWhatsAppMessage(phone, reply);
  return { success: true, completed: completedIndices.length };
}

module.exports = {
  initTwilio,
  sendWhatsAppMessage,
  sendDailyPoll,
  sendRemindersToAll,
  processIncomingMessage
};

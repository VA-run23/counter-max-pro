const router = require('express').Router();
const { processIncomingMessage, sendRemindersToAll, sendDailyPoll } = require('../services/whatsapp');
const { adminRequired } = require('../middleware/auth');
const User = require('../models/User');

// Twilio webhook for incoming WhatsApp messages
router.post('/webhook', async (req, res) => {
  const { From, Body } = req.body;
  console.log(`[WhatsApp] From: ${From}, Body: ${Body}`);

  if (From && Body) {
    await processIncomingMessage(From, Body);
  }

  // Twilio expects empty 200 response
  res.status(200).send('');
});

// Admin: Send reminders to all users
router.post('/send-reminders', adminRequired, async (req, res) => {
  try {
    const count = await sendRemindersToAll();
    res.json({ success: true, message: `Reminders sent to ${count} users` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

// Admin: Send poll to specific user
router.post('/send-poll/:userId', adminRequired, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.phone) return res.status(400).json({ error: 'User has no phone number' });

    const result = await sendDailyPoll(user);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send poll' });
  }
});

// Get WhatsApp status
router.get('/status', adminRequired, (req, res) => {
  const enabled = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  res.json({ 
    enabled,
    webhookUrl: `${req.protocol}://${req.get('host')}/api/whatsapp/webhook`
  });
});

module.exports = router;

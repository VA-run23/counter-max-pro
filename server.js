require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const mongoose = require('mongoose');
const cron = require('node-cron');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const adminRoutes = require('./routes/admin');
const whatsappRoutes = require('./routes/whatsapp');
const { initTwilio, sendRemindersToAll } = require('./services/whatsapp');

const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/activity-tracker')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Initialize Twilio
initTwilio();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    whatsapp: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    timestamp: new Date().toISOString()
  });
});

// Scheduled WhatsApp reminders: 9 AM, 12 PM, 3 PM, 6 PM, 9 PM
cron.schedule('0 9,12,15,18,21 * * *', () => {
  console.log(`[Cron] Sending reminders at ${new Date().toLocaleString()}`);
  sendRemindersToAll();
}, { timezone: process.env.TIMEZONE || 'Asia/Kolkata' });

console.log('📅 WhatsApp reminders scheduled: 9 AM, 12 PM, 3 PM, 6 PM, 9 PM');

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'client/dist/index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

module.exports = app;

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, default: '' },
  selectedTasks: {
    career: [String],
    personal: [String],
    custom: [String]
  },
  streakSettings: {
    minTasksRequired: { type: Number, default: 3 } // Minimum tasks to complete for streak
  },
  globalStreak: {
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String, default: null }
  },
  isAdmin: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

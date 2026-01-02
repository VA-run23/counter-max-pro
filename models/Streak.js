const mongoose = require('mongoose');

const streakSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskId: { type: String, required: true },
  currentStreak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  totalDays: { type: Number, default: 0 },
  lastCompleted: { type: String, default: null } // YYYY-MM-DD format
}, { timestamps: true });

streakSchema.index({ userId: 1, taskId: 1 }, { unique: true });

module.exports = mongoose.model('Streak', streakSchema);

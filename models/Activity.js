const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD format
  completed: { type: Boolean, default: false },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
  notes: { type: String, default: '' },
  source: { type: String, enum: ['web', 'whatsapp'], default: 'web' }
}, { timestamps: true });

activitySchema.index({ userId: 1, taskId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Activity', activitySchema);

const mongoose = require('mongoose');

const pollResponseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  responses: [String],
  rawMessage: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('PollResponse', pollResponseSchema);

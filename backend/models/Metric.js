const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  views: { type: Number, default: 0 },
  subscribersGained: { type: Number, default: 0 },
  followersGained: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  recordedAt: { type: Date, default: Date.now }
});

// Index for performance on time-series queries
metricSchema.index({ videoId: 1, recordedAt: -1 });

module.exports = mongoose.model('Metric', metricSchema);

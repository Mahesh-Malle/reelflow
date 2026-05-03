const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  youtubeHandle: { type: String },
  instagramHandle: { type: String },
  externalIds: {
    youtube: { type: String },
    instagram: { type: String }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Channel', channelSchema);

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['CONTENT_CATEGORY', 'CONTENT_TYPE', 'HOOK_TYPE'], 
    required: true 
  },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  description: { type: String, default: '' },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Category', categorySchema);

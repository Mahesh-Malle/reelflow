const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  publishDate: { type: Date },
  plannedDate: { type: Date },
  plannedTime: { type: String },
  status: { type: String, enum: ['Idea', 'Planned', 'Posted'], default: 'Idea' },
  contentCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  contentTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  hookTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  notes: { type: String, default: '' },
  references: [{
    url:  { type: String, default: '' },
    note: { type: String, default: '' },
  }],
  externalId: { type: String },
  expertScore: { type: Number, min: 1, max: 5 },
  youtube: {
    views: { type: Number, default: 0 },
    subscribersGained: { type: Number, default: 0 }
  },
  instagram: {
    views: { type: Number, default: 0 },
    followersGained: { type: Number, default: 0 }
  },
  order: { type: Number, default: 0 },
  orderIndex: { type: Number, default: 0 },
  isDateLocked: { type: Boolean, default: false },
  slot: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  needScript: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

videoSchema.index({ title: 1 });
videoSchema.index({ contentCategories: 1 });
videoSchema.index({ contentTypes: 1 });
videoSchema.index({ hookTypes: 1 });

module.exports = mongoose.model('Video', videoSchema);

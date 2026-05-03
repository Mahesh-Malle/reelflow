import mongoose, { Schema, Document } from 'mongoose';

export type Permission = 'VIEW_PLANNER' | 'EDIT_PLANNER' | 'VIEW_ANALYTICS' | 'EDIT_ANALYTICS' | 'ADMIN';

export interface IUserChannelAccess extends Document {
  userId: mongoose.Types.ObjectId;
  channelId: mongoose.Types.ObjectId;
  role: Permission;
}

const UserChannelAccessSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  channelId: { type: Schema.Types.ObjectId, ref: 'Channel', required: true },
  role: { 
    type: String, 
    enum: ['VIEW_PLANNER', 'EDIT_PLANNER', 'VIEW_ANALYTICS', 'EDIT_ANALYTICS', 'ADMIN'],
    required: true,
    default: 'VIEW_PLANNER'
  }
}, { timestamps: true });

// Ensure a user doesn't have duplicate access entries for the same channel
UserChannelAccessSchema.index({ userId: 1, channelId: 1 }, { unique: true });

export default mongoose.model<IUserChannelAccess>('UserChannelAccess', UserChannelAccessSchema);

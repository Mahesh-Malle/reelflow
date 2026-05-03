import mongoose, { Schema, Document } from 'mongoose';

export interface IChannel extends Document {
  name: string;
  ownerId: mongoose.Types.ObjectId; // Reference to User ID
  description?: string;
}

const ChannelSchema: Schema = new Schema({
  name: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model<IChannel>('Channel', ChannelSchema);

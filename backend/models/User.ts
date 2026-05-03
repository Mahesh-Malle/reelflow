import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  mobileNumber: string;
  password: string; // Stored as plain text as per requirement
  name?: string;
  isAdmin: boolean;
}

const UserSchema: Schema = new Schema({
  mobileNumber: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  isAdmin: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);

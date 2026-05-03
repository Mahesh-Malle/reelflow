import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import UserChannelAccess from '../models/UserChannelAccess';
import Channel from '../models/Channel';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret';
const ADMIN_MOBILE = process.env.ADMIN_MOBILE || 'your_mobile_number'; // Manually set your number as the primary admin

export const login = async (req: Request, res: Response) => {
  const { mobileNumber, password } = req.body;

  try {
    const user = await User.findOne({ mobileNumber });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Fetch all channels this user has access to
    const accessRecords = await UserChannelAccess.find({ userId: user._id });
    const accessMap = accessRecords.reduce((acc: any, curr) => {
      acc[curr.channelId.toString()] = curr.role;
      return acc;
    }, {});

    const token = jwt.sign(
      { userId: user._id, mobileNumber: user.mobileNumber, name: user.name, isAdmin: user.isAdmin, accessMap },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { userId: user._id, mobileNumber: user.mobileNumber, name: user.name, isAdmin: user.isAdmin, accessMap } });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
};

export const register = async (req: Request, res: Response) => {
  const { mobileNumber, password, name } = req.body;

  try {
    let user = await User.findOne({ mobileNumber });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = new User({ mobileNumber, password, name });
    await user.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed' });
  }
};

// Admin only: Assign access to a mobile number for multiple channels
export const assignAccess = async (req: any, res: Response) => {
  const { targetMobile, channelIds, permissions, name } = req.body;
  const userId = req.user?.userId;
  const isGlobalAdmin = req.user?.isAdmin;

  if (!isGlobalAdmin) {
    // Check if user has ADMIN role for ALL requested channelIds
    const adminAccess = await UserChannelAccess.find({ 
      userId, 
      channelId: { $in: channelIds }, 
      role: 'ADMIN' 
    });
    if (adminAccess.length !== channelIds.length) {
      return res.status(403).json({ message: 'You can only assign access to channels you are an admin of' });
    }
  }

  try {
    // 1. Find or create the user for the target mobile number
    let targetUser = await User.findOne({ mobileNumber: targetMobile });
    
    if (!targetUser) {
      // Create a placeholder user so they can log in later with this number
      targetUser = new User({ 
        mobileNumber: targetMobile, 
        password: targetMobile, // Default password is their mobile number
        name: name || 'New Team Member' 
      });
      await targetUser.save();
    } else if (name) {
      // Update existing user name if provided
      targetUser.name = name;
      await targetUser.save();
    }

    // 2. Loop through each channelId and create/update access
    const role = Array.isArray(permissions) ? permissions[0] : permissions;
    const operations = channelIds.map((channelId: string) => ({
      updateOne: {
        filter: { userId: targetUser!._id, channelId },
        update: { role },
        upsert: true
      }
    }));

    await UserChannelAccess.bulkWrite(operations);

    res.json({ message: `Access assigned to ${targetMobile} for ${channelIds.length} channels` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to assign access' });
  }
};

// Admin only: Get all users who have access to some channels
export const getTeamMembers = async (req: any, res: Response) => {
  const userId = req.user?.userId;
  const isGlobalAdmin = req.user?.isAdmin;

  try {
    let accessRecords;

    if (isGlobalAdmin) {
      // Global admins see everything
      accessRecords = await UserChannelAccess.find().populate('userId', 'name mobileNumber');
    } else {
      // Channel admins see everyone who has access to the channels they manage
      const managedChannels = await UserChannelAccess.find({ userId, role: 'ADMIN' }).distinct('channelId');
      if (managedChannels.length === 0) {
        return res.status(403).json({ message: 'Only admins can view team members' });
      }
      accessRecords = await UserChannelAccess.find({ channelId: { $in: managedChannels } }).populate('userId', 'name mobileNumber');
    }
    
    // Group by user
    const teamMap: any = {};
    accessRecords.forEach((record: any) => {
      if (!record.userId) return;
      const userId = record.userId._id.toString();
      if (!teamMap[userId]) {
        teamMap[userId] = {
          _id: userId,
          name: record.userId.name,
          mobileNumber: record.userId.mobileNumber,
          access: []
        };
      }
      teamMap[userId].access.push({
        channelId: record.channelId,
        role: record.role
      });
    });

    res.json(Object.values(teamMap));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch team members' });
  }
};

// Admin only: Update a team member's name and channel-specific access
export const updateTeamMember = async (req: any, res: Response) => {
  const { userId: targetUserId } = req.params;
  const { name, channelId, permissions } = req.body;
  const userId = req.user?.userId;
  const isGlobalAdmin = req.user?.isAdmin;

  if (!isGlobalAdmin) {
    // If not global admin, must be admin of the specific channel being updated
    if (channelId) {
      const isAdminOfChannel = await UserChannelAccess.exists({ userId, channelId, role: 'ADMIN' });
      if (!isAdminOfChannel) {
        return res.status(403).json({ message: 'You can only update access for channels you are an admin of' });
      }
    } else {
      // If only updating name, they must be admin of at least one channel the target user is in?
      // Or just restrict name updates to global admins for simplicity.
      return res.status(403).json({ message: 'Only global admins can update names' });
    }
  }

  try {
    // 1. Update user name
    if (name) {
      await User.findByIdAndUpdate(targetUserId, { name });
    }

    // 2. Update specific channel access
    if (channelId && permissions) {
      const role = Array.isArray(permissions) ? permissions[0] : permissions;
      
      // Prevent removing self-admin status if updating own record
      if (req.user?.userId === targetUserId && role !== 'ADMIN' && !req.user?.isAdmin) {
        return res.status(400).json({ message: 'You cannot remove your own ADMIN permission' });
      }

      await UserChannelAccess.findOneAndUpdate(
        { userId: targetUserId, channelId },
        { role },
        { upsert: true }
      );
    }

    res.json({ message: 'Team member updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update team member' });
  }
};

// Admin only: Remove access for a user from a specific channel
export const removeChannelAccess = async (req: any, res: Response) => {
  const { userId: targetUserId, channelId } = req.params;
  const currentUserId = req.user?.userId;
  const isGlobalAdmin = req.user?.isAdmin;

  if (!isGlobalAdmin) {
    const isAdminOfChannel = await UserChannelAccess.exists({ userId: currentUserId, channelId, role: 'ADMIN' });
    if (!isAdminOfChannel) {
      return res.status(403).json({ message: 'You can only remove access for channels you are an admin of' });
    }
  }

  try {
    if (currentUserId === targetUserId) {
      return res.status(400).json({ message: 'You cannot remove your own access' });
    }
    await UserChannelAccess.findOneAndDelete({ userId: targetUserId, channelId });
    res.json({ message: 'Access removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove access' });
  }
};

import { Response } from 'express';
import Channel from '../models/Channel';
import UserChannelAccess from '../models/UserChannelAccess';

console.log('DEBUG: channelController.ts LOADING...');

export const getUserChannels = async (req: any, res: Response) => {
  const userId = req.user?.userId;

  try {
    // If admin, return ALL channels
    if (req.user?.isAdmin) {
      const allChannels = await Channel.find();
      return res.json(allChannels);
    }

    // 1. Get channels owned by the user
    const ownedChannels = await Channel.find({ ownerId: userId });

    // 2. Get channels where user has explicit access
    const accessRecords = await UserChannelAccess.find({ userId }).populate('channelId');
    const assignedChannels = accessRecords.map((record: any) => record.channelId);

    // Combine and remove duplicates (by ID)
    const allChannelsMap = new Map();
    ownedChannels.forEach(c => allChannelsMap.set(c._id.toString(), c));
    assignedChannels.forEach((c: any) => {
      if (c) allChannelsMap.set(c._id.toString(), c);
    });

    res.json(Array.from(allChannelsMap.values()));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching channels' });
  }
};

export const createChannel = async (req: any, res: Response) => {
  const { name, description } = req.body;
  const ownerId = req.user?.userId;

  if (!ownerId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const channel = new Channel({ name, description, ownerId });
    await channel.save();

    // Automatically give owner full permissions
    await UserChannelAccess.create({
      userId: ownerId,
      channelId: channel._id,
      role: 'ADMIN'
    });

    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ message: 'Error creating channel' });
  }
};

import { Request, Response } from 'express';
import Video from '../models/Video';
import mongoose from 'mongoose';

export const getOverview = async (req: Request, res: Response) => {
  const { channelId } = req.query;
  if (!channelId) return res.status(400).json({ message: 'Channel ID required' });

  try {
    const stats = await Video.aggregate([
      { $match: { channelId: new mongoose.Types.ObjectId(channelId as string), status: 'Posted', isDeleted: { $ne: true } } },
      { $group: {
        _id: null,
        totalViews: { $sum: { $add: ['$youtube.views', '$instagram.views'] } },
        totalSubs: { $sum: '$youtube.subscribersGained' },
        totalFollowers: { $sum: '$instagram.followersGained' },
        videoCount: { $sum: 1 }
      }}
    ]);

    if (stats.length === 0) {
      return res.json({ totalViews: 0, totalSubs: 0, totalFollowers: 0, videoCount: 0 });
    }

    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching overview stats' });
  }
};

export const getCategoryAnalytics = async (req: Request, res: Response) => {
  const { channelId } = req.query;
  if (!channelId) return res.status(400).json({ message: 'Channel ID required' });

  try {
    const results = await Video.aggregate([
      { $match: { channelId: new mongoose.Types.ObjectId(channelId as string), status: 'Posted', isDeleted: { $ne: true } } },
      { $unwind: '$contentCategories' },
      { $group: {
        _id: '$contentCategories',
        youtubeViews: { $sum: '$youtube.views' },
        instagramViews: { $sum: '$instagram.views' },
        totalViews: { $sum: { $add: ['$youtube.views', '$instagram.views'] } },
        totalSubs: { $sum: '$youtube.subscribersGained' },
        totalFollowers: { $sum: '$instagram.followersGained' },
        youtubeVideoCount: { $sum: { $cond: [{ $gt: ['$youtube.views', 0] }, 1, 0] } },
        instagramVideoCount: { $sum: { $cond: [{ $gt: ['$instagram.views', 0] }, 1, 0] } },
        totalVideos: { $sum: 1 }
      }},
      { $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'categoryInfo'
      }},
      { $unwind: '$categoryInfo' },
      { $project: {
        name: '$categoryInfo.name',
        youtubeViews: 1,
        instagramViews: 1,
        totalViews: 1,
        totalSubs: 1,
        totalFollowers: 1,
        youtubeVideoCount: 1,
        instagramVideoCount: 1,
        totalVideos: 1
      }}
    ]);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching category analytics' });
  }
};

export const getContentTypeAnalytics = async (req: Request, res: Response) => {
  const { channelId } = req.query;
  if (!channelId) return res.status(400).json({ message: 'Channel ID required' });

  try {
    const results = await Video.aggregate([
      { $match: { channelId: new mongoose.Types.ObjectId(channelId as string), status: 'Posted', isDeleted: { $ne: true } } },
      { $unwind: '$contentTypes' },
      { $group: {
        _id: '$contentTypes',
        youtubeViews: { $sum: '$youtube.views' },
        instagramViews: { $sum: '$instagram.views' },
        totalViews: { $sum: { $add: ['$youtube.views', '$instagram.views'] } },
        totalSubs: { $sum: '$youtube.subscribersGained' },
        totalFollowers: { $sum: '$instagram.followersGained' },
        youtubeVideoCount: { $sum: { $cond: [{ $gt: ['$youtube.views', 0] }, 1, 0] } },
        instagramVideoCount: { $sum: { $cond: [{ $gt: ['$instagram.views', 0] }, 1, 0] } },
        totalVideos: { $sum: 1 }
      }},
      { $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'typeInfo'
      }},
      { $unwind: '$typeInfo' },
      { $project: {
        name: '$typeInfo.name',
        youtubeViews: 1,
        instagramViews: 1,
        totalViews: 1,
        totalSubs: 1,
        totalFollowers: 1,
        youtubeVideoCount: 1,
        instagramVideoCount: 1,
        totalVideos: 1
      }}
    ]);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching content type analytics' });
  }
};

export const getHookTypeAnalytics = async (req: Request, res: Response) => {
  const { channelId } = req.query;
  if (!channelId) return res.status(400).json({ message: 'Channel ID required' });

  try {
    const results = await Video.aggregate([
      { $match: { channelId: new mongoose.Types.ObjectId(channelId as string), status: 'Posted', isDeleted: { $ne: true } } },
      { $unwind: '$hookTypes' },
      { $group: {
        _id: '$hookTypes',
        youtubeViews: { $sum: '$youtube.views' },
        instagramViews: { $sum: '$instagram.views' },
        totalViews: { $sum: { $add: ['$youtube.views', '$instagram.views'] } },
        totalSubs: { $sum: '$youtube.subscribersGained' },
        totalFollowers: { $sum: '$instagram.followersGained' },
        youtubeVideoCount: { $sum: { $cond: [{ $gt: ['$youtube.views', 0] }, 1, 0] } },
        instagramVideoCount: { $sum: { $cond: [{ $gt: ['$instagram.views', 0] }, 1, 0] } },
        totalVideos: { $sum: 1 }
      }},
      { $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'hookInfo'
      }},
      { $unwind: '$hookInfo' },
      { $project: {
        name: '$hookInfo.name',
        youtubeViews: 1,
        instagramViews: 1,
        totalViews: 1,
        totalSubs: 1,
        totalFollowers: 1,
        youtubeVideoCount: 1,
        instagramVideoCount: 1,
        totalVideos: 1
      }}
    ]);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching hook type analytics' });
  }
};

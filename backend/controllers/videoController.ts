import { Response } from 'express';
import Video from '../models/Video';
import UserChannelAccess from '../models/UserChannelAccess';
import { AuthRequest } from '../middleware/authMiddleware';

export const getVideos = async (req: AuthRequest, res: Response) => {
  const { channelId, status } = req.query;

  // IMPORTANT: The requirePermission middleware should have already validated 
  // that req.user has access to this channelId.
  
  if (!channelId) {
    return res.status(400).json({ message: 'Channel ID is required' });
  }

  try {
    const query: any = { channelId, isDeleted: { $ne: true } };
    if (status) query.status = status;

    const videos = await Video.find(query)
      .sort({ publishDate: -1 })
      .populate('createdBy', 'name isAdmin');
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching videos' });
  }
};

export const createVideo = async (req: AuthRequest, res: Response) => {
  const { title, channelId, status } = req.body;

  if (!channelId) {
    return res.status(400).json({ message: 'Channel ID is required' });
  }

  try {
    const video = new Video({
      ...req.body,
      createdBy: req.user?.userId
    });
    await video.save();
    
    // Populate before sending back
    await video.populate('createdBy', 'name isAdmin');
    
    res.status(201).json(video);
  } catch (error) {
    res.status(500).json({ message: 'Error creating video' });
  }
};
export const getVideoById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const video = await Video.findById(id)
      .populate('contentCategories')
      .populate('contentTypes')
      .populate('hookTypes')
      .populate('createdBy', 'name isAdmin');
    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.json(video);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching video' });
  }
};

export const updateVideo = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, channelId } = req.body;

  try {
    // If trying to mark as Posted, check for ADMIN level (level 5)
    if (status === 'Posted' && !req.user?.isAdmin) {
      const targetChannelId = channelId || (await Video.findById(id))?.channelId;
      const access = await UserChannelAccess.findOne({ userId: req.user?.userId, channelId: targetChannelId });
      
      const PERMISSION_LEVELS: Record<string, number> = {
        'VIEW_PLANNER': 1,
        'EDIT_PLANNER': 2,
        'VIEW_ANALYTICS': 3,
        'EDIT_ANALYTICS': 4,
        'ADMIN': 5,
      };

      const maxUserLevel = access ? (PERMISSION_LEVELS[access.role] || 0) : 0;
      
      if (maxUserLevel < 5) { // 5 is ADMIN
        return res.status(403).json({ message: 'Insufficient permissions to mark video as Posted. ADMIN role required.' });
      }
    }

    const video = await Video.findByIdAndUpdate(id, req.body, { new: true });
    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.json(video);
  } catch (error) {
    res.status(500).json({ message: 'Error updating video' });
  }
};

export const deleteVideo = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const isGlobalAdmin = req.user?.isAdmin;

  try {
    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    let canDelete = isGlobalAdmin;

    if (!canDelete) {
      // Check channel-level access
      const access = await UserChannelAccess.findOne({ userId, channelId: video.channelId });
      if (access?.role === 'ADMIN') {
        canDelete = true;
      } else if (video.createdBy?.toString() === userId) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({ message: 'You can only delete content you created.' });
    }

    video.isDeleted = true;
    await video.save();
    res.json({ message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting video' });
  }
};

export const reorderVideos = async (req: AuthRequest, res: Response) => {
  const { channelId, movedId, newPlannedDate, autoShift, updates } = req.body;
  
  try {
    if (newPlannedDate) {
      await Video.findByIdAndUpdate(movedId, { plannedDate: newPlannedDate });
    }

    if (updates && updates.length > 0) {
      const operations = updates.map((u: any) => ({
        updateOne: {
          filter: { _id: u._id },
          update: { orderIndex: u.orderIndex }
        }
      }));
      await Video.bulkWrite(operations);
    }

    res.json({ message: 'Reorder successful' });
  } catch (error) {
    res.status(500).json({ message: 'Error reordering videos' });
  }
};

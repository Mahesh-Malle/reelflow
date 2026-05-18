import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import UserChannelAccess, { Permission } from '../models/UserChannelAccess';

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    mobileNumber: string;
    name?: string;
    isAdmin: boolean;
    accessMap: any;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const PERMISSION_LEVELS: Record<string, number> = {
  'VIEW_PLANNER': 1,
  'SCRIPT_WRITER': 1.5,
  'EDIT_PLANNER': 2,
  'VIEW_ANALYTICS': 3,
  'EDIT_ANALYTICS': 4,
  'ADMIN': 5,
};

export const requirePermission = (permission: Permission) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const channelId = req.headers['x-channel-id'] || req.query.channelId || req.body?.channelId;
    const userId = req.user?.userId;

    if (!channelId || !userId) {
      return res.status(400).json({ message: 'Channel ID and User Auth required' });
    }

    try {
      if (req.user?.isAdmin) {
        return next();
      }

      const access = await UserChannelAccess.findOne({ 
        userId, 
        channelId: channelId as string 
      });

      if (!access) {
        return res.status(403).json({ message: 'No access to this channel' });
      }

      const userRole = access.role;
      const maxUserLevel = PERMISSION_LEVELS[userRole] || 0;
      const requiredLevel = PERMISSION_LEVELS[permission] || 0;

      if (maxUserLevel < requiredLevel) {
        return res.status(403).json({ message: `Insufficient permissions: at least ${permission} level required` });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Internal server error during permission check' });
    }
  };
};

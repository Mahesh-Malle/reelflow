import express from 'express';
import { login, register, assignAccess, getTeamMembers, updateTeamMember, removeChannelAccess } from '../controllers/authController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

// Auth Routes
router.post('/login', login);
router.post('/register', register);

// Access Management (Admin only)
router.post('/assign-access', requireAuth, assignAccess);
router.get('/team', requireAuth, getTeamMembers);
router.put('/team/:userId', requireAuth, updateTeamMember);
router.delete('/team/:userId/:channelId', requireAuth, removeChannelAccess);

export default router;

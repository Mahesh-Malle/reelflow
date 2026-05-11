import express from 'express';
import { getVideos, createVideo, getVideoById, updateVideo, deleteVideo, reorderVideos } from '../controllers/videoController';
import { requireAuth, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

// Video Routes
router.get('/', requireAuth, requirePermission('VIEW_PLANNER'), getVideos);
router.get('/:id', requireAuth, requirePermission('VIEW_PLANNER'), getVideoById);
router.post('/', requireAuth, requirePermission('EDIT_PLANNER'), createVideo);
router.put('/reorder', requireAuth, requirePermission('EDIT_PLANNER'), reorderVideos);
router.put('/:id', requireAuth, requirePermission('SCRIPT_WRITER'), updateVideo);
router.delete('/:id', requireAuth, requirePermission('EDIT_PLANNER'), deleteVideo);

export default router;

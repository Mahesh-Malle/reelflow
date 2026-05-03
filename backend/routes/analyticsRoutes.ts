import express from 'express';
import { getCategoryAnalytics, getContentTypeAnalytics, getHookTypeAnalytics, getOverview } from '../controllers/analyticsController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/overview', requireAuth, getOverview);
router.get('/categories', requireAuth, getCategoryAnalytics);
router.get('/content-types', requireAuth, getContentTypeAnalytics);
router.get('/hook-types', requireAuth, getHookTypeAnalytics);

export default router;

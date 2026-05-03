import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';

console.log('DEBUG [channelRoutes]: requireAuth type =', typeof requireAuth);

const router = express.Router();

// Use require to see if it makes a difference
const channelController = require('../controllers/channelController');
console.log('DEBUG [channelRoutes]: channelController keys =', Object.keys(channelController));

const getUserChannels = channelController.getUserChannels;
const createChannel = channelController.createChannel;

console.log('DEBUG [channelRoutes]: getUserChannels type =', typeof getUserChannels);

if (typeof requireAuth === 'function' && typeof getUserChannels === 'function') {
  router.get('/my-channels', requireAuth, getUserChannels);
} else {
  console.error('CRITICAL ERROR: requireAuth or getUserChannels is UNDEFINED in channelRoutes');
}

if (typeof requireAuth === 'function' && typeof createChannel === 'function') {
  router.post('/create', requireAuth, createChannel);
}

export default router;

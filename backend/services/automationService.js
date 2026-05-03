const axios = require('axios');
const Video = require('../models/Video');
const Metric = require('../models/Metric');

/**
 * Mocking a service that fetches data from social platforms.
 * In a real scenario, this would use YouTube Data API v3 and Instagram Graph API.
 */
class AutomationService {
  async updateVideoMetrics(video) {
    if (!video.externalId) return;

    try {
      let views = 0;
      let likes = 0;

      if (video.platform === 'YouTube' && process.env.YOUTUBE_API_KEY) {
        // Real API Call placeholder
        // const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${video.externalId}&key=${process.env.YOUTUBE_API_KEY}`);
        // views = response.data.items[0].statistics.viewCount;
        // likes = response.data.items[0].statistics.likeCount;
        
        // Mocking for now
        views = Math.floor(Math.random() * 10000) + 500;
        likes = Math.floor(views * 0.05);
      } else if (video.platform === 'Instagram' && process.env.INSTAGRAM_TOKEN) {
        // Instagram Graph API placeholder
        views = Math.floor(Math.random() * 5000) + 200;
        likes = Math.floor(views * 0.08);
      }

      if (views > 0) {
        await Metric.create({
          videoId: video._id,
          views,
          likes
        });
        console.log(`Updated metrics for video: ${video.title}`);
      }
    } catch (error) {
      console.error(`Automation Error for ${video.title}:`, error.message);
    }
  }

  async syncAllVideos(channelId) {
    const videos = await Video.find({ channelId, status: 'Posted' });
    for (const video of videos) {
      await this.updateVideoMetrics(video);
    }
  }
}

module.exports = new AutomationService();

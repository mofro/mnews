import { redisClient } from '@/lib/redisClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get all keys matching the newsletter pattern
    const keys = await redisClient.keys('newsletter:*');
    
    // Get the first few keys with their values for inspection
    const sampleData = [];
    for (let i = 0; i < Math.min(5, keys.length); i++) {
      const key = keys[i];
      const data = await redisClient.hgetall(key);
      sampleData.push({
        key,
        type: 'hash',
        fields: Object.keys(data),
        // Don't include actual content to keep response small
        hasContent: !!(data.content || data.rawContent || data.cleanContent)
      });
    }

    res.status(200).json({
      success: true,
      totalKeys: keys.length,
      sampleData
    });
  } catch (error) {
    console.error('Error fetching Redis keys:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching Redis data',
      error: error.message
    });
  }
}

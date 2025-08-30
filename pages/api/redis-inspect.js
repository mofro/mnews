import { redisClient } from '@/lib/redisClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get all keys
    const keys = await redisClient.keys('*');
    
    // Get the type of each key and a sample of its data
    const keyInfo = [];
    
    for (const key of keys.slice(0, 5)) { // Limit to first 5 keys
      try {
        const type = await redisClient.type(key);
        let sample;
        
        switch (type) {
          case 'string':
            sample = await redisClient.get(key);
            break;
          case 'hash':
            sample = await redisClient.hgetall(key);
            break;
          case 'list':
            sample = await redisClient.lrange(key, 0, 2); // First 3 items
            break;
          case 'set':
            sample = await redisClient.smembers(key);
            break;
          case 'zset':
            sample = await redisClient.zrange(key, 0, 2); // First 3 items
            break;
          default:
            sample = 'Unknown type';
        }
        
        keyInfo.push({
          key,
          type,
          ttl: await redisClient.ttl(key),
          sample: JSON.stringify(sample).substring(0, 200) // Truncate sample
        });
      } catch (error) {
        keyInfo.push({
          key,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      totalKeys: keys.length,
      keyInfo
    });
  } catch (error) {
    console.error('Error inspecting Redis:', error);
    res.status(500).json({
      success: false,
      message: 'Error inspecting Redis',
      error: error.message
    });
  }
}

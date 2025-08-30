import { NextApiRequest, NextApiResponse } from 'next';
import { getRedisClient } from '@/lib/redisClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const redis = getRedisClient();
    
    // Get all keys
    const keys = await redis.keys('*');
    
    // Get type for each key
    const keyTypes = await Promise.all(keys.map(async (key: string) => {
      const type = await redis.type(key);
      return { key, type };
    }));
    
    return res.status(200).json({ keys: keyTypes });
  } catch (error) {
    console.error('Error in redis-list-keys API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

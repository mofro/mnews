import { NextApiRequest, NextApiResponse } from 'next';
import { getRedisClient } from '@/lib/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Article ID is required' });
  }

  try {
    const redis = getRedisClient();
    const articleData = await redis.hgetall(`article:${id}`);
    
    if (!articleData || Object.keys(articleData).length === 0) {
      return res.status(404).json({ message: 'Article not found' });
    }

    return res.status(200).json({
      id,
      content: articleData.content || articleData.cleanContent || '',
      rawContent: articleData.rawContent || '',
      cleanContent: articleData.cleanContent || '',
      // Include other fields as needed
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    return res.status(500).json({ 
      message: 'Error fetching article', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

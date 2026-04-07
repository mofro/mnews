import { NextApiRequest, NextApiResponse } from 'next';
import { redisClient } from '@/lib/redisClient';
import logger from '@/utils/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'Invalid newsletter ID' });
  }

  try {
    const rawId = id.replace(/^newsletter:/, '');

    await Promise.all([
      redisClient.lrem('newsletter_ids', 0, rawId),
      redisClient.client.del(`newsletter:${rawId}`),
      redisClient.client.del(`newsletter:meta:${rawId}`),
      redisClient.client.del(`newsletter:content:${rawId}`),
      redisClient.client.del(`newsletter:summary:${rawId}`),
    ]);

    logger.info(`Deleted newsletter ${rawId}`);
    return res.status(204).end();
  } catch (error) {
    logger.error('Error deleting newsletter:', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

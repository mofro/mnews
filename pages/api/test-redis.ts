import { NextApiRequest, NextApiResponse } from 'next';
import { testRedisConnection } from '@/lib/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const connectionTest = await testRedisConnection();
    
    // Don't expose sensitive information in the response
    const response = {
      success: connectionTest.success,
      pingTime: connectionTest.pingTime,
      message: connectionTest.success 
        ? 'Successfully connected to Redis' 
        : 'Failed to connect to Redis',
      // Only include error details in development
      ...(process.env.NODE_ENV === 'development' && { 
        error: connectionTest.error,
        connectionUrl: connectionTest.success ? 'Connected successfully' : 'Connection failed'
      })
    };

    return res.status(connectionTest.success ? 200 : 500).json(response);
  } catch (error) {
    console.error('Error testing Redis connection:', error);
    return res.status(500).json({
      success: false,
      message: 'Error testing Redis connection',
      ...(process.env.NODE_ENV === 'development' && {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    });
  }
}

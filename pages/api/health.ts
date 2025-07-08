import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasRedisUrl: !!process.env.KV_REST_API_URL,
    hasRedisToken: !!process.env.KV_REST_API_TOKEN,
    version: process.env.npm_package_version || 'unknown'
  };

  res.status(200).json(health);
}

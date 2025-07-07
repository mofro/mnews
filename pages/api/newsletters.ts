import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

// Initialize Redis connection
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface Newsletter {
  id: string;
  subject: string;
  body: string;
  from: string;
  date: string;
  isNew: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get all newsletter IDs from Redis list
    const newsletterIds = await redis.lrange('newsletter_ids', 0, -1) as string[];
    
    console.log('Found newsletter IDs:', newsletterIds);

    // Fetch all newsletters
    const newsletters: Newsletter[] = [];
    
    for (const id of newsletterIds) {
      const newsletter = await redis.get(`newsletter:${id}`) as Newsletter;
      if (newsletter) {
        newsletters.push(newsletter);
      }
    }

    // Sort by date (newest first)
    newsletters.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`Returning ${newsletters.length} newsletters`);

    res.status(200).json(newsletters);

  } catch (error) {
    console.error('Error fetching newsletters:', error);
    res.status(500).json({ message: 'Error fetching newsletters' });
  }
}
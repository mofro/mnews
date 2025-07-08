import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

// Initialize Redis connection using existing KV variables
if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  throw new Error('Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN');
}

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

interface Newsletter {
  id: string;
  subject: string;
  content: string;    // ← Changed from "body"
  sender: string;     // ← Changed from "from"
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

    // Calculate stats
    const today = new Date().toISOString().split('T')[0];
    const todayCount = newsletters.filter(n => n.date.startsWith(today)).length;
    const uniqueSenders = new Set(newsletters.map(n => n.sender)).size;

    const stats = {
      totalNewsletters: newsletters.length,
      todayCount,
      uniqueSenders
    };

    console.log(`Returning ${newsletters.length} newsletters with stats`);

    // Return in the format the frontend expects
    res.status(200).json({
      newsletters,
      stats
    });

  } catch (error) {
    console.error('Error fetching newsletters:', error);
    res.status(500).json({ message: 'Error fetching newsletters' });
  }
}
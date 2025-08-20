import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';
// Use a relative path to the logger
const logger = {
  log: (...args: any[]) => console.log(...args),
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args),
  info: (...args: any[]) => console.info(...args),
  debug: (...args: any[]) => console.debug(...args)
};

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
  content: string;
  sender: string;
  date: string;
  isNew: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    logger.info('Starting date fix migration...');
    
    // Get all newsletter IDs from Redis list
    const newsletterIds = await redis.lrange('newsletter_ids', 0, -1) as string[];
    
    let fixedCount = 0;
    const totalCount = newsletterIds.length;
    
    for (const id of newsletterIds) {
      const newsletter = await redis.get(`newsletter:${id}`) as Newsletter;
      if (newsletter) {
        // Check if date is valid
        const dateTest = new Date(newsletter.date);
        if (isNaN(dateTest.getTime())) {
          logger.info(`Fixing invalid date for newsletter ${id}: ${newsletter.date}`);
          
          // Fix the date - use current time as fallback
          newsletter.date = new Date().toISOString();
          
          // Save back to Redis
          await redis.set(`newsletter:${id}`, newsletter);
          fixedCount++;
        }
      }
    }

    logger.info(`Date fix complete. Fixed ${fixedCount} out of ${totalCount} newsletters.`);
    
    res.status(200).json({
      message: 'Date fix migration completed',
      totalNewsletters: totalCount,
      fixedCount: fixedCount
    });

  } catch (error) {
    logger.error('Error during date fix migration:', error);
    res.status(500).json({ message: 'Error during date fix migration' });
  }
}

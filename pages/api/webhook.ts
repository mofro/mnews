import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

// Initialize Redis connection using existing KV variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
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
    // Extract newsletter data from request
    const { subject, body, from, date } = req.body;
    
    console.log('Newsletter received:', { subject, from, date });

    // Create newsletter object
    const newsletter: Newsletter = {
      id: Date.now().toString(),
      subject: subject || 'No Subject',
      body: body || '',
      from: from || 'Unknown Sender',
      date: date || new Date().toISOString(),
      isNew: true,
    };

    // Store in Redis
    // Use a Redis list to store newsletter IDs
    await redis.lpush('newsletter_ids', newsletter.id);
    
    // Store the full newsletter data
    await redis.set(`newsletter:${newsletter.id}`, newsletter);

    console.log('Newsletter saved to Redis:', newsletter.id);

    res.status(200).json({ 
      message: 'Newsletter received and saved',
      id: newsletter.id 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
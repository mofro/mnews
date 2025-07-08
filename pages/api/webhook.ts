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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Extract newsletter data from request
    const { subject, body, from, date } = req.body;
    
    console.log('Newsletter received:', { subject, from, date });

    // Normalize and validate date
    const normalizeDate = (dateInput: any): string => {
      if (!dateInput) {
        return new Date().toISOString();
      }
      
      try {
        const parsedDate = new Date(dateInput);
        if (isNaN(parsedDate.getTime())) {
          console.warn('Invalid date received:', dateInput);
          return new Date().toISOString();
        }
        return parsedDate.toISOString();
      } catch (error) {
        console.warn('Error parsing date:', dateInput, error);
        return new Date().toISOString();
      }
    };

    // Create newsletter object
    const newsletter: Newsletter = {
      id: Date.now().toString(),
      subject: subject || 'No Subject',
      content: body || '',              // ← Changed "body" to "content"
      sender: from || 'Unknown Sender', // ← Changed "from" to "sender"
      date: normalizeDate(date),
      isNew: true,
    };

    // Store in Redis with detailed logging
    console.log('About to save newsletter:', newsletter);
    
    // Use a Redis list to store newsletter IDs
    console.log('Saving newsletter ID to list...');
    const listResult = await redis.lpush('newsletter_ids', newsletter.id);
    console.log('List push result:', listResult);
    
    // Store the full newsletter data
    console.log('Saving newsletter data...');
    const setResult = await redis.set(`newsletter:${newsletter.id}`, newsletter);
    console.log('Set result:', setResult);

    // Verify the data was saved
    console.log('Verifying saved data...');
    const savedData = await redis.get(`newsletter:${newsletter.id}`);
    console.log('Retrieved data:', savedData);

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

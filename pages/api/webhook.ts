import { NextApiRequest, NextApiResponse } from 'next';
import { Redis } from '@upstash/redis';

// Initialize Redis connection using existing KV variables
if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  throw new Error('Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN');
}

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

// Simple HTML to text converter
function htmlToText(html: string): string {
  if (!html) return '';
  
  // Remove HTML tags (ES2017 compatible)
  let text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n') // Normalize line breaks
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple line breaks
    .replace(/[ \t]{2,}/g, ' ') // Collapse multiple spaces
    .trim();
  
  return text;
}

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Extract newsletter data from request
    const { subject, body, from, date } = req.body;
    
    console.log('Newsletter received:', { subject, from, date });

    // Clean up the email content
    const cleanContent = htmlToText(body || '');
    console.log('Content cleaned, length:', cleanContent.length);

    // Create newsletter object
    const newsletter: Newsletter = {
      id: Date.now().toString(),
      subject: subject || 'No Subject',
      content: cleanContent,              
      sender: from || 'Unknown Sender', 
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
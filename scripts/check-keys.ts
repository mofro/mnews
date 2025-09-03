import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
const envPath = join(__dirname, '..', '.env.local');
const envFile = readFileSync(envPath, 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) {
    acc[key] = value.replace(/["']/g, '');
  }
  return acc;
}, {} as Record<string, string>);

const redis = new Redis({
  url: envVars.KV_REST_API_URL,
  token: envVars.KV_REST_API_TOKEN,
});

async function checkKeys() {
  try {
    // Check all keys
    const allKeys = await redis.keys('*');
    console.log('All keys:', allKeys);
    
    // Check newsletter keys
    const newsletterKeys = await redis.keys('newsletter*');
    console.log('Newsletter keys:', newsletterKeys);
    
    // Check a sample key
    if (newsletterKeys.length > 0) {
      const sampleKey = newsletterKeys[0];
      const type = await redis.type(sampleKey);
      console.log(`Type of ${sampleKey}:`, type);
      
      if (type === 'hash') {
        const data = await redis.hgetall(sampleKey);
        console.log('Sample data:', data);
      } else if (type === 'string') {
        const data = await redis.get(sampleKey);
        console.log('Sample data:', data);
      }
    }
    
    // Check newsletter IDs list
    const newsletterIds = await redis.lrange('newsletter_ids', 0, -1);
    console.log('Newsletter IDs:', newsletterIds);
    
  } catch (error) {
    console.error('Error checking keys:', error);
  } finally {
    process.exit(0);
  }
}

checkKeys();

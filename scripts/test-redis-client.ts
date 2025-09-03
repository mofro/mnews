import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Check if environment variables are set
const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  console.error('Error: Missing required environment variables');
  process.exit(1);
}

async function testRedisClient() {
  try {
    console.log('Testing Redis client...');
    
    // Create a test key
    const testKey = 'test:connection';
    const testValue = { message: 'Hello, Redis!', timestamp: new Date().toISOString() };
    
    // Set a test value
    await redis.set(testKey, JSON.stringify(testValue));
    console.log('Successfully set test value in Redis');
    
    // Get the test value
    const retrievedValue = await redis.get(testKey);
    console.log('Retrieved value from Redis:', retrievedValue);
    
    // Clean up
    await redis.del(testKey);
    console.log('Cleaned up test key');
    
    // Test getting a newsletter
    const newsletterKey = 'newsletter:1752026479005'; // From our previous test
    const newsletter = await redis.get(newsletterKey);
    console.log('Sample newsletter data:', newsletter ? 'Found' : 'Not found');
    
    if (newsletter) {
      try {
        const newsletterData = typeof newsletter === 'string' ? JSON.parse(newsletter) : newsletter;
        console.log('Newsletter subject:', newsletterData.subject || 'No subject');
        console.log('Newsletter sender:', newsletterData.sender || 'No sender');
        console.log('Newsletter date:', newsletterData.date || 'No date');
      } catch (parseError) {
        console.error('Error parsing newsletter data:', parseError);
        console.log('Raw newsletter data:', newsletter);
      }
    }
    
  } catch (error) {
    console.error('Error testing Redis client:', error);
  } finally {
    process.exit(0);
  }
}

// Create Redis client
console.log('Creating Redis client with URL:', url);
const redis = new Redis({
  url,
  token,
});

testRedisClient();

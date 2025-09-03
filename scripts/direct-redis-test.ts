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
  console.log('KV_REST_API_URL:', url ? 'Set' : 'Not set');
  console.log('KV_REST_API_TOKEN:', token ? 'Set' : 'Not set');
  process.exit(1);
}

// Create Redis client directly
console.log('Creating Redis client with URL:', url);
const redis = new Redis({
  url,
  token,
});

// Test connection
async function testConnection() {
  try {
    console.log('Testing Redis connection...');
    const ping = await redis.ping();
    console.log('Redis ping response:', ping);
    
    // Try to get some keys
    const keys = await redis.keys('*');
    console.log(`Found ${keys.length} keys in Redis`);
    
    if (keys.length > 0) {
      console.log('First 5 keys:', keys.slice(0, 5));
      
      // Try to get the first key's value
      const firstKey = keys[0];
      const value = await redis.get(firstKey);
      console.log(`Value for key '${firstKey}':`, 
        typeof value === 'string' ? value.substring(0, 100) + '...' : value);
    }
    
  } catch (error) {
    console.error('Redis connection error:', error);
  } finally {
    process.exit(0);
  }
}

testConnection();

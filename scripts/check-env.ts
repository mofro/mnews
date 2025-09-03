import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
console.log(`Loading environment from: ${envPath}`);

dotenv.config({ path: envPath });

// Check if environment variables are loaded
console.log('Environment variables:');
console.log(`KV_REST_API_URL: ${process.env.KV_REST_API_URL ? 'Set' : 'Not set'}`);
console.log(`KV_REST_API_TOKEN: ${process.env.KV_REST_API_TOKEN ? 'Set' : 'Not set'}`);

// Show the first few characters of the token for verification (but not the whole thing)
if (process.env.KV_REST_API_TOKEN) {
  const token = process.env.KV_REST_API_TOKEN;
  console.log(`Token starts with: ${token.substring(0, 5)}...`);
}

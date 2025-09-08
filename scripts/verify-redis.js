import { createClient } from "redis";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Create Redis client
const client = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Connect to Redis
await client.connect();

// Get all newsletter IDs
const newsletterIds = await client.lRange("newsletter_ids", 0, -1);
console.log(`Found ${newsletterIds.length} newsletters`);

if (newsletterIds.length > 0) {
  // Get the most recent newsletter
  const latestId = newsletterIds[0];
  console.log("\nLatest newsletter ID:", latestId);

  // Get the newsletter data
  const newsletterData = await client.get(`newsletter:${latestId}`);
  const newsletterMeta = await client.hGetAll(`newsletter:meta:${latestId}`);

  console.log("\nNewsletter Data:");
  console.log(JSON.stringify(JSON.parse(newsletterData), null, 2));

  console.log("\nNewsletter Metadata:");
  console.log(JSON.stringify(newsletterMeta, null, 2));

  // Parse and display the metadata JSON fields
  if (newsletterMeta.metadata) {
    try {
      console.log("\nParsed Metadata:");
      console.log(JSON.stringify(JSON.parse(newsletterMeta.metadata), null, 2));
    } catch (e) {
      console.error("Error parsing metadata JSON:", e);
    }
  }

  // Get the first few lines of content for preview
  if (newsletterData) {
    const content = JSON.parse(newsletterData).content || "";
    console.log("\nContent Preview:");
    console.log(content.substring(0, 200) + "...");
  }
} else {
  console.log("No newsletters found in Redis");
}

// Close the connection
await client.quit();

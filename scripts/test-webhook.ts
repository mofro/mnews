import dotenv from "dotenv";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Webhook URL
const WEBHOOK_URL = "http://localhost:3000/api/webhook";

// Sample newsletter data
const sampleNewsletter = {
  subject: "Test Newsletter - " + new Date().toISOString(),
  from: "test@example.com",
  date: new Date().toISOString(),
  body: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Newsletter</title>
      <style>
        .header { color: #333; font-family: Arial, sans-serif; }
        .content { margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Test Newsletter</h1>
        <p>This is a test newsletter sent to verify the webhook functionality.</p>
      </div>
      <div class="content">
        <p>Here is some sample content with a <a href="https://example.com">link</a>.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      </div>
    </body>
    </html>
  `,
};

async function testWebhook() {
  try {
    console.log("Sending test newsletter to webhook...");

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sampleNewsletter),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Webhook test successful!");
      console.log("Newsletter ID:", data.id);
      return data.id;
    } else {
      console.error("❌ Webhook test failed:", data);
      return null;
    }
  } catch (error) {
    console.error("❌ Error testing webhook:", error);
    return null;
  }
}

// Run the test
testWebhook().then((id) => {
  if (id) {
    console.log(`\nTo verify in Redis, run:`);
    console.log(`  redis-cli get newsletter:${id}`);
    console.log(`  redis-cli hgetall newsletter:meta:${id}`);
  }
});

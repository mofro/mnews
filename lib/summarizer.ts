import Anthropic from "@anthropic-ai/sdk";
import { redisClient } from "@/lib/redisClient";
import logger from "@/utils/logger";

const SUMMARY_PREFIX = "newsletter:summary:";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export async function summarizeNewsletter(
  id: string,
  subject: string,
  textContent: string
): Promise<string | null> {
  const anthropic = getClient();
  if (!anthropic) {
    logger.warn("ANTHROPIC_API_KEY not set — skipping summarization");
    return null;
  }

  const snippet = textContent.substring(0, 2000);
  const model = process.env.SUMMARY_MODEL ?? DEFAULT_MODEL;

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 256,
      system:
        "You are a concise newsletter summarizer. Write 2–3 sentences that capture the key points of the newsletter. Be direct and informative.",
      messages: [
        {
          role: "user",
          content: `Subject: ${subject}\n\n${snippet}`,
        },
      ],
    });

    const summary =
      message.content[0].type === "text" ? message.content[0].text.trim() : null;

    if (summary) {
      await redisClient.set(`${SUMMARY_PREFIX}${id}`, summary);
      logger.info(`Summary stored for newsletter ${id}`);
    }

    return summary;
  } catch (error) {
    logger.error(`Failed to summarize newsletter ${id}:`, error);
    return null;
  }
}

export async function getSummary(id: string): Promise<string | null> {
  try {
    return await redisClient.get<string>(`${SUMMARY_PREFIX}${id}`);
  } catch (error) {
    logger.error(`Failed to get summary for newsletter ${id}:`, error);
    return null;
  }
}

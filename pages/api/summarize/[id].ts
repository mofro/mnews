import { NextApiRequest, NextApiResponse } from "next";
import { redisClient } from "@/lib/redisClient";
import { summarizeNewsletter, getSummary } from "@/lib/summarizer";
import logger from "@/utils/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: "Invalid newsletter ID" });
  }

  if (req.method === "GET") {
    const summary = await getSummary(id);
    if (!summary) return res.status(404).json({ message: "No summary found" });
    return res.status(200).json({ summary });
  }

  if (req.method === "POST") {
    try {
      // Load the newsletter content to summarize
      const rawId = id.replace(/^newsletter:/, "");
      const data = await redisClient.get<string>(`newsletter:${rawId}`);
      if (!data) return res.status(404).json({ message: "Newsletter not found" });

      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      const textContent: string =
        parsed.textContent ||
        (parsed.cleanContent ?? parsed.content ?? "").replace(/<[^>]*>/g, " ");
      const subject: string = parsed.subject ?? "";

      const summary = await summarizeNewsletter(rawId, subject, textContent);
      if (!summary) {
        return res.status(503).json({
          message: "Summarization unavailable — check ANTHROPIC_API_KEY",
        });
      }

      return res.status(200).json({ summary });
    } catch (error) {
      logger.error("Error in summarize endpoint:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}

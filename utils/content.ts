// Content processing utilities
import { cleanNewsletterContent } from "../lib/cleaners/contentCleaner";
import logger from "./logger";

export interface ProcessNewsletterContentOptions {
  cleanHtml?: boolean;
  generateText?: boolean;
  generatePreview?: boolean;
  previewLength?: number;
}

export interface ProcessedNewsletterContent {
  cleanContent: string;
  textContent?: string;
  previewText?: string;
  wordCount?: number;
}

/**
 * Processes newsletter content to generate clean HTML, plain text, and preview text
 * @param content The raw newsletter content to process
 * @param options Processing options
 * @returns Processed content with clean HTML, text, and preview
 */
export function processNewsletterContent(
  content: string,
  options: ProcessNewsletterContentOptions = {},
): ProcessedNewsletterContent {
  const {
    cleanHtml = true,
    generateText = true,
    generatePreview = true,
    previewLength = 200,
  } = options;

  const result: ProcessedNewsletterContent = {
    cleanContent: content,
  };

  try {
    // Clean HTML content if requested
    if (cleanHtml && content) {
      const { cleanedContent } = cleanNewsletterContent(content);
      result.cleanContent = cleanedContent;
    }

    // Generate plain text version if requested
    if (generateText) {
      result.textContent = htmlToText(result.cleanContent);
      result.wordCount = countWords(result.textContent);
    }

    // Generate preview text if requested and we have text content
    if (generatePreview && result.textContent) {
      result.previewText = generatePreviewText(
        result.textContent,
        previewLength,
      );
    }
  } catch (error) {
    logger.error("Error processing newsletter content:", error);
    // Return the best available content even if some processing failed
  }

  return result;
}

/**
 * Converts HTML to plain text
 * @param html HTML content to convert
 * @returns Plain text version of the HTML
 */
function htmlToText(html: string): string {
  if (!html) return "";

  // Create a temporary div element
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // Get text content and normalize whitespace
  let text = temp.textContent || temp.innerText || "";

  // Normalize whitespace and clean up
  text = text
    .replace(/\s+/g, " ") // Replace all whitespace sequences with a single space
    .replace(/\n\s*\n/g, "\n\n") // Preserve paragraph breaks
    .trim();

  return text;
}

/**
 * Generates a preview text from content
 * @param text The full text to generate a preview from
 * @param maxLength Maximum length of the preview
 * @returns Preview text
 */
function generatePreviewText(text: string, maxLength: number = 200): string {
  if (!text) return "";

  // Truncate to max length, ensuring we don't cut words in the middle
  if (text.length <= maxLength) return text;

  // Find the last space before maxLength
  const lastSpace = text.lastIndexOf(" ", maxLength);
  const preview = text
    .substring(0, lastSpace > 0 ? lastSpace : maxLength)
    .trim();

  // Add ellipsis if we truncated the text
  return preview + (text.length > maxLength ? "..." : "");
}

/**
 * Counts the number of words in a text
 * @param text The text to count words in
 * @returns Number of words
 */
function countWords(text: string): number {
  if (!text) return 0;

  // Split by whitespace and filter out empty strings
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  return words.length;
}

const contentUtils = {
  processNewsletterContent,
  htmlToText,
  generatePreviewText,
  countWords,
};

/**
 * Redis schema constants for the application
 */

export const SCHEMA = {
  // Key prefixes
  NEWSLETTER_PREFIX: "newsletter:",
  META_PREFIX: "newsletter:meta:",
  CONTENT_PREFIX: "newsletter:content:",

  // Sorted sets and lists
  NEWSLETTER_IDS_KEY: "newsletter:ids",

  // Hash fields
  METADATA_FIELDS: {
    ID: "id",
    SUBJECT: "subject",
    FROM: "from",
    SENDER: "sender",
    DATE: "date",
    SUMMARY: "summary",
    CONTENT: "content",
    CLEAN_CONTENT: "cleanContent",
    RAW_CONTENT: "rawContent",
    HAS_FULL_CONTENT: "hasFullContent",
    METADATA: "metadata",
    TAGS: "tags",
    READ: "read",
    ARCHIVED: "archived",
    COMPRESSION_RATIO: "compressionRatio",
  },
} as const;

export default SCHEMA;

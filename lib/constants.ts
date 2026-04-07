/**
 * Redis schema constants for the application
 */

export const SCHEMA = {
  // Key prefixes
  NEWSLETTER_PREFIX: "newsletter:",
  META_PREFIX: "newsletter:meta:",
  CONTENT_PREFIX: "newsletter:content:",
  SUMMARY_PREFIX: "newsletter:summary:",

  // Sorted sets and lists
  NEWSLETTER_IDS_KEY: "newsletter:ids",

  // Meta hash field names (used when reading/writing newsletter:meta:{id})
  META_FIELDS: {
    TOPICS: "topics",
    SUMMARY: "summary",
    IS_READ: "isRead",
    IS_ARCHIVED: "isArchived",
    RECEIVED_AT: "receivedAt",
    WORD_COUNT: "wordCount",
    TAGS: "tags",
    PREVIEW: "preview",
  },

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

/**
 * Types and interfaces for newsletter content handling
 */

/**
 * Represents the content of a newsletter in its various forms
 */
export interface NewsletterContent {
  /**
   * The original, unmodified content as received from the source.
   * May contain HTML, plain text, or other formats.
   */
  rawContent: string;

  /**
   * Processed and sanitized HTML content ready for display.
   * Should be safe to render directly in the browser.
   */
  cleanContent: string;

  /**
   * Plain text version of the content, used for search and previews.
   * All HTML tags and special formatting should be removed.
   */
  textContent: string;

  /**
   * @deprecated Use cleanContent instead.
   * Kept for backward compatibility during migration.
   */
  content?: string;
}

/**
 * Metadata about a newsletter
 */
export interface NewsletterMetadata {
  /** Unique identifier for the newsletter */
  id: string;

  /** Sender's name or email address */
  sender: string;

  /** Newsletter subject line */
  subject: string;

  /** When the newsletter was received (ISO 8601 format) */
  receivedAt: string;

  /** Whether the newsletter has been marked as read */
  isRead: boolean;

  /** Whether the newsletter has been archived */
  isArchived: boolean;

  /** When the newsletter was last accessed (ISO 8601 format) */
  lastAccessedAt: string | null;

  /** Optional tags for categorization */
  tags?: string[];
}

/**
 * Complete newsletter object combining content and metadata
 */
export interface Newsletter extends NewsletterContent, NewsletterMetadata {
  /** URL of the newsletter if available */
  url?: string;
}

/**
 * Options for processing newsletter content
 */
export interface ProcessContentOptions {
  /** Whether to preserve HTML tags in the output */
  preserveHtml?: boolean;

  /** Maximum length for generated excerpts */
  maxExcerptLength?: number;

  /** Whether to generate a plain text version */
  generateText?: boolean;
}

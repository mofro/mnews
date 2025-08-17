/**
 * Truncates text to a specified length and adds an ellipsis if needed
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 20)
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength = 20): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength).trim()}...`;
};

/**
 * Truncates text in the middle if it exceeds maxLength
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 20)
 * @returns Truncated text with ellipsis in the middle if needed
 */
export const truncateMiddle = (text: string, maxLength = 20): string => {
  if (!text || text.length <= maxLength) return text;
  const charsToShow = maxLength - 3; // Account for the ellipsis
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  return `${text.substring(0, frontChars)}...${text.substring(text.length - backChars)}`;
};

/**
 * Extracts and cleans preview text from HTML content
 * @param html - The HTML content to process
 * @returns Object containing cleaned content and extracted preview text
 */
export const extractPreviewText = (html: string): { cleanedContent: string; previewText: string | null } => {
  if (!html) return { cleanedContent: html, previewText: null };
  
  // Pattern to match preview divs with various class names and hidden styles
  const previewPattern = /<div[^>]*(?:class\s*=\s*["'][^"']*preview[^"']*["']|style\s*=\s*["'][^"']*display\s*:\s*none[^"']*["'])[^>]*>([\s\S]*?)<\/div>/gi;
  
  let cleanedContent = html;
  let previewText = null;
  let match;
  
  // Find and process all preview divs
  while ((match = previewPattern.exec(html)) !== null) {
    const fullMatch = match[0];
    const content = match[1] || '';
    
    // Clean the preview text content
    const cleanText = content
      .replace(/&[^;]+;/g, ' ') // Replace HTML entities with spaces
      .replace(/\s+/g, ' ')     // Collapse multiple spaces
      .trim();
    
    // If we find meaningful text in the preview, keep the first one
    if (cleanText && cleanText.length > 10 && !previewText) {
      previewText = cleanText;
    }
    
    // Remove the preview div from content
    cleanedContent = cleanedContent.replace(fullMatch, '');
  }
  
  return { cleanedContent, previewText };
};

/**
 * Removes common preview padding patterns from text
 * @param text - The text to clean
 * @returns Cleaned text with preview padding removed
 */
export const removePreviewPadding = (text: string | null | undefined): string => {
  if (!text) return '';
  
  // Common preview padding patterns (HTML entities and spaces)
  const previewPatterns = [
    /(&#847;|&[^;]+;|\s)+/g,  // Common preview padding patterns
    /^[\s\u200B\u200C\u200D\uFEFF]+/, // Leading whitespace and zero-width spaces
    /[\s\u200B\u200C\u200D\uFEFF]+$/, // Trailing whitespace and zero-width spaces
  ];
  
  return previewPatterns.reduce((str, pattern) => str.replace(pattern, ' '), text).trim();
};

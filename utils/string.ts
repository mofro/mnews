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

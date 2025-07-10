import { parseISO, isValid } from 'date-fns';

/**
 * Generic date parsing service with validation and error handling
 */

interface DateParseOptions {
  /** What to do when date parsing fails */
  fallbackBehavior: 'current-date' | 'null' | 'throw';
  /** Whether to log warnings for invalid dates */
  logWarnings: boolean;
}

const defaultOptions: DateParseOptions = {
  fallbackBehavior: 'current-date',
  logWarnings: true
};

/**
 * Safely parses a date string into a Date object
 * 
 * @param dateString - The date string to parse
 * @param options - Configuration options
 * @returns A Date object or fallback value based on options
 */
export function parseDate(dateString: string | null | undefined, options: Partial<DateParseOptions> = {}): Date | null {
  const config = { ...defaultOptions, ...options };
  
  if (!dateString) {
    if (config.logWarnings) {
      console.warn('Empty date string provided');
    }
    return handleFallback(config, 'empty input');
  }
  
  try {
    // First try with parseISO which is stricter and handles ISO format better
    const parsedWithISO = parseISO(dateString);
    
    if (isValid(parsedWithISO)) {
      return parsedWithISO;
    }
    
    // If parseISO fails, try with the Date constructor which is more forgiving
    const parsedWithConstructor = new Date(dateString);
    
    if (isValid(parsedWithConstructor)) {
      return parsedWithConstructor;
    }
    
    if (config.logWarnings) {
      console.warn('Invalid date string:', dateString);
    }
    
    return handleFallback(config, 'invalid date');
  } catch (error) {
    if (config.logWarnings) {
      console.warn('Error parsing date:', dateString, error);
    }
    
    return handleFallback(config, 'parsing error');
  }
}

/**
 * Safely parses a date string and returns an ISO string
 * 
 * @param dateString - The date string to parse
 * @param options - Configuration options
 * @returns An ISO string or fallback value based on options
 */
export function parseDateToISOString(dateString: string | null | undefined, options: Partial<DateParseOptions> = {}): string | null {
  const date = parseDate(dateString, options);
  return date ? date.toISOString() : null;
}

/**
 * Handles fallback behavior based on configuration
 */
function handleFallback(options: DateParseOptions, reason: string): Date | null {
  switch (options.fallbackBehavior) {
    case 'current-date':
      return new Date();
    case 'null':
      return null;
    case 'throw':
      throw new Error(`Date parsing failed: ${reason}`);
    default:
      return new Date();
  }
}

/**
 * Checks if a date is today
 * 
 * @param dateString - The date string to check
 * @returns Boolean indicating if the date is today
 */
export function isDateToday(dateString: string | null | undefined): boolean {
  const date = parseDate(dateString);
  if (!date) return false;
  
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Formats a date string safely with a fallback
 * 
 * @param dateString - The date string to format
 * @param formatter - Function to format the date
 * @param fallback - Value to return if parsing fails
 * @returns Formatted date string or fallback
 */
export function formatDateSafely<T>(
  dateString: string | null | undefined, 
  formatter: (date: Date) => T,
  fallback: T,
  options: Partial<DateParseOptions> = {}
): T {
  const date = parseDate(dateString, options);
  return date ? formatter(date) : fallback;
}

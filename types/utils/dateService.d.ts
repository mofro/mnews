interface DateParseOptions {
  /** What to do when date parsing fails */
  fallbackBehavior: "current-date" | "null" | "throw";
  /** Whether to log warnings for invalid dates */
  logWarnings: boolean;
}

declare module "@/utils/dateService" {
  export function parseDate(
    dateString: string | null | undefined,
    options?: Partial<DateParseOptions>,
  ): Date | null;
  export function parseDateToISOString(
    dateString: string | null | undefined,
    options?: Partial<DateParseOptions>,
  ): string | null;
  export function isDateToday(dateString: string | null | undefined): boolean;
  export function formatDateSafely<T>(
    dateString: string | null | undefined,
    formatter: (date: Date) => T,
    fallback: T,
    options?: Partial<DateParseOptions>,
  ): T;
}

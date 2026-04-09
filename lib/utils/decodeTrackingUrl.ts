/**
 * Decode a tracking/redirect URL to its real destination.
 *
 * Handles two common patterns:
 *   1. Path-encoded  — tracker.com/PATH/https:%2F%2Freal.com/...
 *      (used by TLDR, many ESPs that embed the destination in the path)
 *   2. Query-param   — tracker.com?url=https%3A%2F%2Freal.com
 *      (used by some click-tracking services)
 *
 * Returns the original URL unchanged if no real URL can be extracted,
 * so it is always safe to call even on non-tracking links.
 */
export function decodeTrackingUrl(url: string): string {
  if (!url || !/^https?:\/\//i.test(url)) return url;

  try {
    const parsed = new URL(url);

    // 1. Check each path segment for a percent-encoded URL
    for (const segment of parsed.pathname.split("/")) {
      if (!segment) continue;
      try {
        const decoded = decodeURIComponent(segment);
        if (/^https?:\/\//i.test(decoded)) return decoded;
      } catch {
        // segment wasn't valid percent-encoding — skip
      }
    }

    // 2. Check common query-param names for an embedded URL
    const URL_PARAMS = [
      "url",
      "redirectUrl",
      "redirect_url",
      "redirect",
      "to",
      "dest",
      "destination",
      "link",
      "target",
      "u",
      "c",
    ];
    for (const param of URL_PARAMS) {
      const value = parsed.searchParams.get(param);
      if (value && /^https?:\/\//i.test(value)) return value;
    }
  } catch {
    // URL constructor threw — return original
  }

  return url;
}

import { createHash } from "crypto";

export function webhookFingerprint(
  from: string,
  subject: string,
  body: string,
): string {
  const normalizedFrom = (from || "").trim().toLowerCase();
  const normalizedSubject = (subject || "").trim();
  const rawBody = body || "";
  return createHash("sha256")
    .update(`${normalizedFrom}\n${normalizedSubject}\n${rawBody}`)
    .digest("hex")
    .slice(0, 32);
}

export const FINGERPRINT_KEY_PREFIX = "newsletter:fingerprint:";

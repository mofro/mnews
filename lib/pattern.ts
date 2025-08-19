import { Redis } from '@upstash/redis';

/**
 * Feature-flag gate: enable by setting PATTERN_SYSTEM_ENABLED=true in env.
 * Phase-0 implementation only loads metadata and records usage; the parser
 * will call these helpers once hooked up in Phase-1.
 */
const PATTERN_SYSTEM_ENABLED = process.env.PATTERN_SYSTEM_ENABLED === 'true';

// Fallbacks avoid runtime crashes even if Redis vars are missing in dev.
const redis = PATTERN_SYSTEM_ENABLED
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

export interface PatternConfig {
  // placeholder – will be expanded in later phases
  filters?: Record<string, unknown>;
}

export interface LoadedPattern {
  version: string;
  config: PatternConfig;
}

const DEFAULT_PATTERN: LoadedPattern = {
  version: 'default',
  config: {},
};

/**
 * Resolve the currently promoted pattern version for a domain and fetch its
 * JSON config.  If the pattern system is disabled or keys are missing, we
 * return the DEFAULT_PATTERN so the caller can proceed unaffected.
 */
export async function loadCurrentPattern(domain: string): Promise<LoadedPattern> {
  if (!PATTERN_SYSTEM_ENABLED || !redis) return DEFAULT_PATTERN;

  try {
    const version =
      (await redis.get<string>(`PATTERN_CURRENT:${domain}`)) || 'default';
    const key = `PATTERN:${domain}:${version}`;
    const config = ((await redis.get(key)) as PatternConfig) || {};

    return { version, config };
  } catch (err) {
    // Log and fall back silently – we must never break parsing.
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[pattern] load error', domain, err);
    }
    return DEFAULT_PATTERN;
  }
}

/**
 * Increment a usage counter for analytics / pruning.  No-op if feature disabled.
 */
export async function recordPatternUsage(domain: string, version: string) {
  if (!PATTERN_SYSTEM_ENABLED || !redis) return;
  try {
    await redis.incr(`PATTERN_USAGE:${domain}:${version}`);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[pattern] usage error', domain, version, err);
    }
  }
}

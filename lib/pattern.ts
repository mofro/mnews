import { redisClient } from './redisClient.js';

/**
 * Feature-flag gate: enable by setting PATTERN_SYSTEM_ENABLED=true in env.
 * Phase-0 implementation only loads metadata and records usage; the parser
 * will call these helpers once hooked up in Phase-1.
 */
const PATTERN_SYSTEM_ENABLED = process.env.PATTERN_SYSTEM_ENABLED === 'true';

// Use the singleton Redis client instance
const redis = PATTERN_SYSTEM_ENABLED ? redisClient : null;

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
    const key = `PATTERN_USAGE:${domain}:${version}`;
    // Using get and set to implement increment since our wrapper doesn't have incr
    const current = await redis.get(key);
    const newValue = (parseInt(current || '0', 10) + 1).toString();
    await redis.set(key, newValue);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[pattern] usage error', domain, version, err);
    }
  }
}

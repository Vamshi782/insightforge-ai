/**
 * In-memory rate limiter.
 *
 * - Per-IP:  max 10 requests per 60-second sliding window
 * - Global:  max 50 requests per calendar day (UTC), across all IPs
 *
 * Works within a single serverless instance. Accurate enough for a personal
 * project — no Redis required.
 */

interface Window {
  timestamps: number[];
}

// Per-IP sliding-window store
const ipWindows = new Map<string, Window>();

// Global daily counter
let globalDayKey = "";   // "YYYY-MM-DD"
let globalCount  = 0;

const PER_IP_MAX    = 10;
const PER_IP_WINDOW = 60_000; // ms
const GLOBAL_MAX    = 50;

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string; retryAfter?: number };

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();

  // ── Global daily cap ─────────────────────────────────────────────────────────
  const today = utcDayKey();
  if (today !== globalDayKey) {
    globalDayKey = today;
    globalCount  = 0;
  }
  if (globalCount >= GLOBAL_MAX) {
    return {
      allowed: false,
      reason: "Daily limit reached. The AI assistant is limited to 50 requests per day. Please try again tomorrow.",
    };
  }

  // ── Per-IP sliding window ────────────────────────────────────────────────────
  const window = ipWindows.get(ip) ?? { timestamps: [] };

  // Drop timestamps outside the current window
  const cutoff = now - PER_IP_WINDOW;
  window.timestamps = window.timestamps.filter((t) => t > cutoff);

  if (window.timestamps.length >= PER_IP_MAX) {
    const oldest      = window.timestamps[0];
    const retryAfter  = Math.ceil((oldest + PER_IP_WINDOW - now) / 1000);
    return {
      allowed: false,
      reason: `Too many requests. You can send up to ${PER_IP_MAX} messages per minute.`,
      retryAfter,
    };
  }

  // ── Commit ───────────────────────────────────────────────────────────────────
  window.timestamps.push(now);
  ipWindows.set(ip, window);
  globalCount++;

  // Evict stale IP entries periodically to avoid unbounded growth
  if (ipWindows.size > 5_000) {
    for (const [key, w] of ipWindows) {
      if (w.timestamps.every((t) => t <= cutoff)) ipWindows.delete(key);
    }
  }

  return { allowed: true };
}

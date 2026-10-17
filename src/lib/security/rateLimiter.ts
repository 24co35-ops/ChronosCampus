// 🛡️ Enterprise Sliding-Window Rate Limiter & HTTP Security Headers 🛡️
// Enforces max 30 requests per minute per IP across /api/* endpoints
// and equips all responses with enterprise-grade HTTP security headers.

export const MAX_API_REQUESTS_PER_MINUTE = 30;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds sliding window

export const ENTERPRISE_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTimeSeconds: number;
  retryAfterSeconds?: number;
  totalRequestsInWindow: number;
}

// In-memory sliding window timestamp store: IP -> array of epoch millisecond timestamps
const rateLimitStore = new Map<string, number[]>();
let lastPruneTime = Date.now();

/**
 * Prunes expired timestamps across all entries to prevent memory leaks in long-running processes.
 */
export function pruneExpiredEntries(now = Date.now(), windowMs = RATE_LIMIT_WINDOW_MS): void {
  const cutoff = now - windowMs;
  for (const [ip, timestamps] of rateLimitStore.entries()) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      rateLimitStore.delete(ip);
    } else if (valid.length !== timestamps.length) {
      rateLimitStore.set(ip, valid);
    }
  }
}

/**
 * Evaluates the in-memory sliding window for a given client IP.
 * If requests within the last windowMs >= limit, returns allowed: false with Retry-After.
 */
export function checkRateLimit(
  ip: string,
  now = Date.now(),
  limit = MAX_API_REQUESTS_PER_MINUTE,
  windowMs = RATE_LIMIT_WINDOW_MS
): RateLimitResult {
  // Prune every 5 minutes or if store grows over 1,000 active IPs
  if (now - lastPruneTime > 5 * 60 * 1000 || rateLimitStore.size > 1000) {
    pruneExpiredEntries(now, windowMs);
    lastPruneTime = now;
  }

  const cutoff = now - windowMs;
  const existing = rateLimitStore.get(ip) || [];
  const validTimestamps = existing.filter((t) => t > cutoff);

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0] ?? (now - windowMs);
    const timeUntilExpiryMs = Math.max(0, oldestTimestamp + windowMs - now);
    const retryAfterSeconds = Math.max(1, Math.ceil(timeUntilExpiryMs / 1000));
    const resetTimeSeconds = Math.ceil((oldestTimestamp + windowMs) / 1000);

    // Save pruned list back
    rateLimitStore.set(ip, validTimestamps);

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetTimeSeconds,
      retryAfterSeconds,
      totalRequestsInWindow: validTimestamps.length,
    };
  }

  // Request allowed - register current timestamp
  validTimestamps.push(now);
  rateLimitStore.set(ip, validTimestamps);

  const resetTimeSeconds = Math.ceil((validTimestamps[0]! + windowMs) / 1000);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - validTimestamps.length),
    resetTimeSeconds,
    totalRequestsInWindow: validTimestamps.length,
  };
}

/**
 * Extracts client IP from standard proxy headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)
 */
export function getClientIp(request: {
  headers: { get(headerName: string): string | null };
}): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp?.trim()) return cfIp.trim();

  return "127.0.0.1";
}

/**
 * Resets the in-memory rate limit store (useful for unit tests)
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
  lastPruneTime = Date.now();
}

/**
 * Returns current count of tracked IPs
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}

/**
 * Applies strict enterprise security headers to any standard Headers or response object
 */
export function applyEnterpriseSecurityHeaders(headers: Headers): void {
  for (const [key, value] of Object.entries(ENTERPRISE_SECURITY_HEADERS)) {
    headers.set(key, value);
  }
}

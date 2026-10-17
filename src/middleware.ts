import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  MAX_API_REQUESTS_PER_MINUTE,
  ENTERPRISE_SECURITY_HEADERS,
} from "./lib/security/rateLimiter";

/**
 * ChronosCampus Enterprise Middleware:
 * 1. Enforces strict sliding-window in-memory rate limiting for all /api/* routes
 *    (Max 30 requests per minute per IP, returns 429 Too Many Requests + Retry-After).
 * 2. Injects enterprise HTTP security headers across all responses:
 *    - X-Content-Type-Options: nosniff
 *    - X-Frame-Options: DENY
 *    - Referrer-Policy: strict-origin-when-cross-origin
 *    - Permissions-Policy: camera=(), microphone=(), geolocation=()
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Enforce sliding-window rate limit on all /api/* endpoints
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(request);
    const rateResult = checkRateLimit(ip);

    // Rate limit breached: return 429 Too Many Requests
    if (!rateResult.allowed) {
      const retryAfter = rateResult.retryAfterSeconds ?? 60;
      return new NextResponse(
        JSON.stringify({
          error: "Too Many Requests",
          message: `Rate limit exceeded (max ${MAX_API_REQUESTS_PER_MINUTE} requests per minute per IP). Please try again in ${retryAfter} seconds.`,
          retryAfterSeconds: retryAfter,
          limit: rateResult.limit,
          remaining: 0,
          reset: rateResult.resetTimeSeconds,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(rateResult.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateResult.resetTimeSeconds),
            ...ENTERPRISE_SECURITY_HEADERS,
          },
        }
      );
    }

    // API request allowed: pass through with rate-limit and security telemetry headers
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(rateResult.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateResult.remaining));
    response.headers.set("X-RateLimit-Reset", String(rateResult.resetTimeSeconds));

    for (const [key, value] of Object.entries(ENTERPRISE_SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }

    return response;
  }

  // Non-API pages: attach standard enterprise security headers
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(ENTERPRISE_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and assets:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

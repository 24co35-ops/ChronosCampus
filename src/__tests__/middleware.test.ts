import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import {
  checkRateLimit,
  getClientIp,
  resetRateLimitStore,
  getRateLimitStoreSize,
  pruneExpiredEntries,
  MAX_API_REQUESTS_PER_MINUTE,
  RATE_LIMIT_WINDOW_MS,
  ENTERPRISE_SECURITY_HEADERS,
} from "../lib/security/rateLimiter";

describe("Enterprise Rate Limiter & Security Headers", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  describe("1. Enterprise Security Headers Configuration", () => {
    it("defines the exact required enterprise HTTP security headers", () => {
      expect(ENTERPRISE_SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
      expect(ENTERPRISE_SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
      expect(ENTERPRISE_SECURITY_HEADERS["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
      expect(ENTERPRISE_SECURITY_HEADERS["Permissions-Policy"]).toBe(
        "camera=(), microphone=(), geolocation=()"
      );
    });
  });

  describe("2. Sliding-Window Rate Limiting Algorithm", () => {
    it("allows up to 30 requests per minute for an IP", () => {
      const ip = "192.168.1.100";
      const now = 1700000000000;

      for (let i = 1; i <= MAX_API_REQUESTS_PER_MINUTE; i++) {
        const result = checkRateLimit(ip, now + i * 100);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(MAX_API_REQUESTS_PER_MINUTE - i);
        expect(result.limit).toBe(30);
      }
    });

    it("strictly blocks the 31st request within a 60-second window with 429 retry details", () => {
      const ip = "192.168.1.101";
      const startTime = 1700000000000;

      // Exhaust 30 requests within 10 seconds
      for (let i = 0; i < 30; i++) {
        const res = checkRateLimit(ip, startTime + i * 300);
        expect(res.allowed).toBe(true);
      }

      // 31st request at 15 seconds into window
      const blockedResult = checkRateLimit(ip, startTime + 15000);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.remaining).toBe(0);
      expect(blockedResult.limit).toBe(30);
      expect(blockedResult.retryAfterSeconds).toBeDefined();
      expect(blockedResult.retryAfterSeconds).toBeGreaterThan(0);
      expect(blockedResult.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it("slides window forward and allows new requests after 60 seconds", () => {
      const ip = "192.168.1.102";
      const startTime = 1700000000000;

      // Make 30 requests
      for (let i = 0; i < 30; i++) {
        checkRateLimit(ip, startTime + i * 100);
      }

      // Blocked at 30 seconds
      expect(checkRateLimit(ip, startTime + 30000).allowed).toBe(false);

      // After 61 seconds (first timestamps expired)
      const allowedResult = checkRateLimit(ip, startTime + 61000);
      expect(allowedResult.allowed).toBe(true);
      expect(allowedResult.remaining).toBeGreaterThan(0);
    });

    it("isolates rate limits between different client IPs", () => {
      const ipA = "10.0.0.1";
      const ipB = "10.0.0.2";
      const now = 1700000000000;

      // Exhaust IP A
      for (let i = 0; i < 30; i++) {
        checkRateLimit(ipA, now);
      }
      expect(checkRateLimit(ipA, now).allowed).toBe(false);

      // IP B should still have full quota
      const resB = checkRateLimit(ipB, now);
      expect(resB.allowed).toBe(true);
      expect(resB.remaining).toBe(29);
    });

    it("prunes expired timestamps to protect against memory leaks", () => {
      const now = 1700000000000;
      checkRateLimit("client-old-1", now - 100000);
      checkRateLimit("client-old-2", now - 80000);
      checkRateLimit("client-fresh", now);

      pruneExpiredEntries(now, RATE_LIMIT_WINDOW_MS);

      // The 2 old clients should have been evicted
      expect(getRateLimitStoreSize()).toBe(1);
    });
  });

  describe("3. Client IP Resolution", () => {
    it("extracts the first IP from X-Forwarded-For proxy chain", () => {
      const req = {
        headers: new Headers({
          "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
        }),
      };
      expect(getClientIp(req)).toBe("203.0.113.195");
    });

    it("resolves from X-Real-IP if X-Forwarded-For is missing", () => {
      const req = {
        headers: new Headers({
          "x-real-ip": "198.51.100.42",
        }),
      };
      expect(getClientIp(req)).toBe("198.51.100.42");
    });

    it("resolves from CF-Connecting-IP as Cloudflare proxy fallback", () => {
      const req = {
        headers: new Headers({
          "cf-connecting-ip": "198.51.100.99",
        }),
      };
      expect(getClientIp(req)).toBe("198.51.100.99");
    });

    it("falls back to 127.0.0.1 when no IP headers exist", () => {
      const req = { headers: new Headers() };
      expect(getClientIp(req)).toBe("127.0.0.1");
    });
  });

  describe("4. Next.js Middleware Integration", () => {
    it("attaches enterprise security headers and allows permitted /api/ requests", () => {
      const request = new NextRequest("http://localhost:3000/api/decode-ai", {
        headers: { "x-real-ip": "192.168.1.50" },
      });

      const response = middleware(request);
      expect(response.status).toBe(200);

      // Security headers
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(response.headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");

      // Rate limit headers
      expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("29");
      expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
    });

    it("returns HTTP 429 Too Many Requests with Retry-After when rate limit is exceeded", async () => {
      const testIp = "192.168.1.55";

      // Fire 30 requests to saturate the quota
      for (let i = 0; i < 30; i++) {
        const req = new NextRequest("http://localhost:3000/api/decode-ai", {
          headers: { "x-real-ip": testIp },
        });
        const res = middleware(req);
        expect(res.status).toBe(200);
      }

      // 31st request must trigger 429
      const excessReq = new NextRequest("http://localhost:3000/api/decode-ai", {
        headers: { "x-real-ip": testIp },
      });
      const blockedRes = middleware(excessReq);

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get("Retry-After")).toBeDefined();
      expect(Number(blockedRes.headers.get("Retry-After"))).toBeGreaterThan(0);
      expect(blockedRes.headers.get("X-RateLimit-Remaining")).toBe("0");

      // Verify enterprise security headers are present on 429 response as well
      expect(blockedRes.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(blockedRes.headers.get("X-Frame-Options")).toBe("DENY");
      expect(blockedRes.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(blockedRes.headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");

      const json = await blockedRes.json();
      expect(json.error).toBe("Too Many Requests");
      expect(json.retryAfterSeconds).toBeDefined();
      expect(json.limit).toBe(30);
      expect(json.remaining).toBe(0);
    });

    it("attaches enterprise security headers to non-API web pages without rate limiting", () => {
      const pageReq = new NextRequest("http://localhost:3000/");
      const pageRes = middleware(pageReq);

      expect(pageRes.status).toBe(200);
      expect(pageRes.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(pageRes.headers.get("X-Frame-Options")).toBe("DENY");
      expect(pageRes.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(pageRes.headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");

      // Does not consume API rate limiter quota
      expect(pageRes.headers.get("X-RateLimit-Limit")).toBeNull();
    });
  });
});

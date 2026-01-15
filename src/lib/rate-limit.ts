import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Upstash is configured
const isUpstashConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN
);

// Create Redis client if configured
const redis = isUpstashConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

/**
 * Rate limiter configurations for different use cases
 * 
 * Uses Upstash Redis in production, falls back to in-memory for development
 */

// Login attempts: 5 per minute per IP
export const loginRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "ratelimit:login",
      analytics: true,
    })
  : null;

// Onboarding/account creation: 3 per hour per IP
export const onboardingRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      prefix: "ratelimit:onboarding",
      analytics: true,
    })
  : null;

// Email sending: 3 per 5 minutes per email address
export const emailRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "5 m"),
      prefix: "ratelimit:email",
      analytics: true,
    })
  : null;

// API general: 60 per minute per IP
export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "ratelimit:api",
      analytics: true,
    })
  : null;

/**
 * In-memory rate limiter for development (when Upstash is not configured)
 * Note: This doesn't persist across serverless function invocations
 */
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null,
  fallbackLimit: number = 10,
  fallbackWindowMs: number = 60000
): Promise<RateLimitResult> {
  // Use Upstash if available
  if (limiter) {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  // Fallback to in-memory for development
  const now = Date.now();
  const key = identifier;
  const stored = inMemoryStore.get(key);

  if (!stored || now > stored.resetAt) {
    // Reset or initialize
    inMemoryStore.set(key, { count: 1, resetAt: now + fallbackWindowMs });
    return {
      success: true,
      limit: fallbackLimit,
      remaining: fallbackLimit - 1,
      reset: now + fallbackWindowMs,
    };
  }

  if (stored.count >= fallbackLimit) {
    return {
      success: false,
      limit: fallbackLimit,
      remaining: 0,
      reset: stored.resetAt,
    };
  }

  stored.count++;
  return {
    success: true,
    limit: fallbackLimit,
    remaining: fallbackLimit - stored.count,
    reset: stored.resetAt,
  };
}

/**
 * Helper to get identifier from request (IP address)
 */
export function getIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  
  // Fallback for development
  return "127.0.0.1";
}

/**
 * Check if rate limiting is enabled (Upstash configured)
 */
export function isRateLimitingEnabled(): boolean {
  return isUpstashConfigured;
}

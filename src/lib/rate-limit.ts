import { redis } from "./redis";

export async function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): Promise<boolean> {
  // Fallback for local development if environment variables are missing
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return true; 
  }

  const redisKey = `rate_limit:${key}`;
  
  // Atomic operation: increment the counter
  const current = await redis.incr(redisKey);
  
  // Set expiration only on the first increment to define the window
  if (current === 1) {
    await redis.expire(redisKey, Math.ceil(windowMs / 1000));
  }

  return current <= limit;
}

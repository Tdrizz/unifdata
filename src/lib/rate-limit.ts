import { redis } from "./redis";

export async function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): Promise<boolean> {
  if (!redis) return true;

  const redisKey = `rate_limit:${key}`;
  const current = await redis.incr(redisKey);
  if (current === 1) {
    await redis.expire(redisKey, Math.ceil(windowMs / 1000));
  }
  return current <= limit;
}

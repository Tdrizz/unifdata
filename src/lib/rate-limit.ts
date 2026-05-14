const requests = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const timestamps = (requests.get(key) ?? []).filter(
    (t) => now - t < windowMs,
  );
  if (timestamps.length === 0) requests.delete(key);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  requests.set(key, timestamps);
  return true;
}

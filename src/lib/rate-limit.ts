const requests = new Map<string, number[]>();

let lastPrune = Date.now();
const PRUNE_INTERVAL = 5 * 60_000;

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();

  if (now - lastPrune > PRUNE_INTERVAL) {
    for (const [k, ts] of requests) {
      if (ts.every((t) => now - t >= windowMs)) requests.delete(k);
    }
    lastPrune = now;
  }

  const timestamps = (requests.get(key) ?? []).filter(
    (t) => now - t < windowMs,
  );
  if (timestamps.length >= limit) {
    requests.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  requests.set(key, timestamps);
  return true;
}

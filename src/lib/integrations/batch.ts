/**
 * Run an async mapper over a list with a ceiling on how many are in flight.
 *
 * The syncers used to hand a 1000-element array straight to Promise.allSettled,
 * which opened 1000 simultaneous Supabase requests on a provider's first sync
 * and reliably starved the connection pool. Results come back in input order,
 * shaped like Promise.allSettled so callers can keep ignoring individual
 * failures without one bad record aborting the batch.
 */
export async function runWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { status: "fulfilled", value: await fn(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
}

import { createServiceClient } from "@/lib/supabase/service";

export async function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): Promise<boolean> {
  const supabase = createServiceClient();
  const windowStart = new Date(Date.now() - windowMs).toISOString();

  const { count } = await supabase
    .from("rate_limit_requests")
    .select("id", { count: "exact", head: true })
    .eq("key", key)
    .gte("requested_at", windowStart);

  if ((count ?? 0) >= limit) return false;

  await supabase.from("rate_limit_requests").insert({ key });

  // Fire-and-forget: delete rows older than 1 hour to keep the table small
  supabase
    .from("rate_limit_requests")
    .delete()
    .lt("requested_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .then(() => {});

  return true;
}

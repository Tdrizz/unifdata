import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import { getEnv } from "@/lib/env";

export function createAdminClient() {
  return createClient<Database>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

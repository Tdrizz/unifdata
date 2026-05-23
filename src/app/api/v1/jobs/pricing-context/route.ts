import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import { rateLimit } from "@/lib/rate-limit";

const MIN_MATCHING_JOBS = 5;

function escapeLike(s: string): string {
  // Escape Postgres LIKE/ILIKE special characters so user input is literal
  return s.replace(/[%_\\]/g, "\\$&");
}

export async function GET(request: Request) {
  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!await rateLimit(`pricing-ctx:${companyId}`, 30)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const serviceType = searchParams.get("service_type")?.trim() ?? "";

  if (!serviceType) {
    return NextResponse.json({ error: "service_type is required." }, { status: 400 });
  }

  const supabase = await createClient();

  // Use the first word of the query for fuzzy matching, escaped for ILIKE safety
  const firstWord = escapeLike(serviceType.split(/\s+/)[0]);

  const { data: jobs } = await supabase
    .from("jobs")
    .select("job_value")
    .eq("company_id", companyId)
    .not("job_value", "is", null)
    .ilike("service_type", `%${firstWord}%`)
    .limit(200);

  // Use total matching job count for the sufficient check (including $0 jobs)
  if (!jobs || jobs.length < MIN_MATCHING_JOBS) {
    return NextResponse.json({ sufficient: false });
  }

  // Compute average from non-zero jobs only (exclude unpriced/free work from baseline)
  const pricedValues = jobs
    .map((j) => Number(j.job_value))
    .filter((v) => v > 0);

  if (pricedValues.length === 0) {
    return NextResponse.json({ sufficient: false });
  }

  const averageAmount = pricedValues.reduce((a, b) => a + b, 0) / pricedValues.length;

  return NextResponse.json({
    sufficient: true,
    averageAmount: Math.round(averageAmount),
    sampleSize: jobs.length,
  });
}

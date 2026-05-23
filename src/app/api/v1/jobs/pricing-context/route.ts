import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import { rateLimit } from "@/lib/rate-limit";

const MIN_MATCHING_JOBS = 5;

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

  // Fuzzy match: jobs where service_type contains one word from the query (case-insensitive)
  const { data: jobs } = await supabase
    .from("jobs")
    .select("job_value")
    .eq("company_id", companyId)
    .not("job_value", "is", null)
    .ilike("service_type", `%${serviceType.split(/\s+/)[0]}%`)
    .limit(200);

  if (!jobs || jobs.length < MIN_MATCHING_JOBS) {
    return NextResponse.json({ sufficient: false });
  }

  const values = jobs.map((j) => Number(j.job_value)).filter((v) => v > 0);
  if (values.length < MIN_MATCHING_JOBS) {
    return NextResponse.json({ sufficient: false });
  }

  const averageAmount = values.reduce((a, b) => a + b, 0) / values.length;

  return NextResponse.json({
    sufficient: true,
    averageAmount: Math.round(averageAmount),
    sampleSize: values.length,
  });
}

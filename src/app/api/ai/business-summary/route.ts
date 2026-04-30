import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

function getStartOfMonth() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString()}`;
}

export async function POST() {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing Gemini API key. Add GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY.",
      },
      { status: 500 },
    );
  }

  const currentCompany = await getCurrentCompany();

  if (!currentCompany) {
    return NextResponse.json(
      { error: "No company found for current user." },
      { status: 401 },
    );
  }

  const { company } = currentCompany;
  const supabase = await createClient();

  const startOfMonth = getStartOfMonth();
  const today = getTodayString();

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id")
    .eq("company_id", company.id);

  if (customersError) {
    return NextResponse.json(
      { error: customersError.message },
      { status: 500 },
    );
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select(
      "id, status, estimated_value, source, service_requested, next_follow_up_date, created_at",
    )
    .eq("company_id", company.id);

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, status, job_value, service_type, paid_status, created_at")
    .eq("company_id", company.id);

  if (jobsError) {
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  }

  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select("id, amount, payment_status, sale_date, service_type, source")
    .eq("company_id", company.id);

  if (salesError) {
    return NextResponse.json({ error: salesError.message }, { status: 500 });
  }

  const { data: followUps, error: followUpsError } = await supabase
    .from("follow_ups")
    .select("id, due_date, status, message")
    .eq("company_id", company.id);

  if (followUpsError) {
    return NextResponse.json(
      { error: followUpsError.message },
      { status: 500 },
    );
  }

  const totalCustomers = customers?.length || 0;

  const totalRevenue =
    sales?.reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const monthlyRevenue =
    sales
      ?.filter((sale) => sale.sale_date >= startOfMonth)
      .reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const unpaidRevenue =
    sales
      ?.filter((sale) => sale.payment_status !== "Paid")
      .reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const totalLeads = leads?.length || 0;

  const openEstimateValue =
    leads
      ?.filter((lead) => lead.status === "Estimate Sent")
      .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0) || 0;

  const leadsNeedingFollowUp =
    leads?.filter((lead) => {
      if (!lead.next_follow_up_date) {
        return false;
      }

      return (
        lead.status !== "Won" &&
        lead.status !== "Lost" &&
        lead.next_follow_up_date <= today
      );
    }).length || 0;

  const activeJobs =
    jobs?.filter(
      (job) => job.status === "Scheduled" || job.status === "In Progress",
    ).length || 0;

  const completedJobs =
    jobs?.filter((job) => job.status === "Completed" || job.status === "Paid")
      .length || 0;

  const followUpsDue =
    followUps?.filter(
      (followUp) => followUp.status === "Open" && followUp.due_date <= today,
    ).length || 0;

  const metrics = {
    companyName: company.name,
    totalCustomers,
    totalLeads,
    monthlyRevenue: formatCurrency(monthlyRevenue),
    totalRevenue: formatCurrency(totalRevenue),
    unpaidRevenue: formatCurrency(unpaidRevenue),
    openEstimateValue: formatCurrency(openEstimateValue),
    activeJobs,
    completedJobs,
    leadsNeedingFollowUp,
    followUpsDue,
  };

  const prompt = `
You are an AI business analyst for a business using FrontierOps.

Write a concise business summary using the metrics below.

Rules:
- Use plain English.
- Sound professional but direct.
- Do not make up facts.
- Give 3 sections:
  1. Overall Summary
  2. What Needs Attention
  3. Recommended Next Actions
- Recommended Next Actions should have 3 bullets.
- Mention specific numbers from the metrics.
- Keep it under 250 words.

Metrics:
${JSON.stringify(metrics, null, 2)}
`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const summary = response.text || "No summary generated.";

    const { error: insertError } = await supabase.from("ai_reports").insert({
      company_id: company.id,
      report_type: "business_summary",
      summary,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      summary,
      metrics,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate summary.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

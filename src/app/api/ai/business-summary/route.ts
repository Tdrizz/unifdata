// cspell:ignore genai
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getTodayString } from "@/lib/date-format";
import { formatCurrency, compactText } from "@/lib/utils";
import { isClosedOpportunity, isUnpaid, isOpenFollowUp } from "@/lib/status";
import { GEMINI_MODEL } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { buildOperatingBriefSystemPrompt, buildOperatingBriefUserPrompt } from "@/lib/ai/prompts";

function getStartOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
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

  if (!await rateLimit(`ai:${company.id}`, 5)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a moment." },
      { status: 429 },
    );
  }

  const supabase = await createClient();

  // Rate limit: one brief per 10 minutes per company
  const COOLDOWN_MINUTES = 10;
  const { data: lastReport } = await supabase
    .from("ai_reports")
    .select("created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastReport) {
    const lastAt = new Date(lastReport.created_at).getTime();
    const secondsAgo = Math.floor((Date.now() - lastAt) / 1000);
    const cooldownSeconds = COOLDOWN_MINUTES * 60;

    if (secondsAgo < cooldownSeconds) {
      const secondsLeft = cooldownSeconds - secondsAgo;
      const minutesLeft = Math.ceil(secondsLeft / 60);
      return NextResponse.json(
        {
          error: `A brief was just generated. Please wait ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} before generating another.`,
          retryAfterSeconds: secondsLeft,
        },
        { status: 429 },
      );
    }
  }

  const startOfMonth = getStartOfMonth();
  const today = getTodayString();

  const [
    customersResult,
    leadsResult,
    jobsResult,
    salesResult,
    followUpsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email, address, customer_type, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(750),

    supabase
      .from("leads")
      .select(
        "id, customer_id, status, estimated_value, source, service_requested, next_follow_up_date, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(750),

    supabase
      .from("jobs")
      .select(
        "id, customer_id, lead_id, status, job_value, service_type, paid_status, start_date, completed_date, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(750),

    supabase
      .from("sales")
      .select(
        "id, amount, payment_status, sale_date, service_type, source, created_at",
      )
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(750),

    supabase
      .from("follow_ups")
      .select("id, customer_id, due_date, status, message, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(750),
  ]);

  if (customersResult.error) {
    return NextResponse.json(
      { error: customersResult.error.message },
      { status: 500 },
    );
  }

  if (leadsResult.error) {
    return NextResponse.json(
      { error: leadsResult.error.message },
      { status: 500 },
    );
  }

  if (jobsResult.error) {
    return NextResponse.json(
      { error: jobsResult.error.message },
      { status: 500 },
    );
  }

  if (salesResult.error) {
    return NextResponse.json(
      { error: salesResult.error.message },
      { status: 500 },
    );
  }

  if (followUpsResult.error) {
    return NextResponse.json(
      { error: followUpsResult.error.message },
      { status: 500 },
    );
  }

  const customers = customersResult.data || [];
  const leads = leadsResult.data || [];
  const jobs = jobsResult.data || [];
  const sales = salesResult.data || [];
  const followUps = followUpsResult.data || [];

  const customerById = new Map(
    customers.map((customer) => [customer.id, customer]),
  );

  const openLeads = leads.filter((lead) => !isClosedOpportunity(lead.status));

  const totalCustomers = customers.length;

  const customersMissingContactCount = customers.filter(
    (customer) => !customer.phone && !customer.email,
  ).length;

  const customersMissingAddressCount = customers.filter(
    (customer) => !customer.address,
  ).length;

  const openPipelineValue = openLeads.reduce(
    (sum, lead) => sum + Number(lead.estimated_value || 0),
    0,
  );

  const opportunitiesMissingFollowUpCount = openLeads.filter(
    (lead) => !lead.next_follow_up_date,
  ).length;

  const opportunitiesDueForFollowUpCount = openLeads.filter(
    (lead) => lead.next_follow_up_date && lead.next_follow_up_date <= today,
  ).length;

  const opportunitiesMissingValueCount = openLeads.filter(
    (lead) =>
      lead.estimated_value === null || lead.estimated_value === undefined,
  ).length;

  const totalRevenue = sales.reduce(
    (sum, sale) => sum + Number(sale.amount || 0),
    0,
  );

  const monthlyRevenue = sales
    .filter((sale) => sale.sale_date && sale.sale_date >= startOfMonth)
    .reduce((sum, sale) => sum + Number(sale.amount || 0), 0);

  const unpaidRevenueRecords = sales.filter((sale) =>
    isUnpaid(sale.payment_status),
  );

  const unpaidRevenue = unpaidRevenueRecords.reduce(
    (sum, sale) => sum + Number(sale.amount || 0),
    0,
  );

  const activeJobs = jobs.filter((job) => {
    const status = String(job.status || "").toLowerCase();

    return (
      status.includes("scheduled") ||
      status.includes("active") ||
      status.includes("progress")
    );
  });

  const completedJobs = jobs.filter((job) => {
    const status = String(job.status || "").toLowerCase();

    return (
      status.includes("completed") ||
      status.includes("complete") ||
      status.includes("done") ||
      status.includes("paid")
    );
  });

  const followUpsDueCount = followUps.filter(
    (followUp) =>
      isOpenFollowUp(followUp.status) &&
      followUp.due_date &&
      followUp.due_date <= today,
  ).length;

  const followUpsMissingDueDateCount = followUps.filter(
    (followUp) => isOpenFollowUp(followUp.status) && !followUp.due_date,
  ).length;

  const profile = getIndustryProfile(company.business_sector);

  const isEmptyWorkspace =
    customers.length === 0 &&
    leads.length === 0 &&
    jobs.length === 0 &&
    sales.length === 0 &&
    followUps.length === 0;

  const metrics = {
    date: today,
    totalCustomers,
    customersMissingContact: customersMissingContactCount,
    customersMissingAddress: customersMissingAddressCount,
    openOpportunities: openLeads.length,
    openPipelineValue: formatCurrency(openPipelineValue),
    opportunitiesDueForFollowUp: opportunitiesDueForFollowUpCount,
    opportunitiesMissingFollowUp: opportunitiesMissingFollowUpCount,
    opportunitiesMissingValue: opportunitiesMissingValueCount,
    monthlyRevenue: formatCurrency(monthlyRevenue),
    totalRevenue: formatCurrency(totalRevenue),
    unpaidRevenue: formatCurrency(unpaidRevenue),
    unpaidRevenueRecords: unpaidRevenueRecords.length,
    activeJobs: activeJobs.length,
    completedJobs: completedJobs.length,
    followUpsDue: followUpsDueCount,
    followUpsMissingDueDate: followUpsMissingDueDateCount,
  };

  const workspaceData = {
    [profile.labels.customerPlural.toLowerCase()]: customers
      .slice(0, 40)
      .map((customer) => ({
        name: compactText(customer.name, "Unnamed"),
        type: compactText(customer.customer_type),
        hasPhone: Boolean(customer.phone),
        hasEmail: Boolean(customer.email),
        hasAddress: Boolean(customer.address),
      })),

    [profile.labels.leadPlural.toLowerCase()]: leads.slice(0, 40).map((lead) => {
      const customer = lead.customer_id
        ? customerById.get(lead.customer_id)
        : null;

      return {
        service: compactText(lead.service_requested, "Untitled"),
        linkedTo: compactText(customer?.name, "No linked record"),
        status: compactText(lead.status, "New"),
        estimatedValue: Number(lead.estimated_value || 0),
        source: compactText(lead.source),
        nextFollowUpDate: lead.next_follow_up_date || null,
      };
    }),

    [profile.labels.jobPlural.toLowerCase()]: jobs.slice(0, 40).map((job) => {
      const customer = job.customer_id
        ? customerById.get(job.customer_id)
        : null;

      return {
        service: compactText(job.service_type, "Untitled"),
        linkedTo: compactText(customer?.name, "No linked record"),
        status: compactText(job.status, "Scheduled"),
        value: Number(job.job_value || 0),
        paymentStatus: compactText(job.paid_status),
        startDate: job.start_date || null,
        completedDate: job.completed_date || null,
      };
    }),

    [profile.labels.salePlural.toLowerCase()]: sales.slice(0, 40).map((sale) => ({
      service: compactText(sale.service_type, "Revenue record"),
      amount: Number(sale.amount || 0),
      paymentStatus: compactText(sale.payment_status),
      saleDate: sale.sale_date || null,
      source: compactText(sale.source),
    })),

    [profile.labels.followUpPlural.toLowerCase()]: followUps
      .slice(0, 40)
      .map((followUp) => {
        const customer = followUp.customer_id
          ? customerById.get(followUp.customer_id)
          : null;

        return {
          message: compactText(followUp.message, "Follow up"),
          linkedTo: compactText(customer?.name, "No linked record"),
          status: compactText(followUp.status, "Open"),
          dueDate: followUp.due_date || null,
        };
      }),
  };

  const systemInstruction = buildOperatingBriefSystemPrompt(profile, company);
  const userPrompt = buildOperatingBriefUserPrompt(
    profile,
    company,
    metrics,
    workspaceData as Record<string, unknown[]>,
    today,
    isEmptyWorkspace,
  );

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      config: {
        systemInstruction,
      },
      contents: userPrompt,
    });

    const summary = response.text?.trim() || "No summary generated.";

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

    const isOverloaded =
      message.includes("503") ||
      message.toLowerCase().includes("unavailable") ||
      message.toLowerCase().includes("high demand") ||
      message.toLowerCase().includes("try again later");

    if (isOverloaded) {
      return NextResponse.json(
        {
          error:
            "Gemini is experiencing high demand right now. Wait a moment and try again.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

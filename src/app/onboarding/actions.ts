/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSubscription } from "@/lib/auth/requireSubscription";
import { redirect } from "next/navigation";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { isCompanyMember, verifyOwned } from "@/lib/security/ownership";
import { splitName } from "@/lib/crm/legacy-shape";
import { slugify } from "@/lib/crm/slug";
import type { SupabaseClient } from "@supabase/supabase-js";

// Every company gets its own mailbox name under the shared sending domain
// (see sendEmail's fromLocalPart) so customer-facing email reads as coming
// from the business, not a shared generic address. Resend only verifies at
// the domain level, so this needs no per-company DNS work -- just a slug
// that doesn't collide with another company's.
async function generateUniqueEmailSlug(supabase: SupabaseClient, name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  for (let suffix = 2; ; suffix++) {
    const { data: existing } = await (supabase as any)
      .from("companies")
      .select("id")
      .eq("email_slug", candidate)
      .maybeSingle();
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
  }
}

export async function createCompanyStepAction(
  formData: FormData,
): Promise<{ companyId?: string; error?: string }> {
  let user;
  try {
    user = await requireSubscription();
  } catch {
    return { error: "Session expired. Please sign in again." };
  }

  const companyName = String(formData.get("companyName") || "").trim();
  const industry = String(formData.get("industry") || "").trim();
  const businessSector = String(formData.get("businessSector") || "general").trim();

  if (!companyName) return { error: "Company name is required." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.profileId)
    .limit(1)
    .maybeSingle();
  if (existing) return { companyId: existing.company_id };

  const emailSlug = await generateUniqueEmailSlug(supabase, companyName);

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ name: companyName, industry: industry || null, business_sector: businessSector || "general", subscription_active: true, email_slug: emailSlug })
    .select("id")
    .single();
  if (companyError) return { error: companyError.message };

  const { error: memberError } = await supabase
    .from("company_members")
    .insert({ company_id: company.id, user_id: user.profileId, role: "owner" });
  if (memberError) return { error: memberError.message };

  const profile = getIndustryProfile(businessSector);

  const defaultTags: string[] = profile.defaultTags ?? [];
  if (defaultTags.length > 0) {
    await (supabase as any).from("tags").insert(
      defaultTags.map((name: string) => ({ organization_id: company.id, name }))
    );
  }

  return { companyId: company.id };
}

export async function createWizardCustomersAction(
  customers: Array<{ name: string; phone?: string; email?: string }>,
  companyId: string,
): Promise<{ created: Array<{ id: string; name: string }>; error?: string }> {
  let user;
  try {
    user = await requireSubscription();
  } catch {
    return { created: [], error: "Session expired. Please sign in again." };
  }
  if (!customers.length) return { created: [] };

  const supabase = await createClient();

  // The company id arrives from the client — verify the caller is a member
  // before writing into it (service role bypasses RLS).
  if (!(await isCompanyMember(supabase, companyId, user.profileId))) {
    return { created: [], error: "You don't have access to this workspace." };
  }

  const validCustomers = customers.filter((c) => c.name.trim());
  if (!validCustomers.length) return { created: [] };

  const masterRows = validCustomers.map((c) => {
    const { first_name, last_name } = splitName(c.name);
    return {
      organization_id: companyId,
      first_name,
      last_name,
      primary_email: c.email?.trim() || null,
      primary_phone: c.phone?.trim() || null,
      relationship_status: "new",
      source: "manual",
    };
  });

  const { data, error } = await supabase
    .from("master_customers")
    .insert(masterRows)
    .select("id, first_name, last_name");
  if (error) return { created: [], error: error.message };

  return {
    created: (data ?? []).map((r) => ({
      id: r.id,
      name: [r.first_name, r.last_name].filter(Boolean).join(" ").trim(),
    })),
  };
}

export async function createWizardJobAction(
  data: { service_type: string; start_date?: string; customer_id?: string },
  companyId: string,
): Promise<{ error?: string }> {
  let user;
  try {
    user = await requireSubscription();
  } catch {
    return { error: "Session expired. Please sign in again." };
  }
  if (!data.service_type.trim()) return { error: "Service type is required." };

  const supabase = await createClient();

  if (!(await isCompanyMember(supabase, companyId, user.profileId))) {
    return { error: "You don't have access to this workspace." };
  }
  if (data.customer_id && !(await verifyOwned(supabase, "master_customers", data.customer_id, companyId, "organization_id"))) {
    return { error: "Invalid customer." };
  }

  const { error } = await supabase.from("jobs").insert({
    company_id: companyId,
    service_type: data.service_type.trim(),
    start_date: data.start_date || null,
    contact_id: data.customer_id || null,
    status: "Scheduled",
    paid_status: "Unpaid",
  });
  if (error) return { error: error.message };
  return {};
}

export async function createWizardFollowUpAction(
  data: { message: string; due_date: string; customer_id?: string },
  companyId: string,
): Promise<{ error?: string }> {
  let user;
  try {
    user = await requireSubscription();
  } catch {
    return { error: "Session expired. Please sign in again." };
  }
  if (!data.message.trim()) return { error: "Note is required." };
  if (!data.due_date) return { error: "Due date is required." };

  const supabase = await createClient();

  if (!(await isCompanyMember(supabase, companyId, user.profileId))) {
    return { error: "You don't have access to this workspace." };
  }
  if (data.customer_id && !(await verifyOwned(supabase, "master_customers", data.customer_id, companyId, "organization_id"))) {
    return { error: "Invalid customer." };
  }

  const { error } = await supabase.from("follow_ups").insert({
    company_id: companyId,
    message: data.message.trim(),
    due_date: data.due_date,
    contact_id: data.customer_id || null,
    status: "Open",
  });
  if (error) return { error: error.message };
  return {};
}

// Phase 04 — a blank Pipeline board on day one reads as broken, not clean,
// and gives Vera nothing true to say about a business it has no data for.
// Every earlier wizard step is skippable, so this runs once at the very end
// (see OnboardingForm's step-5 effect) and only if the company still has
// zero jobs/customers/sales -- i.e. the owner skipped every manual-entry
// step. If they added anything real, this does nothing: sample rows are
// never mixed in alongside data the owner just entered themselves.
export async function seedSampleDataIfEmptyAction(companyId: string): Promise<void> {
  let user;
  try {
    user = await requireSubscription();
  } catch {
    return;
  }

  const supabase = await createClient();
  if (!(await isCompanyMember(supabase, companyId, user.profileId))) return;

  const [{ count: customerCount }, { count: jobCount }, { count: saleCount }] = await Promise.all([
    supabase.from("master_customers").select("id", { count: "exact", head: true }).eq("organization_id", companyId),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    supabase.from("sales").select("id", { count: "exact", head: true }).eq("company_id", companyId),
  ]);
  if ((customerCount ?? 0) > 0 || (jobCount ?? 0) > 0 || (saleCount ?? 0) > 0) return;

  const { data: company } = await supabase.from("companies").select("business_sector").eq("id", companyId).single();
  const profile = getIndustryProfile(company?.business_sector);
  const jobLabel = profile.labels.jobSingular;

  const { data: customer, error: customerError } = await supabase
    .from("master_customers")
    .insert({
      organization_id: companyId,
      first_name: "Sample",
      last_name: "Customer",
      primary_email: "sample.customer@example.com",
      relationship_status: "new",
      source: "sample",
      is_sample: true,
    })
    .select("id")
    .single();
  if (customerError || !customer) return;

  const today = new Date().toISOString().slice(0, 10);

  // One in-flight sample so the board isn't just "done" work, and one
  // completed + paid sample so a first-time owner can see what a finished,
  // collected job looks like without having to do one themselves first.
  await supabase.from("jobs").insert([
    {
      company_id: companyId,
      contact_id: customer.id,
      service_type: `Sample ${jobLabel}`,
      status: "Scheduled",
      paid_status: "Unpaid",
      start_date: today,
      is_sample: true,
    },
    {
      company_id: companyId,
      contact_id: customer.id,
      service_type: `Sample ${jobLabel} (completed)`,
      status: "Completed",
      paid_status: "Paid",
      start_date: today,
      is_sample: true,
    },
  ]);

  await supabase.from("sales").insert({
    company_id: companyId,
    contact_id: customer.id,
    amount: 250,
    payment_status: "Paid",
    sale_date: today,
    service_type: `Sample ${jobLabel} (completed)`,
    source: "sample",
    is_sample: true,
  });
}

type ActionState = { error?: string };

export async function createCompanyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await requireSubscription();
  } catch {
    return { error: "Session expired. Please sign in again." };
  }

  const companyName = String(formData.get("companyName") || "").trim();
  const industry = String(formData.get("industry") || "").trim();
  const businessSector = String(
    formData.get("businessSector") || "general",
  ).trim();

  if (!companyName) {
    return { error: "Company name is required." };
  }

  const supabase = await createClient();

  // Guard against double-submit creating duplicate companies
  const { data: existing } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.profileId)
    .limit(1)
    .maybeSingle();
  if (existing) redirect("/workspace");

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      name: companyName,
      industry: industry || null,
      business_sector: businessSector || "general",
      subscription_active: true,
    })
    .select("id")
    .single();

  if (companyError) {
    return { error: companyError.message };
  }

  const { error: memberError } = await supabase.from("company_members").insert({
    company_id: company.id,
    user_id: user.profileId,
    role: "owner",
  });

  if (memberError) {
    return { error: memberError.message };
  }

  redirect("/workspace");
}

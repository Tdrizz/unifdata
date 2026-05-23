"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSubscription } from "@/lib/auth/requireSubscription";
import { redirect } from "next/navigation";

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

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ name: companyName, industry: industry || null, business_sector: businessSector || "general" })
    .select("id")
    .single();
  if (companyError) return { error: companyError.message };

  const { error: memberError } = await supabase
    .from("company_members")
    .insert({ company_id: company.id, user_id: user.profileId, role: "owner" });
  if (memberError) return { error: memberError.message };

  return { companyId: company.id };
}

export async function createWizardCustomersAction(
  customers: Array<{ name: string; phone?: string; email?: string }>,
  companyId: string,
): Promise<{ created: Array<{ id: string; name: string }>; error?: string }> {
  if (!customers.length) return { created: [] };

  const supabase = await createClient();
  const rows = customers
    .map((c) => ({
      company_id: companyId,
      name: c.name.trim(),
      phone: c.phone?.trim() || null,
      email: c.email?.trim() || null,
    }))
    .filter((r) => r.name);

  if (!rows.length) return { created: [] };

  const { data, error } = await supabase.from("customers").insert(rows).select("id, name");
  if (error) return { created: [], error: error.message };
  return { created: (data ?? []).map((r) => ({ id: r.id, name: r.name })) };
}

export async function createWizardJobAction(
  data: { service_type: string; start_date?: string; customer_id?: string },
  companyId: string,
): Promise<{ error?: string }> {
  if (!data.service_type.trim()) return { error: "Service type is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").insert({
    company_id: companyId,
    service_type: data.service_type.trim(),
    start_date: data.start_date || null,
    customer_id: data.customer_id || null,
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
  if (!data.message.trim()) return { error: "Note is required." };
  if (!data.due_date) return { error: "Due date is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("follow_ups").insert({
    company_id: companyId,
    message: data.message.trim(),
    due_date: data.due_date,
    customer_id: data.customer_id || null,
    status: "Open",
  });
  if (error) return { error: error.message };
  return {};
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

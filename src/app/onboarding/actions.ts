"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSubscription } from "@/lib/auth/requireSubscription";
import { redirect } from "next/navigation";

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

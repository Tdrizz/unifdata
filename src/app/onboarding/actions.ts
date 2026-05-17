"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSubscription } from "@/lib/auth/requireSubscription";
import { redirect } from "next/navigation";

export async function createCompanyAction(formData: FormData) {
  const user = await requireSubscription();
  const companyName = String(formData.get("companyName") || "").trim();
  const industry = String(formData.get("industry") || "").trim();
  const businessSector = String(
    formData.get("businessSector") || "general",
  ).trim();

  if (!companyName) {
    throw new Error("Company name is required");
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
    throw new Error(companyError.message);
  }

  const { error: memberError } = await supabase.from("company_members").insert({
    company_id: company.id,
    user_id: user.profileId,
    role: "owner",
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  redirect("/workspace");
}

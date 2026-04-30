"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createCompanyAction(formData: FormData) {
  const companyName = String(formData.get("companyName") || "").trim();
  const industry = String(formData.get("industry") || "").trim();
  const businessSector = String(
    formData.get("businessSector") || "general",
  ).trim();

  if (!companyName) {
    throw new Error("Company name is required");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("create_company", {
    p_name: companyName,
    p_industry: industry || null,
    p_business_sector: businessSector || "general",
  });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/workspace");
}

import { createClient } from "@/lib/supabase/server";
import { requireSubscription } from "@/lib/auth/requireSubscription";

export async function getCurrentCompany() {
  const appUser = await requireSubscription();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_members")
    .select(
      `
      role,
      companies (
        id,
        name,
        industry,
        business_sector,
        brand_color,
        accent_color,
        plan,
        status,
        created_at
    )
    `,
    )
    .eq("user_id", appUser.profileId)
    .limit(1)
    .single();

  if (error || !data?.companies) {
    return null;
  }

  return {
    role: data.role,
    company: Array.isArray(data.companies) ? data.companies[0] : data.companies,
  };
}

export async function getCurrentCompanyId() {
  const currentCompany = await getCurrentCompany();

  return currentCompany?.company.id ?? null;
}

export async function getCurrentUserRole(): Promise<string | null> {
  const company = await getCurrentCompany();
  return company?.role ?? null;
}

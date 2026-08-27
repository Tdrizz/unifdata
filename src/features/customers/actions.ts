"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString } from "@/lib/utils";
import { logActivity } from "@/lib/crm/activity";

export type ActionState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function createCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const name = getFormString(formData, "name");
  if (!name) return { fieldErrors: { name: "Name is required." } };

  const email = getFormString(formData, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { fieldErrors: { email: "Enter a valid email address." } };
  }

  const customerType = getFormString(formData, "customer_type") || null;
  const address = getFormString(formData, "address") || null;
  const notes = getFormString(formData, "notes") || null;

  const phone = getFormString(formData, "phone") || null;
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

  const { data: inserted, error } = await supabase
    .from("master_customers")
    .insert({
      organization_id: company.id,
      first_name: firstName,
      last_name: lastName,
      primary_email: email || null,
      primary_phone: phone,
      billing_address: address ? { line1: address } : null,
      metadata: Object.keys({ ...(customerType ? { customer_type: customerType } : {}), ...(notes ? { notes } : {}) }).length
        ? { ...(customerType ? { customer_type: customerType } : {}), ...(notes ? { notes } : {}) }
        : null,
      relationship_status: "new",
      source: "manual",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (inserted) {
    try {
      await logActivity(supabase, company.id, inserted.id, {
        type: "contact_created",
        label: `${name} added`,
        source: "user",
      });
    } catch {
      // Non-fatal
    }
  }

  revalidatePath("/customers");
  revalidatePath("/workspace");
  redirect("/customers?toast=Contact+created");
}

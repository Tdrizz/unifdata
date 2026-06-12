"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString } from "@/lib/utils";
import { logActivity } from "@/lib/crm/activity";
import { triggerAutomations } from "@/lib/automations/evaluator";

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

  // Legacy mirror row — kept in sync until the customers table is sunset
  const { data: legacyRow, error: legacyError } = await supabase
    .from("customers")
    .insert({
      company_id: company.id,
      name,
      phone,
      email: email || null,
      address,
      customer_type: customerType,
      notes,
    })
    .select("id")
    .single();

  if (legacyError) return { error: legacyError.message };

  const { data: inserted, error } = await supabase
    .from("master_customers")
    .insert({
      organization_id: company.id,
      legacy_customer_id: legacyRow.id,
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

  if (error) {
    // Clean up the orphaned legacy row so the two tables stay in sync
    await supabase.from("customers").delete().eq("id", legacyRow.id);
    return { error: error.message };
  }

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
    try {
      await triggerAutomations(company.id, "contact_created", {}, inserted.id, supabase);
    } catch (err) {
      // Automation failures must never block the create
      console.error("[customers.create] automation trigger failed", err);
    }
  }

  revalidatePath("/contacts");
  revalidatePath("/workspace");
  redirect("/contacts?toast=Contact+created");
}

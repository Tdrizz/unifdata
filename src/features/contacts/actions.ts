"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString } from "@/lib/utils";
import { syncEmbedding } from "@/lib/embeddings/sync";
import { buildCustomerText } from "@/lib/embeddings/generate";
import { triggerAutomations } from "@/lib/automations/evaluator";
import type { Json } from "@/types/db";

export type ActionState = { error?: string; fieldErrors?: Record<string, string> } | null;

const VALID_STATUSES = new Set(["new", "active", "inactive", "on_hold", "closed"]);

/**
 * Update a contact. master_customers is the source of truth; the legacy
 * customers row (if linked) is mirrored so older readers stay consistent.
 */
export async function updateContactAction(
  id: string,
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

  const phone = getFormString(formData, "phone") || null;
  const address = getFormString(formData, "address") || null;
  const customerType = getFormString(formData, "customer_type") || null;
  const notes = getFormString(formData, "notes") || null;
  const rawStatus = getFormString(formData, "relationship_status");
  const status = VALID_STATUSES.has(rawStatus) ? rawStatus : null;

  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

  // Fetch existing row to preserve unrelated metadata keys and find the legacy link.
  const { data: existing } = await supabase
    .from("master_customers")
    .select("id, legacy_customer_id, metadata, relationship_status")
    .eq("id", id)
    .eq("organization_id", company.id)
    .maybeSingle();

  if (!existing) return { error: "Contact not found." };

  const existingMeta = (existing.metadata as Record<string, unknown> | null) ?? {};
  const metadata = { ...existingMeta };
  if (customerType) metadata.customer_type = customerType;
  else delete metadata.customer_type;
  if (notes) metadata.notes = notes;
  else delete metadata.notes;

  const { error } = await supabase
    .from("master_customers")
    .update({
      first_name: firstName,
      last_name: lastName,
      primary_email: email || null,
      primary_phone: phone,
      billing_address: address ? { line1: address } : null,
      metadata: (Object.keys(metadata).length ? metadata : null) as Json,
      ...(status ? { relationship_status: status } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", company.id);

  if (error) return { error: error.message };

  if (status && status !== existing.relationship_status) {
    try {
      await triggerAutomations(company.id, "status_changed", { status }, id, supabase);
    } catch (err) {
      console.error("[contacts.update] automation trigger failed", err);
    }
  }

  // Mirror to the legacy customers row — non-fatal, master is authoritative.
  if (existing.legacy_customer_id) {
    const { error: legacyError } = await supabase
      .from("customers")
      .update({
        name,
        phone,
        email: email || null,
        address,
        customer_type: customerType,
        notes,
      })
      .eq("id", existing.legacy_customer_id)
      .eq("company_id", company.id);
    if (legacyError) {
      console.error("[contacts] legacy customers mirror failed", { id, error: legacyError.message });
    } else {
      syncEmbedding(
        "customers",
        existing.legacy_customer_id,
        buildCustomerText({ name, customer_type: customerType, address, notes }),
        company.id,
      );
    }
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  revalidatePath(`/customers/${id}/edit`);
  revalidatePath("/workspace");
  redirect(`/customers/${id}?toast=Contact+updated`);
}

export async function deleteContactAction(id: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { data: existing } = await supabase
    .from("master_customers")
    .select("id, legacy_customer_id")
    .eq("id", id)
    .eq("organization_id", company.id)
    .maybeSingle();

  if (!existing) redirect("/customers?toast=Contact+not+found");

  const { error } = await supabase
    .from("master_customers")
    .delete()
    .eq("id", id)
    .eq("organization_id", company.id);

  if (error) redirect(`/customers/${id}/edit?error=${encodeURIComponent(error.message)}`);

  if (existing.legacy_customer_id) {
    const { error: legacyError } = await supabase
      .from("customers")
      .delete()
      .eq("id", existing.legacy_customer_id)
      .eq("company_id", company.id);
    if (legacyError) {
      console.error("[contacts] legacy customers delete failed", { id, error: legacyError.message });
    }
  }

  revalidatePath("/customers");
  revalidatePath("/workspace");
  redirect("/customers?toast=Contact+deleted");
}

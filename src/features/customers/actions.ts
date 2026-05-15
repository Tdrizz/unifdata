"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString } from "@/lib/utils";

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

  const { error } = await supabase.from("customers").insert({
    company_id: company.id,
    name,
    phone: getFormString(formData, "phone") || null,
    email: email || null,
    address: getFormString(formData, "address") || null,
    customer_type: getFormString(formData, "customer_type") || null,
    notes: getFormString(formData, "notes") || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/customers");
  revalidatePath("/workspace");
  redirect("/customers?toast=Customer+created");
}

export async function updateCustomerAction(
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

  const { error } = await supabase
    .from("customers")
    .update({
      name,
      phone: getFormString(formData, "phone") || null,
      email: email || null,
      address: getFormString(formData, "address") || null,
      customer_type: getFormString(formData, "customer_type") || null,
      notes: getFormString(formData, "notes") || null,
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) return { error: error.message };
  revalidatePath("/customers");
  revalidatePath("/workspace");
  redirect("/customers?toast=Customer+updated");
}

export async function bulkDeleteCustomers(ids: string[]): Promise<ActionState> {
  if (ids.length === 0) return null;
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return { error: "Unauthorized" };
  if (currentCompany.role !== "owner") return { error: "Only owners can delete customers" };
  const { company } = currentCompany;

  const { error } = await supabase
    .from("customers")
    .delete()
    .in("id", ids)
    .eq("company_id", company.id);

  if (error) return { error: error.message };
  revalidatePath("/customers");
  revalidatePath("/workspace");
  return null;
}

export async function mergeCustomers(winnerId: string, loserId: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) throw new Error("Unauthorized");
  if (currentCompany.role !== "owner") throw new Error("Only owners can merge customers");
  const { company } = currentCompany;

  // Security: verify both customers belong to this company
  const { data: customers, error: fetchError } = await supabase
    .from("customers")
    .select("id, company_id")
    .in("id", [winnerId, loserId])
    .eq("company_id", company.id);

  if (fetchError || !customers || customers.length !== 2) {
    throw new Error("Invalid customer IDs or access denied");
  }

  // Re-parent all related records from loser to winner
  const tables = ["leads", "jobs", "follow_ups", "sales"] as const;
  for (const table of tables) {
    await supabase
      .from(table as never)
      .update({ customer_id: winnerId } as never)
      .eq("customer_id" as never, loserId);
  }

  // Delete the loser
  await supabase.from("customers").delete().eq("id", loserId);

  // Touch winner's updated_at
  await supabase
    .from("customers")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", winnerId);

  revalidatePath("/customers");
}

export async function deleteCustomerAction(id: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/customers/${id}/edit?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/customers");
  revalidatePath("/workspace");
  redirect("/customers?toast=Customer+deleted");
}

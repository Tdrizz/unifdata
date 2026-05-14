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

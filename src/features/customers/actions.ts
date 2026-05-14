"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString } from "@/lib/utils";

export async function createCustomerAction(formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const name = getFormString(formData, "name");
  if (!name) redirect("/customers?error=Name+is+required.");

  const { error } = await supabase.from("customers").insert({
    company_id: company.id,
    name,
    phone: getFormString(formData, "phone") || null,
    email: getFormString(formData, "email") || null,
    address: getFormString(formData, "address") || null,
    customer_type: getFormString(formData, "customer_type") || null,
    notes: getFormString(formData, "notes") || null,
  });

  if (error) redirect(`/customers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/customers");
  revalidatePath("/workspace");
  redirect("/customers?toast=Customer+created");
}

export async function updateCustomerAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const name = getFormString(formData, "name");
  if (!name) redirect(`/customers/${id}/edit?error=Name+is+required.`);

  const { error } = await supabase
    .from("customers")
    .update({
      name,
      phone: getFormString(formData, "phone") || null,
      email: getFormString(formData, "email") || null,
      address: getFormString(formData, "address") || null,
      customer_type: getFormString(formData, "customer_type") || null,
      notes: getFormString(formData, "notes") || null,
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/customers/${id}/edit?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/customers");
  revalidatePath("/workspace");
  redirect("/customers?toast=Customer+updated");
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

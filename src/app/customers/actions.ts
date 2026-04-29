"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentCompanyId } from "@/lib/current-company";
import { createClient } from "@/lib/supabase/server";

export async function createCustomerAction(formData: FormData) {
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const customerType = String(formData.get("customerType") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!name) {
    throw new Error("Customer name is required");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("customers").insert({
    company_id: companyId,
    name,
    phone: phone || null,
    email: email || null,
    address: address || null,
    customer_type: customerType || null,
    notes: notes || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/customers");
  revalidatePath("/workspace");
}

export async function deleteCustomerAction(formData: FormData) {
  const customerId = String(formData.get("customerId") || "");

  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/customers");
}
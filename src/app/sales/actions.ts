"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentCompanyId } from "@/lib/current-company";
import { createClient } from "@/lib/supabase/server";

export async function createSaleAction(formData: FormData) {
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const customerId = String(formData.get("customerId") || "").trim();
  const jobId = String(formData.get("jobId") || "").trim();
  const amountRaw = String(formData.get("amount") || "").trim();
  const paymentStatus = String(formData.get("paymentStatus") || "Paid").trim();
  const saleDate = String(formData.get("saleDate") || "").trim();
  const serviceType = String(formData.get("serviceType") || "").trim();
  const source = String(formData.get("source") || "").trim();

  if (!amountRaw) {
    throw new Error("Sale amount is required");
  }

  const amount = Number(amountRaw);

  if (Number.isNaN(amount)) {
    throw new Error("Sale amount must be a number");
  }

  if (amount < 0) {
    throw new Error("Sale amount cannot be negative");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("sales").insert({
    company_id: companyId,
    customer_id: customerId || null,
    job_id: jobId || null,
    amount,
    payment_status: paymentStatus,
    sale_date: saleDate || new Date().toISOString().slice(0, 10),
    service_type: serviceType || null,
    source: source || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/sales");
  revalidatePath("/workspace");
}

export async function deleteSaleAction(formData: FormData) {
  const saleId = String(formData.get("saleId") || "").trim();

  if (!saleId) {
    throw new Error("Sale ID is required");
  }

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    redirect("/onboarding");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("sales")
    .delete()
    .eq("id", saleId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/sales");
}
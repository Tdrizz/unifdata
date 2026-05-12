import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input, Select } from "@/components/ui/Input";
import { DismissError } from "@/components/ui/DismissError";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatDateOnly, formatTimestampDate } from "@/lib/date-format";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getFormString, getOptionalNumber, getDateInputValue, formatCurrency } from "@/lib/utils";
import { getRevenueTone, isUnpaid } from "@/lib/status";
import { DeleteConfirm } from "@/components/ui/DeleteConfirm";

type RevenueRecord = {
  id: string;
  amount: number | null;
  payment_status: string | null;
  sale_date: string | null;
  service_type: string | null;
  source: string | null;
  created_at: string;
};

function getRevenueNextStep(record: RevenueRecord) {
  if (record.amount === null || record.amount === undefined) {
    return "Add the amount so this revenue is included in reporting.";
  }

  if (!record.payment_status) {
    return "Set the payment status so collected and uncollected revenue are clear.";
  }

  if (isUnpaid(record.payment_status)) {
    return "This revenue still needs collection or payment follow-up.";
  }

  if (!record.source) {
    return "Add a source so revenue can be tied back to what generated it.";
  }

  if (!record.sale_date) {
    return "Add a revenue date so this appears in the right reporting period.";
  }

  if (String(record.payment_status || "").toLowerCase() === "paid") {
    return "Revenue is marked collected. Keep the source and date accurate.";
  }

  return "Keep this revenue record updated as payment status changes.";
}

function getRevenueIssues(record: RevenueRecord) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
    detail: string;
  }[] = [];

  if (record.amount === null || record.amount === undefined) {
    issues.push({
      label: "Add amount",
      tone: "warning",
      detail: "Amount is required for revenue reporting.",
    });
  }

  if (!record.payment_status) {
    issues.push({
      label: "Add status",
      tone: "neutral",
      detail: "Payment status separates collected and uncollected revenue.",
    });
  } else if (isUnpaid(record.payment_status)) {
    issues.push({
      label: "Payment needed",
      tone: "danger",
      detail: "This record still needs collection or payment review.",
    });
  }

  if (!record.source) {
    issues.push({
      label: "Add source",
      tone: "neutral",
      detail: "Source helps show what generated this revenue.",
    });
  }

  if (!record.sale_date) {
    issues.push({
      label: "Add date",
      tone: "neutral",
      detail: "Revenue date keeps this record in the right reporting period.",
    });
  }

  if (issues.length === 0) {
    issues.push({
      label: "Looks clean",
      tone: "success",
      detail: "This revenue record has amount, date, source, and payment status.",
    });
  }

  return issues;
}

export default async function EditRevenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  async function deleteRevenue() {
    "use server";
    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();
    if (!currentCompany) redirect("/onboarding");
    const { company } = currentCompany;
    await supabase.from("sales").delete().eq("id", id).eq("company_id", company.id);
    revalidatePath("/sales");
    revalidatePath("/workspace");
    redirect("/sales");
  }

  async function updateRevenue(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();
    if (!currentCompany) redirect("/onboarding");

    const { company } = currentCompany;

    const amount = getOptionalNumber(formData, "amount");
    const paymentStatus = getFormString(formData, "payment_status") || "Paid";
    const saleDate = getFormString(formData, "sale_date");
    const serviceType = getFormString(formData, "service_type");
    const source = getFormString(formData, "source");

    if (amount === null) {
      redirect(`/sales/${id}/edit?error=Revenue+amount+is+required.`);
    }

    const { error } = await supabase
      .from("sales")
      .update({
        amount,
        payment_status: paymentStatus,
        sale_date: saleDate || null,
        service_type: serviceType || null,
        source: source || null,
      })
      .eq("id", id)
      .eq("company_id", company.id);

    if (error) {
      redirect(`/sales/${id}/edit?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/sales");
    revalidatePath("/workspace");
    redirect("/sales");
  }

  const { data, error } = await supabase
    .from("sales")
    .select("id, amount, payment_status, sale_date, service_type, source, created_at")
    .eq("id", id)
    .eq("company_id", company.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) redirect("/sales");

  const record = data as RevenueRecord;
  const issues = getRevenueIssues(record);

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
      businessSector={company.business_sector}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow={`Edit ${profile.labels.saleSingular.toLowerCase()}`}
          title={record.service_type || formatCurrency(record.amount)}
          description={`Update amount, payment status, ${profile.labels.saleSingular.toLowerCase()} date, source, and service category.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/sales"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to Revenue
              </Link>
              <Link
                href="/jobs"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Work
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <SectionCard
            title="Revenue details"
            description="These fields control how this record appears in Home, Revenue, and reporting."
          >
            <form action={updateRevenue} className="space-y-5 p-5">
              {errorParam && <DismissError message={errorParam} />}

              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Amount">
                  <Input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={record.amount ?? ""}
                    placeholder="2500"
                  />
                </FormField>

                <FormField label="Payment status">
                  <Select name="payment_status" defaultValue={record.payment_status || "Paid"}>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partial">Partial</option>
                    <option value="Pending">Pending</option>
                  </Select>
                </FormField>

                <FormField label="Revenue date">
                  <Input
                    name="sale_date"
                    type="date"
                    defaultValue={getDateInputValue(record.sale_date)}
                  />
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Service or category">
                  <Input
                    name="service_type"
                    defaultValue={record.service_type || ""}
                    placeholder="Flooring install, website build, monthly service..."
                  />
                </FormField>

                <FormField label="Source">
                  <Input
                    name="source"
                    defaultValue={record.source || ""}
                    placeholder="Referral, Google, Website, Facebook..."
                  />
                </FormField>
              </div>

              <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
                <Link
                  href="/sales"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>
                <SubmitButton>Save revenue</SubmitButton>
              </div>
            </form>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Record summary"
              description="How this revenue record is currently being interpreted."
            >
              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Next step</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {getRevenueNextStep(record)}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <SummaryCard
                    label="Amount"
                    value={formatCurrency(record.amount)}
                  />
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Payment</p>
                    <div className="mt-2">
                      <StatusBadge tone={getRevenueTone(record.payment_status)}>
                        {record.payment_status || "Not set"}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <SummaryCard
                    label="Date"
                    value={formatDateOnly(record.sale_date)}
                  />
                  <SummaryCard
                    label="Added"
                    value={formatTimestampDate(record.created_at)}
                  />
                </div>

                <SummaryCard
                  label="Source"
                  value={record.source || "No source saved"}
                  helper="Source helps show what generated this revenue."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Cleanup"
              description="Issues affecting revenue, payment, and source reporting."
            >
              <div className="space-y-3 p-5">
                {issues.map((issue) => (
                  <div
                    key={issue.label}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <StatusBadge tone={issue.tone}>{issue.label}</StatusBadge>
                      <p className="text-sm font-medium text-slate-500">
                        {issue.label === "Looks clean"
                          ? "No action needed"
                          : "Needs update"}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {issue.detail}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Danger zone" description="Permanent actions that cannot be undone.">
              <div className="p-5">
                <DeleteConfirm
                  action={deleteRevenue}
                  description="This will permanently delete this revenue record and affect your reporting totals. This cannot be undone."
                />
              </div>
            </SectionCard>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

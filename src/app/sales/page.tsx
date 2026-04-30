import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany, getCurrentCompanyId } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

const paymentStatuses = ["Paid", "Partial", "Unpaid"];

async function createSaleAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const customerId = String(formData.get("customerId") || "").trim();
  const jobId = String(formData.get("jobId") || "").trim();
  const amount = String(formData.get("amount") || "").trim();
  const paymentStatus = String(formData.get("paymentStatus") || "Paid").trim();
  const saleDate = String(formData.get("saleDate") || "").trim();
  const serviceType = String(formData.get("serviceType") || "").trim();
  const source = String(formData.get("source") || "").trim();

  if (!amount) {
    throw new Error("Amount is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("sales").insert({
    company_id: companyId,
    customer_id: customerId || null,
    job_id: jobId || null,
    amount: Number(amount),
    payment_status: paymentStatus || "Paid",
    sale_date: saleDate || new Date().toISOString().slice(0, 10),
    service_type: serviceType || null,
    source: source || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/sales");
  revalidatePath("/workspace");
  revalidatePath("/data-hub");
}

async function deleteSaleAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const saleId = String(formData.get("saleId") || "");

  if (!saleId) {
    throw new Error("Sale ID is required.");
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
  revalidatePath("/workspace");
  revalidatePath("/data-hub");
}

function getStartOfMonth() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function formatCurrency(value: number | string | null) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
}

function getCustomerName(customerRelation: unknown) {
  if (Array.isArray(customerRelation)) {
    return customerRelation[0]?.name || "No customer linked";
  }

  if (
    typeof customerRelation === "object" &&
    customerRelation !== null &&
    "name" in customerRelation
  ) {
    return String(
      (customerRelation as { name?: string | null }).name ||
        "No customer linked",
    );
  }

  return "No customer linked";
}

function getJobName(jobRelation: unknown) {
  if (Array.isArray(jobRelation)) {
    return jobRelation[0]?.service_type || "No work record linked";
  }

  if (
    typeof jobRelation === "object" &&
    jobRelation !== null &&
    "service_type" in jobRelation
  ) {
    return String(
      (jobRelation as { service_type?: string | null }).service_type ||
        "No work record linked",
    );
  }

  return "No work record linked";
}

function getPaymentTone(status: string | null) {
  if (status === "Paid") {
    return "success" as const;
  }

  if (status === "Partial") {
    return "warning" as const;
  }

  if (status === "Unpaid") {
    return "danger" as const;
  }

  return "neutral" as const;
}

function getServiceSummary(
  sales: {
    service_type: string | null;
    amount: number | string | null;
    payment_status: string | null;
  }[],
) {
  const serviceMap = new Map<
    string,
    {
      count: number;
      value: number;
      unpaidValue: number;
    }
  >();

  sales.forEach((sale) => {
    const service = sale.service_type || "Uncategorized";
    const current = serviceMap.get(service) || {
      count: 0,
      value: 0,
      unpaidValue: 0,
    };

    const amount = Number(sale.amount || 0);

    serviceMap.set(service, {
      count: current.count + 1,
      value: current.value + amount,
      unpaidValue:
        current.unpaidValue + (sale.payment_status !== "Paid" ? amount : 0),
    });
  });

  return Array.from(serviceMap.entries())
    .map(([service, data]) => ({
      service,
      ...data,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function getSourceSummary(
  sales: {
    source: string | null;
    amount: number | string | null;
    payment_status: string | null;
  }[],
) {
  const sourceMap = new Map<
    string,
    {
      count: number;
      value: number;
      unpaidValue: number;
    }
  >();

  sales.forEach((sale) => {
    const source = sale.source || "Unknown";
    const current = sourceMap.get(source) || {
      count: 0,
      value: 0,
      unpaidValue: 0,
    };

    const amount = Number(sale.amount || 0);

    sourceMap.set(source, {
      count: current.count + 1,
      value: current.value + amount,
      unpaidValue:
        current.unpaidValue + (sale.payment_status !== "Paid" ? amount : 0),
    });
  });

  return Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      ...data,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export default async function SalesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentCompany = await getCurrentCompany();

  if (!currentCompany) {
    redirect("/onboarding");
  }

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  const startOfMonth = getStartOfMonth();

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name")
    .eq("company_id", company.id)
    .order("name", { ascending: true });

  if (customersError) {
    throw new Error(customersError.message);
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, service_type, status, job_value")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select(
      `
      id,
      customer_id,
      job_id,
      amount,
      payment_status,
      sale_date,
      service_type,
      source,
      created_at,
      customers (
        name
      ),
      jobs (
        service_type
      )
    `,
    )
    .eq("company_id", company.id)
    .order("sale_date", { ascending: false });

  if (salesError) {
    throw new Error(salesError.message);
  }

  const customerRecords = customers || [];
  const jobRecords = jobs || [];
  const saleRecords = sales || [];

  const totalSales = saleRecords.length;

  const totalRevenue = saleRecords.reduce(
    (sum, sale) => sum + Number(sale.amount || 0),
    0,
  );

  const monthlyRevenue = saleRecords
    .filter((sale) => sale.sale_date >= startOfMonth)
    .reduce((sum, sale) => sum + Number(sale.amount || 0), 0);

  const paidRevenue = saleRecords
    .filter((sale) => sale.payment_status === "Paid")
    .reduce((sum, sale) => sum + Number(sale.amount || 0), 0);

  const unpaidRevenue = saleRecords
    .filter((sale) => sale.payment_status !== "Paid")
    .reduce((sum, sale) => sum + Number(sale.amount || 0), 0);

  const paidCount = saleRecords.filter(
    (sale) => sale.payment_status === "Paid",
  ).length;

  const partialCount = saleRecords.filter(
    (sale) => sale.payment_status === "Partial",
  ).length;

  const unpaidCount = saleRecords.filter(
    (sale) => sale.payment_status === "Unpaid",
  ).length;

  const missingCustomer = saleRecords.filter(
    (sale) => !sale.customer_id,
  ).length;

  const missingJob = saleRecords.filter((sale) => !sale.job_id).length;

  const missingSource = saleRecords.filter((sale) => !sale.source).length;

  const missingServiceType = saleRecords.filter(
    (sale) => !sale.service_type,
  ).length;

  const missingDate = saleRecords.filter((sale) => !sale.sale_date).length;

  const collectionRate =
    totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;

  const serviceSummary = getServiceSummary(saleRecords);

  const sourceSummary = getSourceSummary(saleRecords);

  const paymentSummary = paymentStatuses.map((status) => ({
    status,
    count: saleRecords.filter((sale) => sale.payment_status === status).length,
    value: saleRecords
      .filter((sale) => sale.payment_status === status)
      .reduce((sum, sale) => sum + Number(sale.amount || 0), 0),
  }));

  const unpaidSales = saleRecords
    .filter((sale) => sale.payment_status !== "Paid")
    .slice(0, 8);

  const recentSales = saleRecords.slice(0, 8);

  const cleanupItems = [
    {
      label: `${profile.labels.salePlural} without linked ${profile.labels.customerSingular.toLowerCase()}`,
      value: missingCustomer,
      description:
        "Revenue is more useful when it connects back to the customer or client.",
    },
    {
      label: `${profile.labels.salePlural} not linked to work`,
      value: missingJob,
      description:
        "Connecting revenue to work records helps show which jobs or projects turn into payment.",
    },
    {
      label: `${profile.labels.salePlural} missing source`,
      value: missingSource,
      description:
        "Source tracking helps show which channels create paid work.",
    },
    {
      label: `${profile.labels.salePlural} missing service type`,
      value: missingServiceType,
      description:
        "Service type helps show what the business actually makes money from.",
    },
    {
      label: `${profile.labels.salePlural} missing date`,
      value: missingDate,
      description: "Dates are needed for monthly reporting and trend analysis.",
    },
  ];

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Records"
          title={profile.labels.salePlural}
          description={`Track ${profile.labels.salePlural.toLowerCase()}, payment status, service type, source, dates, and related customers so revenue is easy to understand and follow up on.`}
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Revenue this month"
            value={formatCurrency(monthlyRevenue)}
            helper="Recorded since the start of the month"
            tone="positive"
          />

          <StatCard
            label="Total revenue stored"
            value={formatCurrency(totalRevenue)}
            helper={`${totalSales} total records`}
          />

          <StatCard
            label="Unpaid / partial"
            value={formatCurrency(unpaidRevenue)}
            helper={`${partialCount} partial / ${unpaidCount} unpaid`}
            tone={unpaidRevenue > 0 ? "warning" : "default"}
          />

          <StatCard
            label="Collection rate"
            value={`${collectionRate}%`}
            helper={`${paidCount} records marked paid`}
            tone={collectionRate >= 80 ? "positive" : "default"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.75fr_1.25fr]">
          <SectionCard
            title={`Add ${profile.labels.saleSingular.toLowerCase()}`}
            description="Create a revenue record that can connect to a customer, work record, source, and service category."
          >
            <form action={createSaleAction} className="space-y-4 p-5">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {profile.labels.customerSingular}
                </label>
                <select
                  name="customerId"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">No customer linked</option>
                  {customerRecords.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Related {profile.labels.jobSingular.toLowerCase()}
                </label>
                <select
                  name="jobId"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">No work record linked</option>
                  {jobRecords.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.service_type} — {formatCurrency(job.job_value)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Amount
                  </label>
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="2500"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Payment status
                  </label>
                  <select
                    name="paymentStatus"
                    defaultValue="Paid"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Sale date
                </label>
                <input
                  name="saleDate"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Service type
                </label>
                <input
                  name="serviceType"
                  placeholder="Mowing, excavation, appointment, policy, repair..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Source
                </label>
                <input
                  name="source"
                  placeholder="Google, referral, Facebook, repeat customer..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Save {profile.labels.saleSingular.toLowerCase()}
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Revenue control"
            description="Understand what has been collected, what is still outstanding, and what needs cleanup."
          >
            <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  Paid revenue
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {formatCurrency(paidRevenue)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Revenue marked fully paid.
                </p>
              </div>

              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  Outstanding
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {formatCurrency(unpaidRevenue)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Revenue marked unpaid or partial.
                </p>
              </div>

              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">
                  Data cleanup
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {missingCustomer + missingSource + missingServiceType}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Missing customer, source, or service type.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 p-5">
              <p className="text-sm font-semibold text-slate-950">
                Payment status
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {paymentSummary.map((item) => (
                  <div
                    key={item.status}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {item.status}
                      </p>
                      <StatusBadge tone={getPaymentTone(item.status)}>
                        {item.count}
                      </StatusBadge>
                    </div>

                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {formatCurrency(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard
            title="Revenue by service"
            description="Which services, products, or categories are producing revenue."
          >
            {serviceSummary.length === 0 ? (
              <EmptyState
                title="No service revenue yet"
                description="Add service types to revenue records to understand what makes the business money."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {serviceSummary.map((item) => (
                  <div
                    key={item.service}
                    className="grid gap-3 p-5 md:grid-cols-[1fr_120px_150px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {item.service}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.count}{" "}
                        {item.count === 1
                          ? profile.labels.saleSingular.toLowerCase()
                          : profile.labels.salePlural.toLowerCase()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Outstanding
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {formatCurrency(item.unpaidValue)}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-xs font-medium text-slate-500">
                        Total
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {formatCurrency(item.value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Revenue by source"
            description="Which channels are connected to recorded revenue."
          >
            {sourceSummary.length === 0 ? (
              <EmptyState
                title="No source data yet"
                description="Add sources to revenue records to understand what channels create paid work."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {sourceSummary.map((item) => (
                  <div
                    key={item.source}
                    className="grid gap-3 p-5 md:grid-cols-[1fr_120px_150px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {item.source}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.count}{" "}
                        {item.count === 1
                          ? profile.labels.saleSingular.toLowerCase()
                          : profile.labels.salePlural.toLowerCase()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Outstanding
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {formatCurrency(item.unpaidValue)}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-xs font-medium text-slate-500">
                        Total
                      </p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {formatCurrency(item.value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <SectionCard
            title="Cleanup queue"
            description="Fix these items to make revenue reporting more accurate."
          >
            <div className="divide-y divide-slate-100">
              {cleanupItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-4 p-5"
                >
                  <div>
                    <p className="font-semibold text-slate-950">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </div>

                  <StatusBadge tone={item.value > 0 ? "warning" : "success"}>
                    {item.value}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Outstanding revenue"
            description="Revenue records that are not marked fully paid."
          >
            {unpaidSales.length === 0 ? (
              <EmptyState
                title="No outstanding revenue"
                description="All stored revenue records are currently marked paid."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {unpaidSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="grid gap-4 p-5 md:grid-cols-[1fr_140px_140px]"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {formatCurrency(sale.amount)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {getCustomerName(sale.customers)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Status
                      </p>
                      <div className="mt-1">
                        <StatusBadge tone={getPaymentTone(sale.payment_status)}>
                          {sale.payment_status || "Unknown"}
                        </StatusBadge>
                      </div>
                    </div>

                    <div className="md:text-right">
                      <p className="text-xs font-medium text-slate-500">Date</p>
                      <p className="mt-1 font-semibold text-slate-950">
                        {formatDate(sale.sale_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <SectionCard
          title={`${profile.labels.salePlural} records`}
          description="Revenue records with customer context, source, service type, payment status, and date."
        >
          {saleRecords.length === 0 ? (
            <EmptyState
              title={`No ${profile.labels.salePlural.toLowerCase()} yet`}
              description={`Add your first ${profile.labels.saleSingular.toLowerCase()} to begin tracking revenue and payment status.`}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {saleRecords.map((sale) => (
                <article
                  key={sale.id}
                  className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_1fr_130px_90px]"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {formatCurrency(sale.amount)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {getCustomerName(sale.customers)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Related: {getJobName(sale.jobs)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Service / source
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {sale.service_type || "No service type"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {sale.source || "No source"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Date</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatDate(sale.sale_date)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Added {formatDate(sale.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Payment
                    </p>
                    <div className="mt-2">
                      <StatusBadge tone={getPaymentTone(sale.payment_status)}>
                        {sale.payment_status || "Unknown"}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Link
                      href={`/sales/${sale.id}/edit`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </Link>

                    <form action={deleteSaleAction}>
                      <input type="hidden" name="saleId" value={sale.id} />
                      <button className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100">
                        Delete
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}

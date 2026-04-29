import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { createSaleAction, deleteSaleAction } from "./actions";

const paymentStatuses = ["Paid", "Unpaid", "Partially Paid"];

function formatCurrency(value: number | string | null) {
  const numberValue = Number(value || 0);

  return `$${numberValue.toLocaleString()}`;
}

function getCustomerName(customerRelation: unknown) {
  if (Array.isArray(customerRelation)) {
    return customerRelation[0]?.name || "No customer";
  }

  if (
    typeof customerRelation === "object" &&
    customerRelation !== null &&
    "name" in customerRelation
  ) {
    return String(
      (customerRelation as { name?: string | null }).name || "No customer",
    );
  }

  return "No customer";
}

function getJobService(jobRelation: unknown) {
  if (Array.isArray(jobRelation)) {
    return jobRelation[0]?.service_type || "No job";
  }

  if (
    typeof jobRelation === "object" &&
    jobRelation !== null &&
    "service_type" in jobRelation
  ) {
    return String(
      (jobRelation as { service_type?: string | null }).service_type ||
        "No job",
    );
  }

  return "No job";
}

function getPaymentBadgeClass(status: string) {
  if (status === "Paid") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "Partially Paid") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-red-50 text-red-700 border-red-200";
}

function getStartOfMonth() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
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

  const startOfMonth = getStartOfMonth();

  const totalRevenue =
    sales?.reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const monthlyRevenue =
    sales
      ?.filter((sale) => sale.sale_date >= startOfMonth)
      .reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const paidRevenue =
    sales
      ?.filter((sale) => sale.payment_status === "Paid")
      .reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  const unpaidRevenue =
    sales
      ?.filter((sale) => sale.payment_status !== "Paid")
      .reduce((sum, sale) => sum + Number(sale.amount || 0), 0) || 0;

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""}>
      <div className="space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Revenue
            </p>

            <h1 className="mt-2 text-3xl font-bold">Sales</h1>

            <p className="mt-2 text-slate-600">
              Track revenue, payment status, service type, and lead source for{" "}
              {company.name}.
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total revenue</p>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(totalRevenue)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">This month</p>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(monthlyRevenue)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Paid revenue</p>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(paidRevenue)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Unpaid / partial</p>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(unpaidRevenue)}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Add sale</h2>

          <form
            action={createSaleAction}
            className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label className="text-sm font-medium text-slate-700">
                Customer
              </label>
              <select
                name="customerId"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">No customer selected</option>
                {customers?.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Related job
              </label>
              <select
                name="jobId"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">No job selected</option>
                {jobs?.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.service_type} — {job.status} —{" "}
                    {formatCurrency(job.job_value)}
                  </option>
                ))}
              </select>
            </div>

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
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="3500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Payment status
              </label>
              <select
                name="paymentStatus"
                defaultValue="Paid"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              >
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Sale date
              </label>
              <input
                name="saleDate"
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Service type
              </label>
              <input
                name="serviceType"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Driveway gravel repair"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Source
              </label>
              <input
                name="source"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Referral, Google, Facebook, repeat customer..."
              />
            </div>

            <div className="md:col-span-2">
              <button className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800">
                Add sale
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-bold">Sales list</h2>
            <p className="mt-1 text-sm text-slate-500">
              These sales records are coming from Supabase and filtered to your
              company.
            </p>
          </div>

          {!sales || sales.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-lg font-semibold">No sales yet.</p>
              <p className="mt-2 text-slate-500">
                Add your first sale using the form above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4 font-medium">Customer</th>
                    <th className="p-4 font-medium">Job</th>
                    <th className="p-4 font-medium">Amount</th>
                    <th className="p-4 font-medium">Payment</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Service</th>
                    <th className="p-4 font-medium">Source</th>
                    <th className="p-4 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="p-4 align-top">
                        <p className="font-semibold text-slate-950">
                          {getCustomerName(sale.customers)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Added {new Date(sale.created_at).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="max-w-xs p-4 align-top text-slate-600">
                        {getJobService(sale.jobs)}
                      </td>

                      <td className="p-4 align-top text-lg font-bold text-slate-950">
                        {formatCurrency(sale.amount)}
                      </td>

                      <td className="p-4 align-top">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentBadgeClass(
                            sale.payment_status,
                          )}`}
                        >
                          {sale.payment_status}
                        </span>
                      </td>

                      <td className="p-4 align-top text-slate-600">
                        {sale.sale_date}
                      </td>

                      <td className="p-4 align-top text-slate-600">
                        {sale.service_type || "—"}
                      </td>

                      <td className="p-4 align-top text-slate-600">
                        {sale.source || "—"}
                      </td>

                      <td className="p-4 align-top">
                        <form action={deleteSaleAction}>
                          <input type="hidden" name="saleId" value={sale.id} />

                          <button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

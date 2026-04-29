import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { createJobAction, deleteJobAction } from "./actions";

const jobStatuses = [
  "Scheduled",
  "In Progress",
  "Completed",
  "Paid",
  "Cancelled",
];

const paidStatuses = ["Unpaid", "Partially Paid", "Paid"];

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

function getLeadService(leadRelation: unknown) {
  if (Array.isArray(leadRelation)) {
    return leadRelation[0]?.service_requested || "No lead";
  }

  if (
    typeof leadRelation === "object" &&
    leadRelation !== null &&
    "service_requested" in leadRelation
  ) {
    return String(
      (leadRelation as { service_requested?: string | null })
        .service_requested || "No lead",
    );
  }

  return "No lead";
}

function getStatusBadgeClass(status: string) {
  if (status === "Completed" || status === "Paid") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "Cancelled") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (status === "In Progress") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

function getPaidBadgeClass(status: string) {
  if (status === "Paid") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "Partially Paid") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default async function JobsPage() {
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

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, service_requested, status, estimated_value")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(
      `
      id,
      customer_id,
      lead_id,
      service_type,
      status,
      job_value,
      start_date,
      completed_date,
      paid_status,
      notes,
      created_at,
      customers (
        name
      ),
      leads (
        service_requested
      )
    `,
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const totalJobs = jobs?.length || 0;

  const activeJobs =
    jobs?.filter(
      (job) => job.status === "Scheduled" || job.status === "In Progress",
    ).length || 0;

  const completedJobs =
    jobs?.filter((job) => job.status === "Completed" || job.status === "Paid")
      .length || 0;

  const openJobValue =
    jobs
      ?.filter((job) => job.status !== "Cancelled")
      .reduce((sum, job) => sum + Number(job.job_value || 0), 0) || 0;

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""}>
      <div className="space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Operations
            </p>

            <h1 className="mt-2 text-3xl font-bold">Jobs</h1>

            <p className="mt-2 text-slate-600">
              Track scheduled, active, completed, and paid jobs for{" "}
              {company.name}.
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total jobs</p>
            <p className="mt-2 text-3xl font-bold">{totalJobs}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active jobs</p>
            <p className="mt-2 text-3xl font-bold">{activeJobs}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Completed jobs</p>
            <p className="mt-2 text-3xl font-bold">{completedJobs}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total job value</p>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(openJobValue)}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Add job</h2>

          <form
            action={createJobAction}
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
                Related lead
              </label>
              <select
                name="leadId"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">No lead selected</option>
                {leads?.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.service_requested} — {lead.status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Service type
              </label>
              <input
                name="serviceType"
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Driveway gravel repair"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Job status
              </label>
              <select
                name="status"
                defaultValue="Scheduled"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              >
                {jobStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Job value
              </label>
              <input
                name="jobValue"
                type="number"
                min="0"
                step="0.01"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="3500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Paid status
              </label>
              <select
                name="paidStatus"
                defaultValue="Unpaid"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              >
                {paidStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Start date
              </label>
              <input
                name="startDate"
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Completed date
              </label>
              <input
                name="completedDate"
                type="date"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Notes
              </label>
              <textarea
                name="notes"
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Crew notes, materials, customer preferences, scheduling details..."
              />
            </div>

            <div className="md:col-span-2">
              <button className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800">
                Add job
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-bold">Job list</h2>
            <p className="mt-1 text-sm text-slate-500">
              These jobs are coming from Supabase and filtered to your company.
            </p>
          </div>

          {!jobs || jobs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-lg font-semibold">No jobs yet.</p>
              <p className="mt-2 text-slate-500">
                Add your first scheduled job using the form above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4 font-medium">Customer</th>
                    <th className="p-4 font-medium">Service</th>
                    <th className="p-4 font-medium">Related lead</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Value</th>
                    <th className="p-4 font-medium">Dates</th>
                    <th className="p-4 font-medium">Paid</th>
                    <th className="p-4 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="p-4 align-top">
                        <p className="font-semibold text-slate-950">
                          {getCustomerName(job.customers)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Added {new Date(job.created_at).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="max-w-xs p-4 align-top text-slate-600">
                        <p className="font-medium text-slate-950">
                          {job.service_type || "—"}
                        </p>

                        {job.notes && (
                          <p className="mt-1 text-xs text-slate-500">
                            {job.notes}
                          </p>
                        )}
                      </td>

                      <td className="max-w-xs p-4 align-top text-slate-600">
                        {getLeadService(job.leads)}
                      </td>

                      <td className="p-4 align-top">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                            job.status,
                          )}`}
                        >
                          {job.status}
                        </span>
                      </td>

                      <td className="p-4 align-top font-semibold text-slate-950">
                        {formatCurrency(job.job_value)}
                      </td>

                      <td className="p-4 align-top text-slate-600">
                        <p>Start: {job.start_date || "—"}</p>
                        <p className="mt-1">
                          Done: {job.completed_date || "—"}
                        </p>
                      </td>

                      <td className="p-4 align-top">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaidBadgeClass(
                            job.paid_status,
                          )}`}
                        >
                          {job.paid_status}
                        </span>
                      </td>

                      <td className="p-4 align-top">
                        <form action={deleteJobAction}>
                          <input type="hidden" name="jobId" value={job.id} />

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
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { createLeadAction, deleteLeadAction } from "./actions";

const leadStatuses = [
  "New",
  "Contacted",
  "Estimate Sent",
  "Won",
  "Lost",
  "Needs Follow-Up",
];

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

function formatCurrency(value: number | string | null) {
  const numberValue = Number(value || 0);

  return `$${numberValue.toLocaleString()}`;
}

function getStatusBadgeClass(status: string) {
  if (status === "Won") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "Lost") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (status === "Estimate Sent") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (status === "Needs Follow-Up") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

export default async function LeadsPage() {
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
    .select(
      `
      id,
      customer_id,
      source,
      service_requested,
      status,
      estimated_value,
      next_follow_up_date,
      notes,
      created_at,
      customers (
        name
      )
    `,
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (leadsError) {
    throw new Error(leadsError.message);
  }

  const totalLeads = leads?.length || 0;

  const openEstimateValue =
    leads
      ?.filter((lead) => lead.status === "Estimate Sent")
      .reduce(
        (sum, lead) => sum + Number(lead.estimated_value || 0),
        0,
      ) || 0;

  const followUpsDue =
    leads?.filter((lead) => {
      if (!lead.next_follow_up_date) {
        return false;
      }

      const today = new Date().toISOString().slice(0, 10);

      return (
        lead.status !== "Won" &&
        lead.status !== "Lost" &&
        lead.next_follow_up_date <= today
      );
    }).length || 0;

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""}>
      <div className="space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Pipeline
            </p>

            <h1 className="mt-2 text-3xl font-bold">Leads</h1>

            <p className="mt-2 text-slate-600">
              Track potential jobs, estimates, sources, and follow-ups for{" "}
              {company.name}.
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total leads</p>
            <p className="mt-2 text-3xl font-bold">{totalLeads}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Open estimate value</p>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(openEstimateValue)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Follow-ups due</p>
            <p className="mt-2 text-3xl font-bold">{followUpsDue}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Add lead</h2>

          <form
            action={createLeadAction}
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
                Lead source
              </label>
              <input
                name="source"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Referral, Google, Facebook, website..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Service requested
              </label>
              <input
                name="serviceRequested"
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Driveway gravel repair"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                name="status"
                defaultValue="New"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              >
                {leadStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Estimated value
              </label>
              <input
                name="estimatedValue"
                type="number"
                min="0"
                step="0.01"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="3500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Next follow-up date
              </label>
              <input
                name="nextFollowUpDate"
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
                placeholder="What did they ask for? What needs to happen next?"
              />
            </div>

            <div className="md:col-span-2">
              <button className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800">
                Add lead
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-bold">Lead list</h2>
            <p className="mt-1 text-sm text-slate-500">
              These leads are coming from Supabase and filtered to your
              company.
            </p>
          </div>

          {!leads || leads.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-lg font-semibold">No leads yet.</p>
              <p className="mt-2 text-slate-500">
                Add your first lead using the form above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4 font-medium">Customer</th>
                    <th className="p-4 font-medium">Service</th>
                    <th className="p-4 font-medium">Source</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Value</th>
                    <th className="p-4 font-medium">Follow-up</th>
                    <th className="p-4 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="p-4 align-top">
                        <p className="font-semibold text-slate-950">
                          {getCustomerName(lead.customers)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Added{" "}
                          {new Date(lead.created_at).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="max-w-xs p-4 align-top text-slate-600">
                        <p>{lead.service_requested || "—"}</p>
                        {lead.notes && (
                          <p className="mt-1 text-xs text-slate-500">
                            {lead.notes}
                          </p>
                        )}
                      </td>

                      <td className="p-4 align-top text-slate-600">
                        {lead.source || "—"}
                      </td>

                      <td className="p-4 align-top">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                            lead.status,
                          )}`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      <td className="p-4 align-top font-semibold text-slate-950">
                        {formatCurrency(lead.estimated_value)}
                      </td>

                      <td className="p-4 align-top text-slate-600">
                        {lead.next_follow_up_date || "—"}
                      </td>

                      <td className="p-4 align-top">
                        <form action={deleteLeadAction}>
                          <input
                            type="hidden"
                            name="leadId"
                            value={lead.id}
                          />

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
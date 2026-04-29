import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import {
  completeFollowUpAction,
  createFollowUpAction,
  deleteFollowUpAction,
  reopenFollowUpAction,
} from "./actions";

const followUpStatuses = ["Open", "Completed"];

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
  if (status === "Completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString();
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

export default async function FollowUpsPage() {
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

  const { data: followUps, error: followUpsError } = await supabase
    .from("follow_ups")
    .select(
      `
      id,
      customer_id,
      lead_id,
      due_date,
      status,
      message,
      created_at,
      completed_at,
      customers (
        name
      ),
      leads (
        service_requested
      )
    `,
    )
    .eq("company_id", company.id)
    .order("due_date", { ascending: true });

  if (followUpsError) {
    throw new Error(followUpsError.message);
  }

  const today = getTodayString();

  const totalFollowUps = followUps?.length || 0;

  const openFollowUps =
    followUps?.filter((followUp) => followUp.status === "Open").length || 0;

  const dueOrOverdue =
    followUps?.filter(
      (followUp) => followUp.status === "Open" && followUp.due_date <= today,
    ).length || 0;

  const completedFollowUps =
    followUps?.filter((followUp) => followUp.status === "Completed").length ||
    0;

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""}>
      <div className="space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Follow-Up System
            </p>

            <h1 className="mt-2 text-3xl font-bold">Follow-Ups</h1>

            <p className="mt-2 text-slate-600">
              Track who needs to be contacted next so leads and estimates do not
              go cold.
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total follow-ups</p>
            <p className="mt-2 text-3xl font-bold">{totalFollowUps}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Open</p>
            <p className="mt-2 text-3xl font-bold">{openFollowUps}</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm text-amber-700">Due / overdue</p>
            <p className="mt-2 text-3xl font-bold text-amber-950">
              {dueOrOverdue}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm text-emerald-700">Completed</p>
            <p className="mt-2 text-3xl font-bold text-emerald-950">
              {completedFollowUps}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Add follow-up</h2>

          <form
            action={createFollowUpAction}
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
                Due date
              </label>
              <input
                name="dueDate"
                type="date"
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                name="status"
                defaultValue="Open"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
              >
                {followUpStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Message / reminder
              </label>
              <textarea
                name="message"
                rows={3}
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Call Mike about the estimate before Friday."
              />
            </div>

            <div className="md:col-span-2">
              <button className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800">
                Add follow-up
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-bold">Follow-up list</h2>
            <p className="mt-1 text-sm text-slate-500">
              These follow-ups are coming from Supabase and filtered to your
              company.
            </p>
          </div>

          {!followUps || followUps.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-lg font-semibold">No follow-ups yet.</p>
              <p className="mt-2 text-slate-500">
                Add your first follow-up using the form above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4 font-medium">Customer</th>
                    <th className="p-4 font-medium">Lead</th>
                    <th className="p-4 font-medium">Message</th>
                    <th className="p-4 font-medium">Due</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {followUps.map((followUp) => {
                    const isDue =
                      followUp.status === "Open" && followUp.due_date <= today;

                    return (
                      <tr
                        key={followUp.id}
                        className={isDue ? "bg-amber-50/40" : ""}
                      >
                        <td className="p-4 align-top">
                          <p className="font-semibold text-slate-950">
                            {getCustomerName(followUp.customers)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Created{" "}
                            {new Date(followUp.created_at).toLocaleDateString()}
                          </p>
                        </td>

                        <td className="max-w-xs p-4 align-top text-slate-600">
                          {getLeadService(followUp.leads)}
                        </td>

                        <td className="max-w-sm p-4 align-top text-slate-600">
                          {followUp.message || "—"}
                        </td>

                        <td className="p-4 align-top">
                          <p
                            className={
                              isDue
                                ? "font-bold text-amber-800"
                                : "text-slate-600"
                            }
                          >
                            {formatDate(followUp.due_date)}
                          </p>

                          {isDue && (
                            <p className="mt-1 text-xs font-semibold text-amber-700">
                              Due now
                            </p>
                          )}
                        </td>

                        <td className="p-4 align-top">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                              followUp.status,
                            )}`}
                          >
                            {followUp.status}
                          </span>

                          {followUp.completed_at && (
                            <p className="mt-1 text-xs text-slate-500">
                              Completed {formatDate(followUp.completed_at)}
                            </p>
                          )}
                        </td>

                        <td className="p-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            {followUp.status === "Open" ? (
                              <form action={completeFollowUpAction}>
                                <input
                                  type="hidden"
                                  name="followUpId"
                                  value={followUp.id}
                                />

                                <button className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                                  Complete
                                </button>
                              </form>
                            ) : (
                              <form action={reopenFollowUpAction}>
                                <input
                                  type="hidden"
                                  name="followUpId"
                                  value={followUp.id}
                                />

                                <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                  Reopen
                                </button>
                              </form>
                            )}

                            <form action={deleteFollowUpAction}>
                              <input
                                type="hidden"
                                name="followUpId"
                                value={followUp.id}
                              />

                              <button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

import Link from "next/link";
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

const followUpStatuses = ["Open", "Completed"];

async function createFollowUpAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const customerId = String(formData.get("customerId") || "").trim();
  const leadId = String(formData.get("leadId") || "").trim();
  const dueDate = String(formData.get("dueDate") || "").trim();
  const status = String(formData.get("status") || "Open").trim();
  const message = String(formData.get("message") || "").trim();

  if (!message) {
    throw new Error("Follow-up message is required.");
  }

  if (!dueDate) {
    throw new Error("Due date is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("follow_ups").insert({
    company_id: companyId,
    customer_id: customerId || null,
    lead_id: leadId || null,
    due_date: dueDate,
    status: status || "Open",
    message,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
  revalidatePath("/crm");
  revalidatePath("/data-hub");
}

async function completeFollowUpAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const followUpId = String(formData.get("followUpId") || "");

  if (!followUpId) {
    throw new Error("Follow-up ID is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "Completed" })
    .eq("id", followUpId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
  revalidatePath("/crm");
}

async function reopenFollowUpAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const followUpId = String(formData.get("followUpId") || "");

  if (!followUpId) {
    throw new Error("Follow-up ID is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "Open" })
    .eq("id", followUpId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
  revalidatePath("/crm");
}

async function deleteFollowUpAction(formData: FormData) {
  "use server";

  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    throw new Error("No company found.");
  }

  const followUpId = String(formData.get("followUpId") || "");

  if (!followUpId) {
    throw new Error("Follow-up ID is required.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("id", followUpId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
  revalidatePath("/crm");
  revalidatePath("/data-hub");
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
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

function getLeadName(leadRelation: unknown) {
  if (Array.isArray(leadRelation)) {
    return leadRelation[0]?.service_requested || "No opportunity linked";
  }

  if (
    typeof leadRelation === "object" &&
    leadRelation !== null &&
    "service_requested" in leadRelation
  ) {
    return String(
      (leadRelation as { service_requested?: string | null })
        .service_requested || "No opportunity linked",
    );
  }

  return "No opportunity linked";
}

function getFollowUpTone(status: string | null, dueDate: string | null) {
  const today = getTodayString();

  if (status === "Completed") {
    return "success" as const;
  }

  if (dueDate && dueDate < today) {
    return "danger" as const;
  }

  if (dueDate && dueDate === today) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function getFollowUpLabel(status: string | null, dueDate: string | null) {
  const today = getTodayString();

  if (status === "Completed") {
    return "Completed";
  }

  if (dueDate && dueDate < today) {
    return "Overdue";
  }

  if (dueDate && dueDate === today) {
    return "Due today";
  }

  return "Upcoming";
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
  const profile = getIndustryProfile(company.business_sector);

  const today = getTodayString();

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

  const customerRecords = customers || [];
  const leadRecords = leads || [];
  const followUpRecords = followUps || [];

  const totalFollowUps = followUpRecords.length;

  const openFollowUps = followUpRecords.filter(
    (followUp) => followUp.status === "Open",
  );

  const completedFollowUps = followUpRecords.filter(
    (followUp) => followUp.status === "Completed",
  );

  const overdueFollowUps = followUpRecords.filter(
    (followUp) =>
      followUp.status === "Open" &&
      Boolean(followUp.due_date) &&
      followUp.due_date < today,
  );

  const dueTodayFollowUps = followUpRecords.filter(
    (followUp) =>
      followUp.status === "Open" &&
      Boolean(followUp.due_date) &&
      followUp.due_date === today,
  );

  const upcomingFollowUps = followUpRecords.filter(
    (followUp) =>
      followUp.status === "Open" &&
      Boolean(followUp.due_date) &&
      followUp.due_date > today,
  );

  const disconnectedFollowUps = followUpRecords.filter(
    (followUp) => !followUp.customer_id && !followUp.lead_id,
  );

  const missingMessage = followUpRecords.filter(
    (followUp) => !followUp.message,
  );

  const missingDueDate = followUpRecords.filter(
    (followUp) => !followUp.due_date,
  );

  const actionQueue = [
    ...overdueFollowUps,
    ...dueTodayFollowUps,
    ...upcomingFollowUps,
  ].slice(0, 10);

  const cleanupItems = [
    {
      label: "Follow-ups not connected to records",
      value: disconnectedFollowUps.length,
      description:
        "Follow-ups are most useful when connected to a customer or opportunity.",
    },
    {
      label: "Follow-ups missing message",
      value: missingMessage.length,
      description:
        "A clear message makes it easier to know what action needs to happen.",
    },
    {
      label: "Follow-ups missing due date",
      value: missingDueDate.length,
      description: "Due dates turn reminders into an actual action queue.",
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
          eyebrow="Workflow"
          title="Action Queue"
          description={`Track ${profile.labels.followUpPlural.toLowerCase()}, overdue reminders, upcoming actions, and relationship tasks so important follow-up does not get lost.`}
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Open actions"
            value={openFollowUps.length}
            helper={`${totalFollowUps} total reminders`}
          />

          <StatCard
            label="Overdue"
            value={overdueFollowUps.length}
            helper="Open reminders past due"
            tone={overdueFollowUps.length > 0 ? "danger" : "default"}
          />

          <StatCard
            label="Due today"
            value={dueTodayFollowUps.length}
            helper="Open reminders due today"
            tone={dueTodayFollowUps.length > 0 ? "warning" : "default"}
          />

          <StatCard
            label="Completed"
            value={completedFollowUps.length}
            helper="Closed reminders"
            tone={completedFollowUps.length > 0 ? "positive" : "default"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.75fr_1.25fr]">
          <SectionCard
            title="Add follow-up"
            description="Create a reminder tied to a customer, opportunity, or general action."
          >
            <form action={createFollowUpAction} className="space-y-4 p-5">
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
                  Related {profile.labels.leadSingular.toLowerCase()}
                </label>
                <select
                  name="leadId"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">No opportunity linked</option>
                  {leadRecords.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.service_requested}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Due date
                  </label>
                  <input
                    name="dueDate"
                    type="date"
                    required
                    defaultValue={today}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue="Open"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {followUpStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Action
                </label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  placeholder="Call back about estimate, send invoice reminder, check appointment availability, follow up on quote..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Save follow-up
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Today’s action queue"
            description="The most important reminders, ordered by urgency."
          >
            {actionQueue.length === 0 ? (
              <EmptyState
                title="No open actions"
                description="Nothing is overdue, due today, or upcoming right now."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {actionQueue.map((followUp) => (
                  <article
                    key={followUp.id}
                    className="grid gap-4 p-5 md:grid-cols-[1fr_160px_160px]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          tone={getFollowUpTone(
                            followUp.status,
                            followUp.due_date,
                          )}
                        >
                          {getFollowUpLabel(followUp.status, followUp.due_date)}
                        </StatusBadge>

                        <p className="text-xs font-medium text-slate-500">
                          Due {formatDate(followUp.due_date)}
                        </p>
                      </div>

                      <p className="mt-3 font-semibold text-slate-950">
                        {followUp.message}
                      </p>

                      <p className="mt-2 text-sm text-slate-600">
                        {getCustomerName(followUp.customers)}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Related: {getLeadName(followUp.leads)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Created
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {formatDate(followUp.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      <Link
                        href={`/follow-ups/${followUp.id}/edit`}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </Link>

                      {followUp.status === "Completed" ? (
                        <form action={reopenFollowUpAction}>
                          <input
                            type="hidden"
                            name="followUpId"
                            value={followUp.id}
                          />
                          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            Reopen
                          </button>
                        </form>
                      ) : (
                        <form action={completeFollowUpAction}>
                          <input
                            type="hidden"
                            name="followUpId"
                            value={followUp.id}
                          />
                          <button className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                            Complete
                          </button>
                        </form>
                      )}

                      <form action={deleteFollowUpAction}>
                        <input
                          type="hidden"
                          name="followUpId"
                          value={followUp.id}
                        />
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
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <SectionCard
            title="Queue health"
            description="A clean view of what is overdue, due today, upcoming, and completed."
          >
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">Overdue</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {overdueFollowUps.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Open reminders past due.
                </p>
              </div>

              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">Due today</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {dueTodayFollowUps.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Needs attention today.
                </p>
              </div>

              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">Upcoming</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {upcomingFollowUps.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Scheduled for later.
                </p>
              </div>

              <div className="p-5">
                <p className="text-sm font-medium text-slate-500">Completed</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {completedFollowUps.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Closed reminders.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Cleanup queue"
            description="Fix these items to keep the action queue useful and connected."
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
        </section>

        <SectionCard
          title="All follow-ups"
          description="Every reminder, action item, callback, and relationship task stored in the workspace."
        >
          {followUpRecords.length === 0 ? (
            <EmptyState
              title="No follow-ups yet"
              description="Add your first follow-up to create an action queue for the business."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {followUpRecords.map((followUp) => (
                <article
                  key={followUp.id}
                  className="grid gap-4 p-5 md:grid-cols-[1.1fr_1fr_130px_150px]"
                >
                  <div>
                    <StatusBadge
                      tone={getFollowUpTone(followUp.status, followUp.due_date)}
                    >
                      {getFollowUpLabel(followUp.status, followUp.due_date)}
                    </StatusBadge>

                    <p className="mt-3 font-semibold text-slate-950">
                      {followUp.message}
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                      {getCustomerName(followUp.customers)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Related: {getLeadName(followUp.leads)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Dates</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Due: {formatDate(followUp.due_date)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Added: {formatDate(followUp.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">Status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {followUp.status || "Unknown"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Link
                      href={`/follow-ups/${followUp.id}/edit`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </Link>

                    {followUp.status === "Completed" ? (
                      <form action={reopenFollowUpAction}>
                        <input
                          type="hidden"
                          name="followUpId"
                          value={followUp.id}
                        />
                        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Reopen
                        </button>
                      </form>
                    ) : (
                      <form action={completeFollowUpAction}>
                        <input
                          type="hidden"
                          name="followUpId"
                          value={followUp.id}
                        />
                        <button className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                          Complete
                        </button>
                      </form>
                    )}

                    <form action={deleteFollowUpAction}>
                      <input
                        type="hidden"
                        name="followUpId"
                        value={followUp.id}
                      />
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

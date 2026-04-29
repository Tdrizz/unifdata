import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value: number | string | null) {
  return `$${Number(value || 0).toLocaleString()}`;
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

export default async function CrmDashboardPage() {
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
  const today = getTodayString();

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select(
      `
      id,
      status,
      estimated_value,
      source,
      service_requested,
      next_follow_up_date,
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

  const { data: followUps, error: followUpsError } = await supabase
    .from("follow_ups")
    .select(
      `
      id,
      due_date,
      status,
      message,
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

  const totalLeads = leads?.length || 0;

  const openLeads =
    leads?.filter((lead) => !["Won", "Lost"].includes(lead.status)).length || 0;

  const wonLeads = leads?.filter((lead) => lead.status === "Won").length || 0;

  const openEstimateValue =
    leads
      ?.filter((lead) => lead.status === "Estimate Sent")
      .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0) || 0;

  const followUpsDue =
    followUps?.filter(
      (followUp) => followUp.status === "Open" && followUp.due_date <= today,
    ).length || 0;

  const statusCounts = [
    "New",
    "Contacted",
    "Estimate Sent",
    "Needs Follow-Up",
    "Won",
    "Lost",
  ].map((status) => ({
    status,
    count: leads?.filter((lead) => lead.status === status).length || 0,
  }));

  const recentLeads = leads?.slice(0, 8) || [];

  const dueFollowUps =
    followUps
      ?.filter(
        (followUp) => followUp.status === "Open" && followUp.due_date <= today,
      )
      .slice(0, 8) || [];

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="CRM Dashboard"
          title="Pipeline and follow-up control"
          description="Track where leads stand, which estimates need attention, and what follow-ups are due."
          actions={
            <Link
              href="/leads"
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Add or manage leads
            </Link>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total leads"
            value={totalLeads}
            helper="All pipeline records"
          />
          <StatCard
            label="Open leads"
            value={openLeads}
            helper="Not won or lost"
          />
          <StatCard
            label="Open estimates"
            value={formatCurrency(openEstimateValue)}
            helper="Estimate Sent value"
          />
          <StatCard
            label="Follow-ups due"
            value={followUpsDue}
            helper="Open reminders due now"
            tone={followUpsDue > 0 ? "warning" : "default"}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard
            title="Pipeline status"
            description="Lead count by current status."
          >
            <div className="space-y-4 p-5">
              {statusCounts.map((item) => (
                <div key={item.status}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      {item.status}
                    </p>
                    <p className="text-sm font-semibold text-slate-950">
                      {item.count}
                    </p>
                  </div>

                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-slate-950"
                      style={{
                        width: `${totalLeads ? Math.max(6, (item.count / totalLeads) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Due follow-ups"
            description="Contacts that need attention now."
            actions={
              <Link
                href="/follow-ups"
                className="text-sm font-semibold text-slate-600 hover:text-slate-950"
              >
                View all →
              </Link>
            }
          >
            {dueFollowUps.length === 0 ? (
              <EmptyState
                title="No urgent follow-ups"
                description="Nothing is due today or overdue."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {dueFollowUps.map((followUp) => (
                  <div key={followUp.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {getCustomerName(followUp.customers)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {followUp.message}
                        </p>
                      </div>

                      <StatusBadge tone="warning">
                        {new Date(followUp.due_date).toLocaleDateString()}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        <SectionCard
          title="Recent leads"
          description="Newest opportunities added to the pipeline."
        >
          {recentLeads.length === 0 ? (
            <EmptyState
              title="No leads yet"
              description="Add leads to begin tracking pipeline value."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="grid gap-4 p-5 md:grid-cols-[1fr_180px_140px]"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {getCustomerName(lead.customers)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {lead.service_requested}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Source: {lead.source || "Unknown"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Estimated value
                    </p>
                    <p className="mt-1 font-semibold text-slate-950">
                      {formatCurrency(lead.estimated_value)}
                    </p>
                  </div>

                  <div className="md:text-right">
                    <StatusBadge>{lead.status}</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}

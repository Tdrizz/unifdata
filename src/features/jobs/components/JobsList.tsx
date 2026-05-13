import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DismissError } from "@/components/ui/DismissError";
import { formatDateOnly } from "@/lib/date-format";
import { formatCurrency } from "@/lib/utils";
import { isCompleteWork, isCancelledWork, isUnpaid, getWorkTone, getRevenueTone } from "@/lib/status";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { JobListRow, CustomerRow, LeadRow } from "../types";
import { createJobAction } from "../actions";

type Props = {
  jobs: JobListRow[];
  count: number;
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  leads: Pick<LeadRow, "id" | "service_requested" | "status" | "estimated_value">[];
  profile: IndustryProfile;
  selectedStage: string;
  errorParam: string;
};

function getStageExplanation(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("scheduled")) {
    return { meaning: "Planned work that has not started yet." };
  }

  if (normalized.includes("active") || normalized.includes("progress")) {
    return { meaning: "Work currently being delivered." };
  }

  if (
    normalized.includes("complete") ||
    normalized.includes("done") ||
    normalized.includes("finished")
  ) {
    return { meaning: "Finished work that should be checked against payment." };
  }

  if (normalized.includes("cancel")) {
    return { meaning: "Work that is no longer moving forward." };
  }

  return { meaning: "Work using a custom or imported stage." };
}

function getWorkNextStep(work: JobListRow) {
  if (!work.customer_id) {
    return "Link this work to the person or business it belongs to.";
  }

  if (work.job_value === null || work.job_value === undefined) {
    return "Add a work value so this shows correctly in reporting.";
  }

  if (!work.start_date && !isCompleteWork(work.status)) {
    return "Add a start date so the team knows when this work begins.";
  }

  if (isCompleteWork(work.status) && isUnpaid(work.paid_status)) {
    return "Work is complete, but payment still needs attention.";
  }

  if (!work.lead_id) {
    return "Link this work to the opportunity it came from if one exists.";
  }

  if (isCancelledWork(work.status)) {
    return "This work is cancelled. Keep it out of active planning.";
  }

  if (isCompleteWork(work.status)) {
    return "This work is complete. Confirm payment and reporting are correct.";
  }

  return "Keep this work updated as it moves toward completion.";
}

function getWorkIssues(work: JobListRow) {
  const issues: { label: string; tone: "success" | "warning" | "danger" | "neutral" }[] = [];

  if (!work.customer_id) {
    issues.push({ label: "Link person", tone: "warning" });
  }

  if (!work.lead_id) {
    issues.push({ label: "No opportunity", tone: "neutral" });
  }

  if (work.job_value === null || work.job_value === undefined) {
    issues.push({ label: "Add value", tone: "neutral" });
  }

  if (!work.start_date && !isCompleteWork(work.status)) {
    issues.push({ label: "Add start date", tone: "neutral" });
  }

  if (isCompleteWork(work.status) && isUnpaid(work.paid_status)) {
    issues.push({ label: "Payment needed", tone: "danger" });
  }

  if (issues.length === 0) {
    issues.push({ label: "Looks clean", tone: "success" });
  }

  return issues;
}

export function JobsList({ jobs, count: _count, customers, leads, profile, selectedStage, errorParam }: Props) {
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const leadById = new Map(leads.map((l) => [l.id, l]));

  const activeWork = jobs.filter(
    (work) => !isCompleteWork(work.status) && !isCancelledWork(work.status),
  );
  const completedWork = jobs.filter((work) => isCompleteWork(work.status));
  const unpaidWork = jobs.filter((work) => isUnpaid(work.paid_status));
  const missingValue = jobs.filter((work) => work.job_value === null || work.job_value === undefined);
  const missingPerson = jobs.filter((work) => !work.customer_id);
  const missingOpportunity = jobs.filter((work) => !work.lead_id);

  const activeValue = activeWork.reduce((sum, work) => sum + Number(work.job_value || 0), 0);
  const completedValue = completedWork.reduce((sum, work) => sum + Number(work.job_value || 0), 0);
  const unpaidValue = unpaidWork.reduce((sum, work) => sum + Number(work.job_value || 0), 0);

  const cleanupGroups = [
    {
      id: "missing-person",
      label: "Link person",
      title: "Work needs people or businesses",
      detail: "Work records should usually connect to whoever the work is for.",
      count: missingPerson.length,
      href: "/jobs",
    },
    {
      id: "missing-opportunity",
      label: "Link opportunity",
      title: "Work needs opportunity links",
      detail: "Linking work to opportunities helps track the full lifecycle.",
      count: missingOpportunity.length,
      href: "/jobs",
    },
    {
      id: "missing-value",
      label: "Add value",
      title: "Work records need values",
      detail: "Work value helps reporting reflect active and completed work.",
      count: missingValue.length,
      href: "/jobs",
    },
  ].filter((item) => item.count > 0);

  const prioritizedWork = [...jobs]
    .sort((a, b) => {
      const aActive = !isCompleteWork(a.status) && !isCancelledWork(a.status);
      const bActive = !isCompleteWork(b.status) && !isCancelledWork(b.status);
      if (aActive !== bActive) return aActive ? -1 : 1;
      const aUnpaid = isUnpaid(a.paid_status);
      const bUnpaid = isUnpaid(b.paid_status);
      if (aUnpaid !== bUnpaid) return aUnpaid ? -1 : 1;
      return Number(b.job_value || 0) - Number(a.job_value || 0);
    })
    .slice(0, 25);

  const visibleWork = selectedStage
    ? prioritizedWork.filter((work) => (work.status || "Scheduled") === selectedStage)
    : prioritizedWork;

  const stageGroups = Array.from(
    jobs.reduce((map, work) => {
      const status = work.status || "Scheduled";
      const current = map.get(status) || { status, count: 0, unpaidCount: 0 };
      current.count += 1;
      if (isUnpaid(work.paid_status)) current.unpaidCount += 1;
      map.set(status, current);
      return map;
    }, new Map<string, { status: string; count: number; unpaidCount: number }>()),
  )
    .map(([, group]) => group)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={profile.labels.jobPlural}
        title={`Track ${profile.labels.jobPlural.toLowerCase()} and active delivery`}
        description={`Use this page to see what ${profile.labels.jobPlural.toLowerCase()} are planned, active, complete, cancelled, or still need payment.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/leads"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Opportunities
            </Link>
            <Link
              href="/imports"
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Import data
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active work"
          value={activeWork.length}
          helper={`${formatCurrency(activeValue)} still in progress or scheduled`}
          tone={activeWork.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Completed work"
          value={formatCurrency(completedValue)}
          helper={`${completedWork.length} finished records`}
          tone={completedValue > 0 ? "positive" : "default"}
        />
        <StatCard
          label="Payment needed"
          value={formatCurrency(unpaidValue)}
          helper={`${unpaidWork.length} unpaid or partially paid records`}
          tone={unpaidValue > 0 ? "danger" : "positive"}
        />
        <StatCard
          label="Cleanup issues"
          value={cleanupGroups.reduce((sum, item) => sum + item.count, 0)}
          helper="Missing person, opportunity, or work value"
          tone={cleanupGroups.length > 0 ? "warning" : "positive"}
        />
      </section>

      <SectionCard
        title="Add work"
        description="Create work manually and optionally link it to a person or opportunity."
      >
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
            <div>
              <p className="font-semibold text-slate-950">Quick add</p>
              <p className="mt-1 text-sm text-slate-500">
                Add a job, project, appointment, service visit, or order.
              </p>
            </div>
            <span className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white group-open:hidden">
              Add work
            </span>
            <span className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 group-open:inline-flex">
              Close
            </span>
          </summary>

          <form action={createJobAction} className="border-t border-slate-100 p-5">
            {errorParam && <DismissError message={errorParam} />}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Link to person or business
                <select
                  name="customer_id"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">No linked person yet</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name || customer.email || customer.phone || "Unnamed person"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Link to opportunity
                <select
                  name="lead_id"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="">No linked opportunity yet</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.service_requested || formatCurrency(lead.estimated_value)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
              <label className="text-sm font-medium text-slate-700">
                Work name
                <input
                  name="service_type"
                  required
                  placeholder="Flooring install, website build, service visit..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Work value
                <input
                  name="job_value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="2500"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Work stage
                <select
                  name="status"
                  defaultValue="Scheduled"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Active">Active</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Payment status
                <select
                  name="paid_status"
                  defaultValue="Unpaid"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Start date
                <input
                  name="start_date"
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Completed date
                <input
                  name="completed_date"
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Create work
              </button>
            </div>
          </form>
        </details>
      </SectionCard>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr] items-start">
        <SectionCard
          title={selectedStage ? `${selectedStage} work` : "Work queue"}
          description={
            selectedStage
              ? `Showing work records currently marked ${selectedStage}.`
              : "The work that needs operational attention first."
          }
        >
          {visibleWork.length === 0 ? (
            <EmptyState
              title={selectedStage ? "No work in this stage" : "No work yet"}
              description={
                selectedStage
                  ? "No records match this selected work stage."
                  : "Add work manually or import work records from CSV or Google Sheets."
              }
            />
          ) : (
            <>
              {selectedStage && (
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Filtered by stage: {selectedStage}
                  </p>
                  <Link
                    href="/jobs"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Clear filter
                  </Link>
                </div>
              )}

              <div className="divide-y divide-slate-100">
                {visibleWork.map((work) => {
                  const customer = work.customer_id ? customerById.get(work.customer_id) : null;
                  const lead = work.lead_id ? leadById.get(work.lead_id) : null;
                  const issues = getWorkIssues(work);

                  return (
                    <Link key={work.id} href={`/jobs/${work.id}/edit`} className="block p-4 transition-colors hover:bg-slate-50">
                      <div className="grid gap-4 md:grid-cols-[1fr_130px_160px] md:items-start">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {work.service_type || "Untitled work"}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {customer?.name || lead?.service_requested || "No person or opportunity linked"}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {getWorkNextStep(work)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {issues.slice(0, 3).map((issue) => (
                              <StatusBadge key={issue.label} tone={issue.tone}>
                                {issue.label}
                              </StatusBadge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-500">Value</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatCurrency(work.job_value)}
                          </p>
                          <p className="mt-3 text-xs font-medium text-slate-500">Payment</p>
                          <div className="mt-1">
                            <StatusBadge tone={getRevenueTone(work.paid_status)}>
                              {work.paid_status || "Not set"}
                            </StatusBadge>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-500">Start</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {formatDateOnly(work.start_date)}
                          </p>
                          <p className="mt-3 text-xs font-medium text-slate-500">Stage</p>
                          <div className="mt-1">
                            <StatusBadge tone={getWorkTone(work.status)}>
                              {work.status || "Scheduled"}
                            </StatusBadge>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Work stages"
          description="Use this to filter the work queue by stage."
        >
          {stageGroups.length === 0 ? (
            <EmptyState
              title="No work stages yet"
              description="Work stages will appear here after records are added."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {stageGroups.map((group) => {
                const explanation = getStageExplanation(group.status);
                return (
                  <article
                    key={group.status}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_90px] md:items-center"
                  >
                    <div>
                      <StatusBadge tone={getWorkTone(group.status)}>
                        {group.status}
                      </StatusBadge>
                      <p className="mt-2 font-semibold text-slate-950">{group.count} Found</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{explanation.meaning}</p>
                      {group.unpaidCount > 0 && (
                        <span className="mt-3 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          {group.unpaidCount} need payment review
                        </span>
                      )}
                    </div>
                    <div className="md:text-right">
                      <Link
                        href={
                          selectedStage === group.status
                            ? "/jobs"
                            : `/jobs?stage=${encodeURIComponent(group.status)}`
                        }
                        className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {selectedStage === group.status ? "Clear" : "Review"}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard
        title="Work health"
        description="Cleanup issues that make work reporting less reliable."
      >
        {cleanupGroups.length === 0 ? (
          <EmptyState
            title="Work records look clean"
            description="No missing people, opportunities, or values were found."
          />
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-3">
            {cleanupGroups.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <StatusBadge tone="neutral">{item.label}</StatusBadge>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {item.count}
                  </span>
                </div>
                <p className="mt-3 font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

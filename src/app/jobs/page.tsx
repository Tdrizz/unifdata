import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DismissError } from "@/components/ui/DismissError";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatDateOnly } from "@/lib/date-format";
import { formatCurrency, getFormString, getOptionalNumber } from "@/lib/utils";
import { isCompleteWork, isCancelledWork, isUnpaid, getWorkTone, getRevenueTone } from "@/lib/status";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { SearchInput } from "@/components/ui/SearchInput";

type WorkRecord = {
  id: string;
  customer_id: string | null;
  lead_id: string | null;
  service_type: string | null;
  status: string | null;
  job_value: number | null;
  start_date: string | null;
  completed_date: string | null;
  paid_status: string | null;
  created_at: string;
};

type PersonRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

type OpportunityRecord = {
  id: string;
  service_requested: string | null;
  status: string | null;
  estimated_value: number | null;
};


function getStageExplanation(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("scheduled")) {
    return {
      meaning: "Planned work that has not started yet.",
    };
  }

  if (normalized.includes("active") || normalized.includes("progress")) {
    return {
      meaning: "Work currently being delivered.",
    };
  }

  if (
    normalized.includes("complete") ||
    normalized.includes("done") ||
    normalized.includes("finished")
  ) {
    return {
      meaning: "Finished work that should be checked against payment.",
    };
  }

  if (normalized.includes("cancel")) {
    return {
      meaning: "Work that is no longer moving forward.",
    };
  }

  return {
    meaning: "Work using a custom or imported stage.",
  };
}

function getWorkNextStep(work: WorkRecord) {
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

function getWorkIssues(work: WorkRecord) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
  }[] = [];

  if (!work.customer_id) {
    issues.push({
      label: "Link person",
      tone: "warning",
    });
  }

  if (!work.lead_id) {
    issues.push({
      label: "No opportunity",
      tone: "neutral",
    });
  }

  if (work.job_value === null || work.job_value === undefined) {
    issues.push({
      label: "Add value",
      tone: "neutral",
    });
  }

  if (!work.start_date && !isCompleteWork(work.status)) {
    issues.push({
      label: "Add start date",
      tone: "neutral",
    });
  }

  if (isCompleteWork(work.status) && isUnpaid(work.paid_status)) {
    issues.push({
      label: "Payment needed",
      tone: "danger",
    });
  }

  if (issues.length === 0) {
    issues.push({
      label: "Looks clean",
      tone: "success",
    });
  }

  return issues;
}

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; error?: string; q?: string }>;
}) {
  const params = await searchParams;
  const selectedStage = params.stage ? decodeURIComponent(params.stage) : "";
  const errorParam = params.error ? decodeURIComponent(params.error) : "";
  const rawQ = params.q ?? "";
  const q = rawQ ? decodeURIComponent(rawQ).toLowerCase() : "";

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

  async function createWork(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();

    if (!currentCompany) {
      redirect("/onboarding");
    }

    const { company } = currentCompany;

    const customerId = getFormString(formData, "customer_id");
    const leadId = getFormString(formData, "lead_id");
    const serviceType = getFormString(formData, "service_type");
    const status = getFormString(formData, "status") || "Scheduled";
    const jobValue = getOptionalNumber(formData, "job_value");
    const startDate = getFormString(formData, "start_date");
    const completedDate = getFormString(formData, "completed_date");
    const paidStatus = getFormString(formData, "paid_status") || "Unpaid";

    if (!serviceType) {
      redirect("/jobs?error=Work+name+is+required.");
    }

    const { error } = await supabase.from("jobs").insert({
      company_id: company.id,
      customer_id: customerId || null,
      lead_id: leadId || null,
      service_type: serviceType,
      status,
      job_value: jobValue,
      start_date: startDate || null,
      completed_date: completedDate || null,
      paid_status: paidStatus,
    });

    if (error) {
      redirect(`/jobs?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/jobs");
    revalidatePath("/workspace");
    redirect("/jobs");
  }

  // When searching, pre-fetch matching customer IDs so name search hits the DB
  let searchCustomerIds: string[] = [];
  if (q) {
    const { data: matchingCustomers } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", company.id)
      .ilike("name", `%${q}%`)
      .limit(500);
    searchCustomerIds = (matchingCustomers || []).map((c) => c.id);
  }

  const jobsFilter = q
    ? [
        `service_type.ilike.%${q}%`,
        `status.ilike.%${q}%`,
        ...(searchCustomerIds.length > 0
          ? [`customer_id.in.(${searchCustomerIds.join(",")})`]
          : []),
      ].join(",")
    : null;

  const [workResult, peopleResult, opportunitiesResult] = await Promise.all([
    jobsFilter
      ? supabase
          .from("jobs")
          .select("id, customer_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at")
          .eq("company_id", company.id)
          .or(jobsFilter)
          .order("created_at", { ascending: false })
          .limit(1000)
      : supabase
          .from("jobs")
          .select("id, customer_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(250),

    supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(250),

    supabase
      .from("leads")
      .select("id, service_requested, status, estimated_value")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  if (workResult.error) {
    throw new Error(workResult.error.message);
  }

  if (peopleResult.error) {
    throw new Error(peopleResult.error.message);
  }

  if (opportunitiesResult.error) {
    throw new Error(opportunitiesResult.error.message);
  }

  const workRecords = (workResult.data || []) as WorkRecord[];
  const people = (peopleResult.data || []) as PersonRecord[];
  const opportunities = (opportunitiesResult.data || []) as OpportunityRecord[];

  const personById = new Map(people.map((person) => [person.id, person]));
  const opportunityById = new Map(
    opportunities.map((opportunity) => [opportunity.id, opportunity]),
  );

  const filteredWorkRecords = workRecords;

  const activeWork = filteredWorkRecords.filter(
    (work) => !isCompleteWork(work.status) && !isCancelledWork(work.status),
  );

  const completedWork = filteredWorkRecords.filter((work) => isCompleteWork(work.status));

  const unpaidWork = filteredWorkRecords.filter((work) => isUnpaid(work.paid_status));

  const missingValue = filteredWorkRecords.filter(
    (work) => work.job_value === null || work.job_value === undefined,
  );

  const missingPerson = filteredWorkRecords.filter((work) => !work.customer_id);

  const missingOpportunity = workRecords.filter((work) => !work.lead_id);

  const activeValue = activeWork.reduce(
    (sum, work) => sum + Number(work.job_value || 0),
    0,
  );

  const completedValue = completedWork.reduce(
    (sum, work) => sum + Number(work.job_value || 0),
    0,
  );

  const unpaidValue = unpaidWork.reduce(
    (sum, work) => sum + Number(work.job_value || 0),
    0,
  );

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

  const WORK_LIMIT = 25;

  const prioritizedWork = [...filteredWorkRecords]
    .sort((a, b) => {
      const aActive = !isCompleteWork(a.status) && !isCancelledWork(a.status);
      const bActive = !isCompleteWork(b.status) && !isCancelledWork(b.status);

      if (aActive !== bActive) {
        return aActive ? -1 : 1;
      }

      const aUnpaid = isUnpaid(a.paid_status);
      const bUnpaid = isUnpaid(b.paid_status);

      if (aUnpaid !== bUnpaid) {
        return aUnpaid ? -1 : 1;
      }

      return Number(b.job_value || 0) - Number(a.job_value || 0);
    });

  const visibleWork = selectedStage
    ? prioritizedWork.filter(
        (work) => (work.status || "Scheduled") === selectedStage,
      )
    : prioritizedWork;

  const displayedWork = visibleWork.slice(0, WORK_LIMIT);

  const stageGroups = Array.from(
    workRecords.reduce((map, work) => {
      const status = work.status || "Scheduled";
      const current = map.get(status) || {
        status,
        count: 0,
        unpaidCount: 0,
      };

      current.count += 1;

      if (isUnpaid(work.paid_status)) {
        current.unpaidCount += 1;
      }

      map.set(status, current);

      return map;
    }, new Map<string, { status: string; count: number; unpaidCount: number }>()),
  )
    .map(([, group]) => group)
    .sort((a, b) => b.count - a.count);

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

            <form action={createWork} className="border-t border-slate-100 p-5">
              {errorParam && <DismissError message={errorParam} />}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Link to person or business
                  <select
                    name="customer_id"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="">No linked person yet</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name ||
                          person.email ||
                          person.phone ||
                          "Unnamed person"}
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
                    {opportunities.map((opportunity) => (
                      <option key={opportunity.id} value={opportunity.id}>
                        {opportunity.service_requested ||
                          formatCurrency(opportunity.estimated_value)}
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

        {workRecords.length >= 250 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Showing the 250 most recent {profile.labels.jobPlural.toLowerCase()} — older records may not appear. Use search to find specific entries.
          </div>
        )}

        <SearchInput placeholder={`Search ${profile.labels.jobPlural.toLowerCase()}...`} />

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr] items-start">
          <SectionCard
            title={selectedStage ? `${selectedStage} work` : "Work queue"}
            description={
              q
                ? `${filteredWorkRecords.length} ${profile.labels.jobPlural.toLowerCase()} match "${rawQ}"`
                : selectedStage
                  ? `Showing work records currently marked ${selectedStage}.`
                  : "The work that needs operational attention first."
            }
          >
            {visibleWork.length === 0 ? (
              <EmptyState
                title={q ? `No results for "${rawQ}"` : selectedStage ? "No work in this stage" : "No work yet"}
                description={
                  q
                    ? "Try a different search term."
                    : selectedStage
                      ? "No records match this selected work stage."
                      : "Add work manually or import work records from CSV or Google Sheets."
                }
                action={
                  !q && !selectedStage ? (
                    <Link href="/imports" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                      Import work records
                    </Link>
                  ) : undefined
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
                  {displayedWork.map((work) => {
                    const person = work.customer_id
                      ? personById.get(work.customer_id)
                      : null;

                    const opportunity = work.lead_id
                      ? opportunityById.get(work.lead_id)
                      : null;

                    const issues = getWorkIssues(work);

                    return (
                      <Link key={work.id} href={`/jobs/${work.id}/edit`} className="block p-4 transition-colors hover:bg-slate-50">
                        <div className="grid gap-4 md:grid-cols-[1fr_130px_160px] md:items-start">
                          <div>
                            <p className="font-semibold text-slate-950">
                              {work.service_type || "Untitled work"}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {person?.name ||
                                opportunity?.service_requested ||
                                "No person or opportunity linked"}
                            </p>

                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {getWorkNextStep(work)}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {issues.slice(0, 3).map((issue) => (
                                <StatusBadge
                                  key={issue.label}
                                  tone={issue.tone}
                                >
                                  {issue.label}
                                </StatusBadge>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-500">
                              Value
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {formatCurrency(work.job_value)}
                            </p>

                            <p className="mt-3 text-xs font-medium text-slate-500">
                              Payment
                            </p>
                            <div className="mt-1">
                              <StatusBadge
                                tone={getRevenueTone(work.paid_status)}
                              >
                                {work.paid_status || "Not set"}
                              </StatusBadge>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-500">
                              Start
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {formatDateOnly(work.start_date)}
                            </p>

                            <p className="mt-3 text-xs font-medium text-slate-500">
                              Stage
                            </p>
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
                  {visibleWork.length > WORK_LIMIT && (
                    <div className="border-t border-slate-100 p-4">
                      <Link href="/jobs" className="text-sm font-semibold text-slate-600 hover:text-slate-950">
                        See all {visibleWork.length} {profile.labels.jobPlural.toLowerCase()} →
                      </Link>
                    </div>
                  )}
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

                        <p className="mt-2 font-semibold text-slate-950">
                          {group.count} Found
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {explanation.meaning}
                        </p>

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
                              : `/jobs?stage=${encodeURIComponent(
                                  group.status,
                                )}`
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

                  <p className="mt-3 font-semibold text-slate-950">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {item.detail}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}





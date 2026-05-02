import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatDateOnly } from "@/lib/date-format";

type OpportunityRecord = {
  id: string;
  customer_id: string | null;
  service_requested: string | null;
  status: string | null;
  estimated_value: number | null;
  source: string | null;
  next_follow_up_date: string | null;
  notes: string | null;
  created_at: string;
};

type PersonRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getFormString(formData, key);

  if (!value) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getStatusTone(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("won") || normalized.includes("accepted")) {
    return "success" as const;
  }

  if (
    normalized.includes("lost") ||
    normalized.includes("cancel") ||
    normalized.includes("declined")
  ) {
    return "danger" as const;
  }

  if (
    normalized.includes("new") ||
    normalized.includes("open") ||
    normalized.includes("contact") ||
    normalized.includes("estimate") ||
    normalized.includes("follow")
  ) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function getOpportunityIssues(opportunity: OpportunityRecord) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
  }[] = [];

  if (!opportunity.customer_id) {
    issues.push({
      label: "Link person",
      tone: "warning",
    });
  }

  if (!opportunity.source) {
    issues.push({
      label: "Add source",
      tone: "neutral",
    });
  }

  if (
    opportunity.estimated_value === null ||
    opportunity.estimated_value === undefined
  ) {
    issues.push({
      label: "Add estimate",
      tone: "neutral",
    });
  }

  if (!opportunity.next_follow_up_date) {
    issues.push({
      label: "Add follow-up",
      tone: "warning",
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

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  async function updateOpportunity(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();

    if (!currentCompany) {
      redirect("/onboarding");
    }

    const { company } = currentCompany;

    const customerId = getFormString(formData, "customer_id");
    const serviceRequested = getFormString(formData, "service_requested");
    const status = getFormString(formData, "status") || "New";
    const estimatedValue = getOptionalNumber(formData, "estimated_value");
    const source = getFormString(formData, "source");
    const nextFollowUpDate = getFormString(formData, "next_follow_up_date");
    const notes = getFormString(formData, "notes");

    if (!serviceRequested) {
      throw new Error("Opportunity name is required.");
    }

    const { error } = await supabase
      .from("leads")
      .update({
        customer_id: customerId || null,
        service_requested: serviceRequested,
        status,
        estimated_value: estimatedValue,
        source: source || null,
        next_follow_up_date: nextFollowUpDate || null,
        notes: notes || null,
      })
      .eq("id", id)
      .eq("company_id", company.id);

    if (error) {
      throw new Error(error.message);
    }

    redirect("/leads");
  }

  const [opportunityResult, peopleResult] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, notes, created_at",
      )
      .eq("id", id)
      .eq("company_id", company.id)
      .maybeSingle(),

    supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  if (opportunityResult.error) {
    throw new Error(opportunityResult.error.message);
  }

  if (peopleResult.error) {
    throw new Error(peopleResult.error.message);
  }

  if (!opportunityResult.data) {
    redirect("/leads");
  }

  const opportunity = opportunityResult.data as OpportunityRecord;
  const people = (peopleResult.data || []) as PersonRecord[];
  const issues = getOpportunityIssues(opportunity);

  const linkedPerson = opportunity.customer_id
    ? people.find((person) => person.id === opportunity.customer_id)
    : null;

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#0f172a"}
      accentColor={company.accent_color || "#2563eb"}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Edit opportunity"
          title={opportunity.service_requested || "Untitled opportunity"}
          description="Update the linked person, value, source, status, follow-up date, and notes."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/leads"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to opportunities
              </Link>

              <Link
                href="/crm"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Pipeline
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <SectionCard
            title="Opportunity details"
            description="These fields control how this record appears in Pipeline, Follow-Ups, and Home."
          >
            <form action={updateOpportunity} className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Link to person or business
                  <select
                    name="customer_id"
                    defaultValue={opportunity.customer_id || ""}
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
                  Status
                  <select
                    name="status"
                    defaultValue={opportunity.status || "New"}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Estimate Sent">Estimate Sent</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Opportunity name
                <input
                  name="service_requested"
                  required
                  defaultValue={opportunity.service_requested || ""}
                  placeholder="Website redesign, flooring quote, monthly service plan..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium text-slate-700">
                  Estimated value
                  <input
                    name="estimated_value"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={opportunity.estimated_value ?? ""}
                    placeholder="2500"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Source
                  <input
                    name="source"
                    defaultValue={opportunity.source || ""}
                    placeholder="Referral, Google, Facebook, Website..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Next follow-up
                  <input
                    name="next_follow_up_date"
                    type="date"
                    defaultValue={opportunity.next_follow_up_date || ""}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Notes
                <textarea
                  name="notes"
                  rows={5}
                  defaultValue={opportunity.notes || ""}
                  placeholder="Add quote notes, next steps, or context..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
                <Link
                  href="/leads"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Save opportunity
                </button>
              </div>
            </form>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Record summary"
              description="How this opportunity is currently being interpreted."
            >
              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">
                    Linked to
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {linkedPerson?.name || "No person linked"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {linkedPerson?.email ||
                      linkedPerson?.phone ||
                      "Connect this opportunity to a person or business."}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Value</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {formatCurrency(opportunity.estimated_value)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Status</p>
                    <div className="mt-2">
                      <StatusBadge tone={getStatusTone(opportunity.status)}>
                        {opportunity.status || "New"}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">
                    Next follow-up
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {formatDateOnly(opportunity.next_follow_up_date)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    This date also appears on the Follow-Ups page.
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Cleanup"
              description="Issues affecting pipeline and follow-up reporting."
            >
              <div className="space-y-3 p-5">
                {issues.map((issue) => (
                  <div
                    key={issue.label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <StatusBadge tone={issue.tone}>{issue.label}</StatusBadge>

                    <p className="text-sm font-medium text-slate-500">
                      {issue.label === "Looks clean"
                        ? "No action needed"
                        : "Needs update"}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

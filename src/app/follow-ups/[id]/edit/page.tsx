import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input, Select } from "@/components/ui/Input";
import { DismissError } from "@/components/ui/DismissError";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatDateOnly, formatTimestampDate, parseDateOnly, getTodayDateOnly } from "@/lib/date-format";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getFormString, getDateInputValue } from "@/lib/utils";
import { getActionTone } from "@/lib/status";

type FollowUpRecord = {
  id: string;
  customer_id: string | null;
  message: string | null;
  due_date: string | null;
  status: string | null;
  created_at: string;
};

type PersonRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

function isComplete(status: string | null) {
  const n = String(status || "").toLowerCase();
  return n.includes("complete") || n.includes("done") || n.includes("closed");
}

function isOverdue(date: string | null, status: string | null) {
  const target = parseDateOnly(date);
  if (!target || isComplete(status)) return false;
  return target < getTodayDateOnly();
}

function isDueToday(date: string | null, status: string | null) {
  const target = parseDateOnly(date);
  if (!target || isComplete(status)) return false;
  return target.getTime() === getTodayDateOnly().getTime();
}

function getDueTone(action: FollowUpRecord) {
  if (isComplete(action.status)) return "success" as const;
  if (isOverdue(action.due_date, action.status)) return "danger" as const;
  if (isDueToday(action.due_date, action.status)) return "warning" as const;
  return "neutral" as const;
}

function getDueLabel(action: FollowUpRecord) {
  if (isComplete(action.status)) return "Complete";
  if (!action.due_date) return "No due date";
  if (isOverdue(action.due_date, action.status)) return `Overdue ${formatDateOnly(action.due_date)}`;
  if (isDueToday(action.due_date, action.status)) return "Due today";
  return `Due ${formatDateOnly(action.due_date)}`;
}

function getActionNextStep(action: FollowUpRecord) {
  if (!action.customer_id)
    return "Link this follow-up to the person or business it belongs to.";
  if (!action.message)
    return "Add a clear action so this follow-up is understandable.";
  if (!action.due_date && !isComplete(action.status))
    return "Add a due date so this follow-up can be prioritized.";
  if (isOverdue(action.due_date, action.status))
    return "This follow-up is overdue. Review it or mark it complete.";
  if (isDueToday(action.due_date, action.status))
    return "This follow-up is due today.";
  if (isComplete(action.status))
    return "This follow-up is complete.";
  return "Keep this follow-up updated as work moves forward.";
}

function getActionIssues(action: FollowUpRecord) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
    detail: string;
  }[] = [];

  if (!action.customer_id)
    issues.push({
      label: "Link person",
      tone: "warning",
      detail: "Follow-ups are more useful when connected to who they are for.",
    });

  if (!action.message)
    issues.push({
      label: "Add action",
      tone: "warning",
      detail: "A clear action makes the follow-up understandable.",
    });

  if (!action.due_date && !isComplete(action.status))
    issues.push({
      label: "Add due date",
      tone: "neutral",
      detail: "Due dates help the priority queue sort work correctly.",
    });

  if (isOverdue(action.due_date, action.status))
    issues.push({
      label: "Overdue",
      tone: "danger",
      detail: "This follow-up is past due and still open.",
    });

  if (isDueToday(action.due_date, action.status))
    issues.push({
      label: "Due today",
      tone: "warning",
      detail: "This follow-up should be handled today.",
    });

  if (!action.status)
    issues.push({
      label: "Add status",
      tone: "neutral",
      detail: "Status makes it clear whether this is still open or complete.",
    });

  if (issues.length === 0)
    issues.push({
      label: "Looks clean",
      tone: "success",
      detail: "This follow-up has the key fields needed for tracking.",
    });

  return issues;
}

export default async function EditFollowUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  async function updateFollowUp(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const currentCompany = await getCurrentCompany();
    if (!currentCompany) redirect("/onboarding");

    const { company } = currentCompany;

    const customerId = getFormString(formData, "customer_id");
    const message = getFormString(formData, "message");
    const dueDate = getFormString(formData, "due_date");
    const status = getFormString(formData, "status") || "Open";

    if (!message) {
      redirect(`/follow-ups/${id}/edit?error=Follow-up+action+is+required.`);
    }

    const { error } = await supabase
      .from("follow_ups")
      .update({
        customer_id: customerId || null,
        message,
        due_date: dueDate || null,
        status,
      })
      .eq("id", id)
      .eq("company_id", company.id);

    if (error) {
      redirect(`/follow-ups/${id}/edit?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/follow-ups");
    revalidatePath("/workspace");
    redirect("/follow-ups");
  }

  const [followUpResult, peopleResult] = await Promise.all([
    supabase
      .from("follow_ups")
      .select("id, customer_id, message, due_date, status, created_at")
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

  if (followUpResult.error) throw new Error(followUpResult.error.message);
  if (peopleResult.error) throw new Error(peopleResult.error.message);
  if (!followUpResult.data) redirect("/follow-ups");

  const action = followUpResult.data as FollowUpRecord;
  const people = (peopleResult.data || []) as PersonRecord[];
  const linkedPerson = action.customer_id
    ? people.find((person) => person.id === action.customer_id)
    : null;
  const issues = getActionIssues(action);

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
          eyebrow="Edit follow-up"
          title={action.message || "Untitled follow-up"}
          description={`Update the linked ${profile.labels.customerSingular.toLowerCase()}, action, due date, and status for this follow-up.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/follow-ups"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to Follow-Ups
              </Link>
              <Link
                href="/customers"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                People
              </Link>
            </div>
          }
        />

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <SectionCard
            title="Follow-up details"
            description="These fields control how this record appears in Home and the Follow-Up priority queue."
          >
            <form action={updateFollowUp} className="space-y-5 p-5">
              {errorParam && <DismissError message={errorParam} />}

              <FormField label="Link to person or business">
                <Select name="customer_id" defaultValue={action.customer_id || ""}>
                  <option value="">No linked person yet</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name || person.email || person.phone || "Unnamed person"}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Follow-up action">
                <Input
                  name="message"
                  required
                  defaultValue={action.message || ""}
                  placeholder="Call customer, send quote, check payment, schedule job..."
                />
              </FormField>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Due date">
                  <Input
                    name="due_date"
                    type="date"
                    defaultValue={getDateInputValue(action.due_date)}
                  />
                </FormField>

                <FormField label="Status">
                  <Select name="status" defaultValue={action.status || "Open"}>
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="Follow Up">Follow Up</option>
                    <option value="Complete">Complete</option>
                  </Select>
                </FormField>
              </div>

              <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
                <Link
                  href="/follow-ups"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>
                <SubmitButton>Save follow-up</SubmitButton>
              </div>
            </form>
          </SectionCard>

          <div className="space-y-5">
            <SectionCard
              title="Record summary"
              description="How this follow-up is currently being interpreted."
            >
              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Next step</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {getActionNextStep(action)}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Due</p>
                    <div className="mt-2">
                      <StatusBadge tone={getDueTone(action)}>
                        {getDueLabel(action)}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">Status</p>
                    <div className="mt-2">
                      <StatusBadge tone={getActionTone(action.status)}>
                        {action.status || "Open"}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                <SummaryCard
                  label="Linked person"
                  value={linkedPerson?.name || "No person linked"}
                  helper={
                    linkedPerson?.email ||
                    linkedPerson?.phone ||
                    "Connect this follow-up to a person or business."
                  }
                />

                <SummaryCard
                  label="Added"
                  value={formatTimestampDate(action.created_at)}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Cleanup"
              description="Issues affecting follow-up priority and tracking."
            >
              <div className="space-y-3 p-5">
                {issues.map((issue) => (
                  <div
                    key={issue.label}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <StatusBadge tone={issue.tone}>{issue.label}</StatusBadge>
                      <p className="text-sm font-medium text-slate-500">
                        {issue.label === "Looks clean"
                          ? "No action needed"
                          : "Needs update"}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {issue.detail}
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

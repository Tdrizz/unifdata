import Link from "next/link";
import { SectionCard } from "@/components/ui/SectionCard";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input, Select } from "@/components/ui/Input";
import { DismissError } from "@/components/ui/DismissError";
import { DeleteConfirm } from "@/components/ui/DeleteConfirm";
import { formatDateOnly, formatTimestampDate } from "@/lib/date-format";
import { formatCurrency, getDateInputValue } from "@/lib/utils";
import { isCompleteWork, isUnpaid, getWorkTone } from "@/lib/status";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { JobListRow, CustomerRow, LeadRow } from "../types";
import { updateJobAction, deleteJobAction } from "../actions";

type Props = {
  job: JobListRow;
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  leads: Pick<LeadRow, "id" | "service_requested" | "status" | "estimated_value">[];
  profile: IndustryProfile;
  errorParam?: string;
};

function isCancelled(status: string | null) {
  return String(status || "").toLowerCase().includes("cancel");
}

function getWorkNextStep(work: JobListRow) {
  if (!work.customer_id)
    return "Link this work to the person or business it belongs to.";
  if (!work.lead_id)
    return "Link this work to the opportunity it came from if one exists.";
  if (work.job_value === null || work.job_value === undefined)
    return "Add a work value so this shows correctly in reporting.";
  if (!work.start_date && !isCompleteWork(work.status))
    return "Add a start date so the team knows when this work begins.";
  if (isCompleteWork(work.status) && isUnpaid(work.paid_status))
    return "Work is complete, but payment still needs attention.";
  if (isCancelled(work.status))
    return "This work is cancelled. Keep it out of active planning.";
  if (isCompleteWork(work.status))
    return "This work is complete. Confirm payment and reporting are correct.";
  return "Keep this work updated as it moves toward completion.";
}

function getWorkIssues(work: JobListRow) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
    detail: string;
  }[] = [];

  if (!work.customer_id)
    issues.push({
      label: "Link person",
      tone: "warning",
      detail: "Work should usually connect to whoever it is for.",
    });

  if (!work.lead_id)
    issues.push({
      label: "Link opportunity",
      tone: "neutral",
      detail: "Linking work to an opportunity keeps the full lifecycle connected.",
    });

  if (work.job_value === null || work.job_value === undefined)
    issues.push({
      label: "Add value",
      tone: "neutral",
      detail: "Work value keeps active and completed work reporting accurate.",
    });

  if (!work.start_date && !isCompleteWork(work.status))
    issues.push({
      label: "Add start date",
      tone: "neutral",
      detail: "Start date helps with scheduling and planning.",
    });

  if (isCompleteWork(work.status) && isUnpaid(work.paid_status))
    issues.push({
      label: "Payment needed",
      tone: "danger",
      detail: "Completed work should be checked against payment.",
    });

  if (issues.length === 0)
    issues.push({
      label: "Looks clean",
      tone: "success",
      detail: "This work record has the key fields needed for reporting.",
    });

  return issues;
}

export function JobForm({ job, customers, leads, profile: _profile, errorParam }: Props) {
  const updateAction = updateJobAction.bind(null, job.id);
  const deleteAction = deleteJobAction.bind(null, job.id);

  const linkedCustomer = job.customer_id
    ? customers.find((c) => c.id === job.customer_id)
    : null;
  const linkedLead = job.lead_id
    ? leads.find((l) => l.id === job.lead_id)
    : null;
  const issues = getWorkIssues(job);

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
        <SectionCard
          title="Work details"
          description="These fields control how this work appears in Home, Work, and reporting."
        >
          <form action={updateAction} className="space-y-5 p-5">
            {errorParam && <DismissError message={errorParam} />}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Link to person or business">
                <Select name="customer_id" defaultValue={job.customer_id || ""}>
                  <option value="">No linked person yet</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name || customer.email || customer.phone || "Unnamed person"}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Link to opportunity">
                <Select name="lead_id" defaultValue={job.lead_id || ""}>
                  <option value="">No linked opportunity yet</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.service_requested || formatCurrency(lead.estimated_value)}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <FormField label="Work name">
              <Input
                name="service_type"
                required
                defaultValue={job.service_type || ""}
                placeholder="Flooring install, website build, service visit…"
              />
            </FormField>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Work value">
                <Input
                  name="job_value"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={job.job_value ?? ""}
                  placeholder="2500"
                />
              </FormField>

              <FormField label="Work stage">
                <Select name="status" defaultValue={job.status || "Scheduled"}>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Active">Active</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </Select>
              </FormField>

              <FormField label="Payment status">
                <Select name="paid_status" defaultValue={job.paid_status || "Unpaid"}>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                </Select>
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Start date">
                <Input
                  name="start_date"
                  type="date"
                  defaultValue={getDateInputValue(job.start_date)}
                />
              </FormField>

              <FormField label="Completed date">
                <Input
                  name="completed_date"
                  type="date"
                  defaultValue={getDateInputValue(job.completed_date)}
                />
              </FormField>
            </div>

            <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
              <Link
                href="/jobs"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
              <SubmitButton>Save work</SubmitButton>
            </div>
          </form>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard
            title="Record summary"
            description="How this work record is currently being interpreted."
          >
            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Next step</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {getWorkNextStep(job)}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <SummaryCard label="Value" value={formatCurrency(job.job_value)} />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">Stage</p>
                  <div className="mt-2">
                    <StatusBadge tone={getWorkTone(job.status)}>
                      {job.status || "Scheduled"}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <SummaryCard
                  label="Linked person"
                  value={linkedCustomer?.name || "No person linked"}
                  helper={
                    linkedCustomer?.email ||
                    linkedCustomer?.phone ||
                    "Connect this work to a person or business."
                  }
                />
                <SummaryCard
                  label="Linked opportunity"
                  value={linkedLead?.service_requested || "No opportunity linked"}
                  helper={
                    linkedLead?.status ||
                    "Optional, but useful for lifecycle tracking."
                  }
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <SummaryCard label="Start" value={formatDateOnly(job.start_date)} />
                <SummaryCard label="Added" value={formatTimestampDate(job.created_at)} />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Cleanup"
            description="Issues affecting work, payment, and reporting."
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
                      {issue.label === "Looks clean" ? "No action needed" : "Needs update"}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{issue.detail}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Danger zone" description="Permanent actions that cannot be undone.">
            <div className="p-5">
              <DeleteConfirm
                action={deleteAction}
                description="This will permanently delete this work record. Linked people, opportunities, and follow-ups will lose this connection but will not be deleted."
              />
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}

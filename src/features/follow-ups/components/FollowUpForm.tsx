"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SectionCard } from "@/components/ui/SectionCard";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input, Select } from "@/components/ui/Input";
import { DeleteConfirm } from "@/components/ui/DeleteConfirm";
import { formatDateOnly, formatTimestampDate, parseDateOnly, getTodayDateOnly } from "@/lib/date-format";
import { getActionTone } from "@/lib/status";
import { getDateInputValue } from "@/lib/utils";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { updateFollowUpAction, deleteFollowUpAction, type ActionState } from "../actions";
import type { FollowUpRow } from "../types";
import type { ContactForSelect } from "@/lib/crm/types";

type Props = {
  followUp: FollowUpRow;
  people: ContactForSelect[];
  profile: IndustryProfile;
  errorParam?: string;
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

function getDueTone(action: FollowUpRow) {
  if (isComplete(action.status)) return "success" as const;
  if (isOverdue(action.due_date, action.status)) return "danger" as const;
  if (isDueToday(action.due_date, action.status)) return "warning" as const;
  return "neutral" as const;
}

function getDueLabel(action: FollowUpRow) {
  if (isComplete(action.status)) return "Complete";
  if (!action.due_date) return "No due date";
  if (isOverdue(action.due_date, action.status)) return `Overdue ${formatDateOnly(action.due_date)}`;
  if (isDueToday(action.due_date, action.status)) return "Due today";
  return `Due ${formatDateOnly(action.due_date)}`;
}

function getActionNextStep(action: FollowUpRow) {
  if (!action.contact_id && !action.customer_id)
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

function getActionIssues(action: FollowUpRow) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
    detail: string;
  }[] = [];

  if (!action.contact_id && !action.customer_id)
    issues.push({ label: "Link person", tone: "warning", detail: "Follow-ups are more useful when connected to who they are for." });
  if (!action.message)
    issues.push({ label: "Add action", tone: "warning", detail: "A clear action makes the follow-up understandable." });
  if (!action.due_date && !isComplete(action.status))
    issues.push({ label: "Add due date", tone: "neutral", detail: "Due dates help the priority queue sort work correctly." });
  if (isOverdue(action.due_date, action.status))
    issues.push({ label: "Overdue", tone: "danger", detail: "This follow-up is past due and still open." });
  if (isDueToday(action.due_date, action.status))
    issues.push({ label: "Due today", tone: "warning", detail: "This follow-up should be handled today." });
  if (!action.status)
    issues.push({ label: "Add status", tone: "neutral", detail: "Status makes it clear whether this is still open or complete." });
  if (issues.length === 0)
    issues.push({ label: "Looks clean", tone: "success", detail: "This follow-up has the key fields needed for tracking." });

  return issues;
}

export function FollowUpForm({ followUp, people, profile: _profile }: Props) {
  const boundUpdateAction = updateFollowUpAction.bind(null, followUp.id);
  const deleteAction = deleteFollowUpAction.bind(null, followUp.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const followUpContactId = (followUp as any).contact_id ?? followUp.customer_id;
  const linkedPerson = followUpContactId ? people.find((p) => p.id === followUpContactId) : null;
  const issues = getActionIssues(followUp);

  const [state, formAction] = useActionState<ActionState, FormData>(
    boundUpdateAction,
    null,
  );

  return (
    <div className="space-y-5 pb-8">
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
        <SectionCard
          title="Follow-up details"
          description="These fields control how this record appears in Home and the Follow-Up priority queue."
        >
          <form action={formAction} className="space-y-5 p-5">
            {state?.error && (
              <p className="rounded-[10px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {state.error}
              </p>
            )}

            <FormField label="Link to person or business">
              <Select name="contact_id" defaultValue={followUpContactId || ""}>
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
                defaultValue={followUp.message || ""}
                placeholder="Call customer, send quote, check payment, schedule job..."
              />
              {state?.fieldErrors?.message && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.message}</p>
              )}
            </FormField>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Due date">
                <Input
                  name="due_date"
                  type="date"
                  defaultValue={getDateInputValue(followUp.due_date)}
                />
              </FormField>

              <FormField label="Status">
                <Select name="status" defaultValue={followUp.status || "Open"}>
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
                className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk"
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
              <div className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4">
                <p className="text-sm font-medium text-ud-faint">Next step</p>
                <p className="mt-1 text-sm leading-6 text-ud-muted">
                  {getActionNextStep(followUp)}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4">
                  <p className="text-sm font-medium text-ud-faint">Due</p>
                  <div className="mt-2">
                    <StatusBadge tone={getDueTone(followUp)}>{getDueLabel(followUp)}</StatusBadge>
                  </div>
                </div>

                <div className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4">
                  <p className="text-sm font-medium text-ud-faint">Status</p>
                  <div className="mt-2">
                    <StatusBadge tone={getActionTone(followUp.status)}>
                      {followUp.status || "Open"}
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
                value={formatTimestampDate(followUp.created_at)}
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
                  className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge tone={issue.tone}>{issue.label}</StatusBadge>
                    <p className="text-sm font-medium text-ud-faint">
                      {issue.label === "Looks clean" ? "No action needed" : "Needs update"}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ud-muted">{issue.detail}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Danger zone" description="Permanent actions that cannot be undone.">
            <div className="p-5">
              <DeleteConfirm
                action={deleteAction}
                description="This will permanently delete this follow-up. Linked people will not be affected."
              />
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}

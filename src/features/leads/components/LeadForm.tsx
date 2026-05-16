"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SectionCard } from "@/components/ui/SectionCard";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { DeleteConfirm } from "@/components/ui/DeleteConfirm";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateOnly } from "@/lib/date-format";
import { formatCurrency } from "@/lib/utils";
import { getOpportunityTone } from "@/lib/status";
import { OPPORTUNITY_STATUSES } from "@/lib/constants";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { LeadRow, CustomerRow } from "../types";
import { updateLeadAction, deleteLeadAction, type ActionState } from "../actions";

type Props = {
  lead: LeadRow;
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  profile: IndustryProfile;
  errorParam?: string;
};

function getOpportunityIssues(lead: LeadRow) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
  }[] = [];

  if (!lead.customer_id) {
    issues.push({ label: "Link person", tone: "warning" });
  }
  if (!lead.source) {
    issues.push({ label: "Add source", tone: "neutral" });
  }
  if (lead.estimated_value === null || lead.estimated_value === undefined) {
    issues.push({ label: "Add estimate", tone: "neutral" });
  }
  if (!lead.next_follow_up_date) {
    issues.push({ label: "Add follow-up", tone: "warning" });
  }
  if (issues.length === 0) {
    issues.push({ label: "Looks clean", tone: "success" });
  }
  return issues;
}

export function LeadForm({ lead, customers, profile }: Props) {
  const issues = getOpportunityIssues(lead);
  const linkedCustomer = lead.customer_id
    ? customers.find((c) => c.id === lead.customer_id)
    : null;

  const boundUpdateAction = updateLeadAction.bind(null, lead.id);
  const deleteAction = deleteLeadAction.bind(null, lead.id);

  const [state, formAction] = useActionState<ActionState, FormData>(
    boundUpdateAction,
    null,
  );

  return (
    <div className="space-y-5 px-6 pt-5 pb-8">
      <PageHeader
        eyebrow={`Edit ${profile.labels.leadSingular.toLowerCase()}`}
        title={
          lead.service_requested ||
          `Untitled ${profile.labels.leadSingular.toLowerCase()}`
        }
        description={`Update the linked ${profile.labels.customerSingular.toLowerCase()}, value, source, status, follow-up date, and notes.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/leads"
              className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk"
            >
              Back to opportunities
            </Link>
            <Link
              href="/crm"
              className="rounded-[10px] bg-ud-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
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
          <form action={formAction} className="space-y-5 p-5">
            {state?.error && (
              <p className="rounded-[10px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {state.error}
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Link to person or business">
                <Select name="customer_id" defaultValue={lead.customer_id || ""}>
                  <option value="">No linked person yet</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name ||
                        customer.email ||
                        customer.phone ||
                        "Unnamed person"}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Status">
                <Select name="status" defaultValue={lead.status || "New"}>
                  {OPPORTUNITY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <FormField label="Opportunity name">
              <Input
                name="service_requested"
                required
                defaultValue={lead.service_requested || ""}
                placeholder="Website redesign, flooring quote, monthly service plan…"
              />
              {state?.fieldErrors?.service_requested && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.service_requested}</p>
              )}
            </FormField>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Estimated value">
                <Input
                  name="estimated_value"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={lead.estimated_value ?? ""}
                  placeholder="2500"
                />
                {state?.fieldErrors?.estimated_value && (
                  <p className="mt-1 text-sm text-red-600">{state.fieldErrors.estimated_value}</p>
                )}
              </FormField>

              <FormField label="Source">
                <Input
                  name="source"
                  defaultValue={lead.source || ""}
                  placeholder="Referral, Google, Facebook, Website…"
                />
              </FormField>

              <FormField label="Next follow-up">
                <Input
                  name="next_follow_up_date"
                  type="date"
                  defaultValue={lead.next_follow_up_date || ""}
                />
              </FormField>
            </div>

            <FormField label="Notes">
              <Textarea
                name="notes"
                rows={5}
                defaultValue={lead.notes || ""}
                placeholder="Add quote notes, next steps, or context…"
              />
            </FormField>

            <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
              <Link
                href="/leads"
                className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk"
              >
                Cancel
              </Link>
              <SubmitButton>Save opportunity</SubmitButton>
            </div>
          </form>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard
            title="Record summary"
            description="How this opportunity is currently being interpreted."
          >
            <div className="space-y-4 p-5">
              <SummaryCard
                label="Linked to"
                value={linkedCustomer?.name || "No person linked"}
                helper={
                  linkedCustomer?.email ||
                  linkedCustomer?.phone ||
                  "Connect this opportunity to a person or business."
                }
              />

              <div className="grid gap-3 md:grid-cols-2">
                <SummaryCard
                  label="Value"
                  value={formatCurrency(lead.estimated_value)}
                />

                <div className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4">
                  <p className="text-sm font-medium text-ud-faint">Status</p>
                  <div className="mt-2">
                    <StatusBadge tone={getOpportunityTone(lead.status)}>
                      {lead.status || "New"}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <SummaryCard
                label="Next follow-up"
                value={formatDateOnly(lead.next_follow_up_date)}
                helper="This date also appears on the Follow-Ups page."
              />
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
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-ud bg-ud-surface-sunk p-4"
                >
                  <StatusBadge tone={issue.tone}>{issue.label}</StatusBadge>
                  <p className="text-sm font-medium text-ud-faint">
                    {issue.label === "Looks clean" ? "No action needed" : "Needs update"}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Danger zone"
            description="Permanent actions that cannot be undone."
          >
            <div className="p-5">
              <DeleteConfirm
                action={deleteAction}
                description="This will permanently delete this opportunity. Linked jobs and follow-ups will lose this connection but will not be deleted."
              />
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}

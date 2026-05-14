"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SectionCard } from "@/components/ui/SectionCard";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { DeleteConfirm } from "@/components/ui/DeleteConfirm";
import { formatTimestampDate } from "@/lib/date-format";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { CustomerRow } from "../types";
import { updateCustomerAction, deleteCustomerAction, type ActionState } from "../actions";

type Props = {
  customer: CustomerRow;
  leadsCount: number;
  jobsCount: number;
  followUpsCount: number;
  profile: IndustryProfile;
  errorParam?: string;
};

function getPersonIssues(person: CustomerRow) {
  const issues: {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral";
    detail: string;
  }[] = [];

  if (!person.phone && !person.email) {
    issues.push({
      label: "Add contact",
      tone: "warning",
      detail: "Phone or email is needed for follow-up.",
    });
  }

  if (!person.address) {
    issues.push({
      label: "Add address",
      tone: "neutral",
      detail: "Address helps with service area, jobs, and local context.",
    });
  }

  if (!person.customer_type) {
    issues.push({
      label: "Add type",
      tone: "neutral",
      detail: "Type helps separate customers, leads, vendors, or accounts.",
    });
  }

  if (issues.length === 0) {
    issues.push({
      label: "Looks clean",
      tone: "success",
      detail: "This person has contact, address, and type filled in.",
    });
  }

  return issues;
}

export function CustomerForm({
  customer,
  leadsCount,
  jobsCount,
  followUpsCount,
  profile,
}: Props) {
  const issues = getPersonIssues(customer);
  const boundUpdateAction = updateCustomerAction.bind(null, customer.id);
  const deleteAction = deleteCustomerAction.bind(null, customer.id);

  const [state, formAction] = useActionState<ActionState, FormData>(
    boundUpdateAction,
    null,
  );

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
      <SectionCard
        title="Person details"
        description="These fields help connect people to opportunities, work, revenue, and follow-ups."
      >
        <form action={formAction} className="space-y-5 p-5">
          {state?.error && (
            <p className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Name">
              <Input
                name="name"
                required
                autoComplete="name"
                defaultValue={customer.name || ""}
                placeholder="John Smith, ABC Flooring, Ocean View Home…"
              />
              {state?.fieldErrors?.name && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name}</p>
              )}
            </FormField>

            <FormField label="Type">
              <Input
                name="customer_type"
                defaultValue={customer.customer_type || ""}
                placeholder="Customer, lead, residential, commercial…"
              />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Phone">
              <Input
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={customer.phone || ""}
                placeholder="808-555-1234"
              />
            </FormField>

            <FormField label="Email">
              <Input
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={customer.email || ""}
                placeholder="customer@example.com"
              />
              {state?.fieldErrors?.email && (
                <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email}</p>
              )}
            </FormField>
          </div>

          <FormField label="Address">
            <Input
              name="address"
              defaultValue={customer.address || ""}
              placeholder="Service address, city, or area"
            />
          </FormField>

          <FormField label="Notes">
            <Textarea
              name="notes"
              rows={5}
              defaultValue={customer.notes || ""}
              placeholder="Add preferences, project details, contact history, or anything important…"
            />
          </FormField>

          <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
            <Link
              href="/customers"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <SubmitButton>Save person</SubmitButton>
          </div>
        </form>
      </SectionCard>

      <div className="space-y-5">
        <SectionCard
          title="Record summary"
          description="How this person is currently stored."
        >
          <div className="space-y-4 p-5">
            <SummaryCard
              label="Contact"
              value={customer.phone || customer.email || "Incomplete contact saved"}
              helper={
                customer.phone && customer.email
                  ? customer.email
                  : "Phone or email helps with follow-up."
              }
            />

            <div className="grid gap-3 md:grid-cols-2">
              <SummaryCard label="Type" value={customer.customer_type} />
              <SummaryCard
                label="Added"
                value={formatTimestampDate(customer.created_at)}
              />
            </div>

            <SummaryCard
              label="Address"
              value={customer.address || "No address saved"}
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-500">Linked records</p>
              <p className="mt-1 text-sm text-slate-700">
                {[
                  leadsCount
                    ? `${leadsCount} ${leadsCount === 1 ? profile.labels.leadSingular.toLowerCase() : profile.labels.leadPlural.toLowerCase()}`
                    : null,
                  jobsCount
                    ? `${jobsCount} ${jobsCount === 1 ? profile.labels.jobSingular.toLowerCase() : profile.labels.jobPlural.toLowerCase()}`
                    : null,
                  followUpsCount
                    ? `${followUpsCount} follow-up${followUpsCount !== 1 ? "s" : ""}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "No linked records yet"}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Cleanup"
          description="Issues affecting follow-up, service area, and reporting."
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
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {issue.detail}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Danger zone" description="Permanent actions that cannot be undone.">
          <div className="p-5">
            <DeleteConfirm
              action={deleteAction}
              description="This will permanently delete this person. Linked jobs, opportunities, and follow-ups will lose this connection but will not be deleted."
            />
          </div>
        </SectionCard>
      </div>
    </section>
  );
}

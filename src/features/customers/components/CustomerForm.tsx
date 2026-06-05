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
import { SendMessageModal } from "./SendMessageModal";

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
    <div className="space-y-5">
      {/* Mobile lifecycle metrics — mobile only */}
      <div className="flex rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden md:hidden">
        <div className="flex-1 border-r border-ud px-4 py-3 text-center">
          <p className="text-[20px] font-bold text-ud-ink">{leadsCount}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ud-faint mt-0.5">{profile.labels.leadPlural}</p>
        </div>
        <div className="flex-1 border-r border-ud px-4 py-3 text-center">
          <p className="text-[20px] font-bold text-ud-ink">{jobsCount}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ud-faint mt-0.5">{profile.labels.jobPlural}</p>
        </div>
        <div className="flex-1 px-4 py-3 text-center">
          <p className="text-[20px] font-bold text-ud-ink">{followUpsCount}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ud-faint mt-0.5">Follow-ups</p>
        </div>
      </div>

      {/* Mobile quick actions */}
      {(customer.phone || customer.email || customer.address) && (
        <div className="grid grid-cols-3 gap-2 md:hidden">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex flex-col items-center gap-1.5 rounded-[10px] border border-ud bg-ud-surface px-3 py-3 text-center shadow-ud"
            >
              <svg className="h-5 w-5 text-ud-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              <span className="text-[11px] font-semibold text-ud-muted">Call</span>
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex flex-col items-center gap-1.5 rounded-[10px] border border-ud bg-ud-surface px-3 py-3 text-center shadow-ud"
            >
              <svg className="h-5 w-5 text-ud-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-[11px] font-semibold text-ud-muted">Email</span>
            </a>
          )}
          {customer.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(customer.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-[10px] border border-ud bg-ud-surface px-3 py-3 text-center shadow-ud"
            >
              <svg className="h-5 w-5 text-ud-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[11px] font-semibold text-ud-muted">Directions</span>
            </a>
          )}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
      <SectionCard
        title="Person details"
        description="These fields help connect people to opportunities, work, revenue, and follow-ups."
      >
        <form action={formAction} className="space-y-5 p-5">
          {state?.error && (
            <p className="rounded-[10px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
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

          <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between">
            <SendMessageModal
              customerId={customer.id}
              customerName={customer.name || profile.labels.customerSingular}
              phone={customer.phone ?? null}
              email={customer.email ?? null}
            />
            <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center">
              <Link
                href="/customers"
                className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk"
              >
                Cancel
              </Link>
              <SubmitButton pendingLabel="Updating…">Save person</SubmitButton>
            </div>
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

            <div className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4">
              <p className="text-sm font-medium text-ud-faint">Linked records</p>
              <p className="mt-1 text-sm text-ud-muted">
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
                className="rounded-[10px] border border-ud bg-ud-surface-sunk p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge tone={issue.tone}>{issue.label}</StatusBadge>
                  <p className="text-sm font-medium text-ud-faint">
                    {issue.label === "Looks clean" ? "No action needed" : "Needs update"}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-ud-muted">
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
    </div>
  );
}

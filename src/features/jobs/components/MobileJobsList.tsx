"use client";

import { useState } from "react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import { formatDateOnly } from "@/lib/date-format";
import { getWorkTone, getRevenueTone } from "@/lib/status";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { JobCreateForm } from "./JobCreateForm";
import type { JobListRow, CustomerRow, LeadRow } from "../types";

type Props = {
  jobs: JobListRow[];
  count: number;
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  leads: Pick<LeadRow, "id" | "service_requested" | "status" | "estimated_value">[];
  profile: IndustryProfile;
  selectedStage: string;
};

const STAGE_FILTERS = ["All", "Scheduled", "Active", "Complete", "Cancelled"] as const;
type StageFilter = (typeof STAGE_FILTERS)[number];

function matchesFilter(status: string | null | undefined, filter: StageFilter): boolean {
  if (filter === "All") return true;
  const s = String(status || "").toLowerCase();
  if (filter === "Scheduled") return s.includes("scheduled");
  if (filter === "Active") return s.includes("active") || s.includes("progress");
  if (filter === "Complete") return s.includes("complete") || s.includes("done") || s.includes("finished");
  if (filter === "Cancelled") return s.includes("cancel");
  return false;
}

export function MobileJobsList({ jobs, count, customers, leads, profile }: Props) {
  const [activeFilter, setActiveFilter] = useState<StageFilter>("All");

  const customerById = new Map(customers.map((c) => [c.id, c]));

  const totalValue = jobs.reduce((sum, job) => sum + Number(job.job_value || 0), 0);

  const filteredJobs = activeFilter === "All"
    ? jobs
    : jobs.filter((job) => matchesFilter(job.status, activeFilter));

  const eyebrow = profile.labels.jobPlural || "Jobs";

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-[22px] pb-[18px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ud-muted">
          {eyebrow}
        </p>
        <h1 className="mt-[4px] text-[22px] leading-[1.2] text-ud-ink">
          <span className="font-[family-name:var(--font-instrument-serif)] italic">
            {count} {profile.labels.jobPlural.toLowerCase()}
          </span>
        </h1>
        <p className="mt-[4px] text-[13px] text-ud-muted [font-variant-numeric:tabular-nums]">
          {formatCurrency(totalValue)} total value
        </p>
      </div>

      {/* Stage filter chips */}
      <div className="overflow-x-auto no-scrollbar flex gap-2 px-4 pb-[14px]">
        {STAGE_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "flex-shrink-0 rounded-full px-[16px] py-[9px] text-[13px] font-semibold transition-colors",
              activeFilter === filter
                ? "bg-ud-ink text-white"
                : "bg-ud-surface border border-ud text-ud-muted",
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Jobs list */}
      {filteredJobs.length === 0 ? (
        <div className="px-4">
          <EmptyState
            title={activeFilter === "All" ? `No ${profile.labels.jobPlural.toLowerCase()} yet` : `No ${activeFilter.toLowerCase()} ${profile.labels.jobPlural.toLowerCase()}`}
            description={
              activeFilter === "All"
                ? "Add work manually or import records from CSV."
                : `No records are currently marked ${activeFilter.toLowerCase()}.`
            }
          />
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          {filteredJobs.map((job) => {
            const customer = job.customer_id ? customerById.get(job.customer_id) : null;

            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}/edit`}
                className="bg-ud-surface rounded-[10px] border border-ud p-4 block"
              >
                {/* Row 1: service type + value */}
                <div className="flex items-start justify-between gap-[8px]">
                  <p className="font-semibold text-[14px] text-ud-ink leading-snug">
                    {job.service_type || `Untitled ${profile?.labels.jobSingular?.toLowerCase() ?? "job"}`}
                  </p>
                  <p className="text-[13px] font-semibold text-ud-accent [font-variant-numeric:tabular-nums] shrink-0">
                    {formatCurrency(job.job_value)}
                  </p>
                </div>

                {/* Row 2: status pill + paid_status pill + start_date */}
                <div className="mt-[8px] flex flex-wrap items-center gap-[6px]">
                  <Pill tone={getWorkTone(job.status)}>
                    {job.status || "Scheduled"}
                  </Pill>
                  {job.paid_status && (
                    <Pill tone={getRevenueTone(job.paid_status)}>
                      {job.paid_status}
                    </Pill>
                  )}
                  {job.start_date && (
                    <span className="text-[11px] text-ud-muted">
                      {formatDateOnly(job.start_date)}
                    </span>
                  )}
                </div>

                {/* Row 3: customer name */}
                <p className="mt-[8px] text-[12px] text-ud-muted">
                  {customer?.name || `No ${profile?.labels.customerSingular?.toLowerCase() ?? "client"} linked`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
      <div id="job-quick-add" className="px-4 mt-6">
        <JobCreateForm customers={customers} leads={leads} />
      </div>
    </div>
  );
}

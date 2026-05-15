import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatTimestampDate } from "@/lib/date-format";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { GenerateSummaryButton } from "@/app/ai-assistant/GenerateSummaryButton";
import { BriefDisplay } from "@/app/ai-assistant/BriefDisplay";
import { AiChat } from "@/app/ai-assistant/AiChat";
import type { AiReport } from "../types";

interface AiViewProps {
  reports: AiReport[];
  profile: IndustryProfile;
}

export function AiView({ reports, profile }: AiViewProps) {
  const latestReport = reports[0];
  const previousReports = reports.slice(1);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="AI Assistant"
        title="Generate an operating brief"
        description="Gemini reviews the workspace and turns your business data into a short, practical brief."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/workspace"
              className="rounded-2xl bg-[#1D2D3E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57]"
            >
              Home
            </Link>

            <Link
              href="/imports"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Import data
            </Link>
          </div>
        }
      />

      <GenerateSummaryButton />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr] items-start">
        <SectionCard
          title="Latest brief"
          description="The most recent Gemini-generated operating report."
        >
          {!latestReport ? (
            <EmptyState
              title="No AI brief generated yet"
              description="Generate your first brief to see priorities, risks, and next steps."
            />
          ) : (
            <div className="p-5">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusBadge tone="neutral">Operating brief</StatusBadge>
                  <p className="text-sm font-medium text-slate-500">
                    {formatTimestampDate(latestReport.created_at)}
                  </p>
                </div>
                <div className="mt-5">
                  <BriefDisplay summary={latestReport.summary || ""} />
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="What Gemini reviews"
          description="The brief is generated from live workspace data."
        >
          <div className="space-y-3 p-4">
            {[
              {
                title: profile.labels.customerPlural,
                detail: "Contacts, missing info, and core records.",
              },
              {
                title: profile.labels.leadPlural,
                detail: "Open pipeline, sources, values, and follow-ups.",
              },
              {
                title: profile.labels.jobPlural,
                detail: "Active stages, values, and payment status.",
              },
              {
                title: profile.labels.salePlural,
                detail: "Paid, unpaid, partial, and source tracking.",
              },
              {
                title: profile.labels.followUpPlural,
                detail: "Due dates, overdue items, and open reminders.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="Ask Gemini"
        description={`Ask anything about your ${profile.labels.customerPlural.toLowerCase()}, ${profile.labels.leadPlural.toLowerCase()}, revenue, or follow-ups.`}
      >
        <AiChat />
      </SectionCard>

      {previousReports.length > 0 && (
        <SectionCard
          title="Previous briefs"
          description="Older saved AI reports. Kept collapsed so the page stays clean."
        >
          <div className="divide-y divide-slate-100">
            {previousReports.map((report) => (
              <details key={report.id} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">
                      Gemini operating brief
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatTimestampDate(report.created_at)}
                    </p>
                  </div>

                  <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 group-open:hidden">
                    Open
                  </span>

                  <span className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 group-open:inline-flex">
                    Close
                  </span>
                </summary>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <BriefDisplay summary={report.summary || ""} />
                </div>
              </details>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

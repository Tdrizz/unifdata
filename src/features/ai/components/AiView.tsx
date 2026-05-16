import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatTimestampDate } from "@/lib/date-format";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { GenerateSummaryButton } from "@/app/ai-assistant/GenerateSummaryButton";
import { BriefDisplay } from "@/app/ai-assistant/BriefDisplay";
import { AiAssistantView } from "@/features/ai-assistant/AiAssistantView";
import { MobileAiView } from "@/features/ai-assistant/MobileAiView";
import type { AiReport } from "../types";

interface AiViewProps {
  reports: AiReport[];
  profile: IndustryProfile;
}

export function AiView({ reports, profile }: AiViewProps) {
  const latestReport = reports[0];
  const previousReports = reports.slice(1);

  return (
    <>
      {/* ── Desktop layout (md+) ── */}
      <div className="hidden md:block space-y-6">
        <PageHeader
          eyebrow="AI assistant"
          title={
            <>
              What do you want to know about your{" "}
              <em className="font-serif italic text-ud-accent">workspace</em>?
            </>
          }
          description="Ask in plain English. UnifData reads your customers, quotes, jobs, revenue, and follow-ups."
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                Clear thread
              </Button>
              <Button variant="secondary" size="sm">
                New thread
              </Button>
            </div>
          }
        />

        {/* Chat — two-column v2 layout */}
        <AiAssistantView />

        {/* Generate brief + Latest brief */}
        <GenerateSummaryButton />

        {latestReport ? (
          <Card padding={22} radius="lg">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ud-muted">
                  Operating brief
                </p>
                <p className="mt-1 text-[13px] text-ud-muted">
                  {formatTimestampDate(latestReport.created_at)}
                </p>
              </div>
            </div>
            <BriefDisplay summary={latestReport.summary || ""} />
          </Card>
        ) : (
          <Card padding={0} radius="lg">
            <EmptyState
              title="No AI brief generated yet"
              description="Generate your first brief to see priorities, risks, and next steps."
            />
          </Card>
        )}

        {/* What Gemini reviews */}
        <Card padding={22} radius="lg">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ud-muted mb-4">
            What Gemini reviews
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                className="rounded-[10px] border border-ud bg-ud-surface-soft p-4"
              >
                <p className="text-[13px] font-semibold text-ud-ink">
                  {item.title}
                </p>
                <p className="mt-1 text-[12.5px] leading-[1.5] text-ud-muted">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Previous briefs */}
        {previousReports.length > 0 && (
          <Card padding={0} radius="lg" className="overflow-hidden">
            <div className="px-[22px] py-[16px] border-b border-ud">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ud-muted">
                Previous briefs
              </p>
            </div>
            <div className="divide-y divide-ud">
              {previousReports.map((report) => (
                <details key={report.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-[22px] py-[16px]">
                    <div>
                      <p className="text-[14px] font-semibold text-ud-ink">
                        Gemini operating brief
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-ud-muted">
                        {formatTimestampDate(report.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-[8px] border border-ud bg-ud-surface px-3 py-1.5 text-[12px] font-semibold text-ud-text shadow-ud group-open:hidden">
                      Open
                    </span>
                    <span className="shrink-0 hidden rounded-[8px] border border-ud bg-ud-surface px-3 py-1.5 text-[12px] font-semibold text-ud-text shadow-ud group-open:inline-flex">
                      Close
                    </span>
                  </summary>
                  <div className="px-[22px] pb-[20px]">
                    <div className="rounded-[10px] border border-ud bg-ud-surface-soft p-4">
                      <BriefDisplay summary={report.summary || ""} />
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Mobile layout (< md) ── */}
      <div className="block md:hidden">
        <MobileAiView />
      </div>
    </>
  );
}

import Link from "next/link";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateOnly } from "@/lib/date-format";
import { isOpenFollowUp } from "@/lib/status";
import { MarkFollowUpDoneButton } from "@/features/follow-ups/components/MarkFollowUpDoneButton";
import type { RawFollowUp } from "../types";

// User feedback: a dedicated /follow-ups page was one more place to go look
// -- this keeps follow-ups reachable right on the Pipeline page instead,
// same page leads/jobs/sales already live on, with a one-click "Mark done"
// right here rather than a trip to the edit form.
export function PipelineFollowUpsSection({ followUps }: { followUps: RawFollowUp[] }) {
  const open = followUps
    .filter((f) => isOpenFollowUp(f.status))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 8);

  return (
    <SectionCard
      title="Follow-ups"
      description="Open follow-ups across every lead, job, and sale, soonest due first."
    >
      {open.length === 0 ? (
        <EmptyState title="Nothing due" description="Open follow-ups will show up here as they're added." />
      ) : (
        <div>
          {open.map((fu) => {
            const contactName = fu.contact ? [fu.contact.first_name, fu.contact.last_name].filter(Boolean).join(" ") : null;
            return (
              <div key={fu.id} className="relative border-b border-[rgba(23,22,20,0.04)] last:border-0">
                <Link
                  href={`/follow-ups/${fu.id}/edit`}
                  className="grid gap-1 px-5 py-[13px] pr-[110px] transition-colors hover:bg-ud-surface-soft md:grid-cols-[1fr_120px] md:items-center md:gap-3"
                >
                  <div>
                    <p className="font-semibold text-ud-ink truncate">{fu.message || "Follow-up"}</p>
                    <p className="mt-1 text-sm text-ud-faint truncate">{contactName || "No contact linked"}</p>
                  </div>
                  <p className="text-sm font-semibold text-ud-danger">Due {formatDateOnly(fu.due_date)}</p>
                </Link>
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <MarkFollowUpDoneButton id={fu.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

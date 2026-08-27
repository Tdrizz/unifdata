import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import type { IndustryProfile } from "@/lib/industry-profiles";

function IconDatabase() { return <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>; }
function IconLayers() { return <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>; }
function IconUpload() { return <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>; }

type ToolCard = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: number;
};

export function ToolsHub({ profile, pendingProposals = 0 }: { profile: IndustryProfile; pendingProposals?: number }) {
  const cards: ToolCard[] = [
    {
      href: "/data-hub",
      title: "Data Hub",
      description: "Data quality, duplicate detection, and suggested fixes.",
      icon: <IconDatabase />,
      badge: pendingProposals > 0 ? pendingProposals : undefined,
    },
    {
      href: "/process",
      title: profile.recordPlural,
      description: `Configurable ${profile.recordPlural.toLowerCase()} board for tracking custom workflows.`,
      icon: <IconLayers />,
    },
    {
      href: "/imports",
      title: "Imports",
      description: "Bring in data from CSV files or connected integrations.",
      icon: <IconUpload />,
    },
  ];

  return (
    <div className="px-5 pt-6 pb-12 md:px-8 md:pt-7">
      <PageHeader
        eyebrow="Tools"
        title="Tools"
        description="Everything else that runs behind the scenes — data quality, imports, and custom boards."
        className="mb-6"
      />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex items-start gap-3.5 rounded-[14px] border border-ud bg-ud-surface p-5 shadow-ud transition-[box-shadow,transform] duration-[180ms] hover:-translate-y-0.5 hover:shadow-ud-raised"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-ud-surface-sunk text-ud-muted">
              {card.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-semibold text-ud-ink">{card.title}</p>
                {card.badge ? (
                  <span className="rounded-full bg-ud-accent px-[7px] py-[1px] text-[11px] font-bold text-white">
                    {card.badge > 9 ? "9+" : card.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] leading-[1.5] text-ud-muted">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

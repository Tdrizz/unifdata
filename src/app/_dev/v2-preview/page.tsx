import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { IconButton } from "@/components/ui/IconButton";
import { Display } from "@/components/ui/Display";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatStrip } from "@/components/ui/StatStrip";
import { ListRow } from "@/components/ui/ListRow";
import { FilterChip } from "@/components/ui/FilterChip";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { SectionCard } from "@/components/ui/SectionCard";
import { DetailRow } from "@/components/ui/DetailRow";
import { notFound } from "next/navigation";
import { Sparkline } from "@/components/ui/Sparkline";

export const dynamic = "force-dynamic";

export default function V2PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="min-h-screen bg-ud-page p-8 space-y-10">
      <Display>UnifData v2 component preview</Display>

      {/* Buttons */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-ud-faint">Buttons</p>
        <div className="flex flex-wrap gap-2">
          {(["primary", "accent", "secondary", "ghost", "danger"] as const).map((v) => (
            <Button key={v} variant={v}>{v}</Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["sm", "md", "lg"] as const).map((s) => (
            <Button key={s} size={s} variant="secondary">size {s}</Button>
          ))}
        </div>
      </section>

      {/* Pills */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-ud-faint">Pills</p>
        <div className="flex flex-wrap gap-2">
          {(["neutral", "success", "warning", "danger", "info", "accent", "ink"] as const).map((t) => (
            <Pill key={t} tone={t}>{t}</Pill>
          ))}
        </div>
      </section>

      {/* Cards + KPI */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-ud-faint">KPI</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total revenue" value="$48,200" helper="+$3.2k this wk" delta="+18%" deltaTone="up" />
          <KpiCard label="Open quotes" value="6" helper="$24.8k pipeline" delta="-2" deltaTone="down" />
          <KpiCard label="Overdue" value="3" deltaTone="flat" compact />
          <KpiCard label="Visits" value="14" helper="this week" />
        </div>
      </section>

      {/* StatStrip */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-ud-faint">StatStrip</p>
        <StatStrip items={[
          { label: "Unpaid revenue", value: "$11,240", helper: "+$2.8k this wk", tone: "danger" },
          { label: "Open quotes",    value: "6",       helper: "$24.8k pipeline" },
          { label: "Active clients", value: "47",      helper: "3 new this month" },
          { label: "Overdue follow-ups", value: "8",   tone: "warning" },
        ]} />
      </section>

      {/* Sparkline */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-ud-faint">Sparkline</p>
        <Card>
          <Sparkline data={[4.2, 5.1, 6.8, 7.4, 8.2, 9.8, 11.2]} width={120} height={48} fill />
        </Card>
      </section>

      {/* Avatars */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-ud-faint">Avatar</p>
        <div className="flex gap-2 items-center">
          <Avatar name="Jordan Smith" />
          <Avatar name="Maria Lopez" size={44} />
          <Avatar name="Tom Chen" size={52} square />
          <Avatar name="Alice Brown" size={28} />
        </div>
      </section>

      {/* Filter chips */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-ud-faint">Filter chips</p>
        <div className="flex flex-wrap gap-2">
          <FilterChip active count={48}>All</FilterChip>
          <FilterChip count={12}>Overdue</FilterChip>
          <FilterChip count={6}>This week</FilterChip>
          <FilterChip>No filter</FilterChip>
        </div>
      </section>

      {/* Search */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-ud-faint">Search</p>
        <div className="max-w-sm">
          <SearchInput placeholder="Search clients…" />
        </div>
      </section>

      {/* ListRow */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-ud-faint">List rows</p>
        <Card padding={0}>
          <ListRow
            leading={<Avatar name="Jordan Smith" size={36} />}
            title="Jordan Smith"
            subtitle="Last visit: May 12 · $480"
            trailing={<Pill tone="success">Active</Pill>}
          />
          <ListRow
            leading={<Avatar name="Maria Lopez" size={36} />}
            title="Maria Lopez"
            subtitle="No visits yet · Missing contact info"
            trailing={<Pill tone="warning">Needs info</Pill>}
          />
          <ListRow
            leading={<Avatar name="Tom Chen" size={36} />}
            title="Tom Chen"
            subtitle="Overdue follow-up · $2,200 unpaid"
            trailing={<Pill tone="danger">Overdue</Pill>}
            isLast
          />
        </Card>
      </section>

      {/* SectionCard */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-ud-faint">SectionCard</p>
        <SectionCard title="Recent clients" description="Last 30 days" actions={<Button variant="secondary" size="sm">View all</Button>}>
          <ListRow leading={<Avatar name="Alice Brown" size={32} />} title="Alice Brown" subtitle="3 open quotes" isLast />
        </SectionCard>
      </section>

      {/* DetailRow */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-ud-faint">DetailRow</p>
        <Card padding={0}>
          <DetailRow label="Phone">+1 (555) 234-5678</DetailRow>
          <DetailRow label="Email">jordan@example.com</DetailRow>
          <DetailRow label="Industry">Field service</DetailRow>
          <DetailRow label="Since" isLast>March 2022</DetailRow>
        </Card>
      </section>

      {/* Icon button */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-ud-faint">IconButton</p>
        <div className="flex gap-2">
          <IconButton>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </IconButton>
          <IconButton active>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M3 12h18M3 20h18" />
            </svg>
          </IconButton>
        </div>
      </section>

      {/* EmptyState */}
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-ud-faint">EmptyState</p>
        <Card>
          <EmptyState
            title="No clients yet"
            body="Add your first client to start tracking quotes, visits, and revenue."
            action={<Button variant="primary">Add client</Button>}
          />
        </Card>
      </section>
    </div>
  );
}

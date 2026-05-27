"use client";

type ActivityRow = {
  id: string;
  event_type: string;
  event_label: string;
  event_detail: string | null;
  source: string;
  created_at: string;
};

function groupByDate(activities: ActivityRow[]): { date: string; items: ActivityRow[] }[] {
  const map = new Map<string, ActivityRow[]>();
  for (const a of activities) {
    const date = new Date(a.created_at).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(a);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function eventIcon(eventType: string) {
  if (eventType.includes("message")) return "💬";
  if (eventType.includes("note")) return "📝";
  if (eventType.includes("tag")) return "🏷";
  if (eventType.includes("payment") || eventType.includes("invoice")) return "💳";
  if (eventType.includes("task")) return "✅";
  if (eventType.includes("process") || eventType.includes("record")) return "📋";
  if (eventType.includes("status")) return "🔄";
  if (eventType.includes("contact_created")) return "👤";
  if (eventType.includes("agent")) return "🤖";
  return "•";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function ContactActivityTab({ activities }: { activities: ActivityRow[] }) {
  const groups = groupByDate(activities);

  if (groups.length === 0) {
    return (
      <div className="py-10 text-center text-[13px] text-ud-muted">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.date}>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ud-faint mb-2">
            {group.date}
          </div>
          <div className="space-y-1">
            {group.items.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-[8px] hover:bg-ud-surface-sunk transition-colors"
              >
                <span className="text-[16px] leading-none mt-0.5 shrink-0">
                  {eventIcon(activity.event_type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-ud-ink">{activity.event_label}</div>
                  {activity.event_detail && (
                    <div className="text-[12px] text-ud-muted mt-0.5 truncate">
                      {activity.event_detail}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-ud-faint shrink-0 mt-0.5">
                  {formatTime(activity.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export const STAGES: { name: string; color: string; keys: string[] }[] = [
  { name: "Lead",        color: "#64748b", keys: ["new", "lead", "contact", "qualified", "interested"] },
  { name: "Quoted",      color: "#2563eb", keys: ["quoted", "proposal"] },
  { name: "In progress", color: "#4A3FA8", keys: ["in progress", "in_progress", "accepted", "confirmed", "scheduled"] },
  { name: "Won",         color: "#3f7c3f", keys: ["won", "closed won", "completed"] },
  { name: "Lost",        color: "#a09b91", keys: ["lost", "declined", "closed"] },
];

export function mapToStage(status: string | null): string {
  const s = (status || "").toLowerCase().trim();
  for (const stage of STAGES) {
    if (stage.keys.some((k) => s.includes(k))) return stage.name;
  }
  return "Lead";
}

export function isOpenLead(status: string | null): boolean {
  const s = (status || "").toLowerCase().trim();
  const closedKeys = ["lost", "closed", "won", "declined", "rejected"];
  return !closedKeys.some((k) => s.includes(k));
}

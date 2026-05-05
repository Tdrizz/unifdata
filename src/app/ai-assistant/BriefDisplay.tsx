"use client";

// Renders the plain-text AI brief with visual section headers and styled list items.
// Keeps the server-rendered page fast while adding polish client-side.

const SECTION_HEADERS = [
  "Operating Brief",
  "Needs Attention",
  "Recommended Next Steps",
  "Getting Started",
  "Where to Focus First",
];

type Line =
  | { type: "heading"; text: string }
  | { type: "bullet"; text: string }
  | { type: "numbered"; n: string; text: string }
  | { type: "text"; text: string };

function parseBrief(summary: string): Line[] {
  const lines: Line[] = [];

  for (const raw of summary.split("\n")) {
    const line = raw.trim();

    if (!line) continue;

    if (SECTION_HEADERS.includes(line)) {
      lines.push({ type: "heading", text: line });
      continue;
    }

    const bulletMatch = line.match(/^[-•]\s+(.+)/);
    if (bulletMatch) {
      lines.push({ type: "bullet", text: bulletMatch[1] });
      continue;
    }

    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      lines.push({ type: "numbered", n: numberedMatch[1], text: numberedMatch[2] });
      continue;
    }

    lines.push({ type: "text", text: line });
  }

  return lines;
}

export function BriefDisplay({ summary }: { summary: string }) {
  const lines = parseBrief(summary);

  return (
    <div className="space-y-1 text-sm leading-7">
      {lines.map((line, i) => {
        if (line.type === "heading") {
          return (
            <p
              key={i}
              className={
                i === 0
                  ? "pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400"
                  : "pt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400"
              }
            >
              {line.text}
            </p>
          );
        }

        if (line.type === "bullet") {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <span className="text-slate-700">{line.text}</span>
            </div>
          );
        }

        if (line.type === "numbered") {
          return (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                {line.n}
              </span>
              <span className="text-slate-700">{line.text}</span>
            </div>
          );
        }

        return (
          <p key={i} className="text-slate-700">
            {line.text}
          </p>
        );
      })}
    </div>
  );
}

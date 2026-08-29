"use client";

import { useEffect, useRef, useState } from "react";

type SceneId = "pipeline" | "inbox" | "connect" | "brief";

// Four different corners of the product, not one story stretched thin --
// each scene gets its own fixed dwell time and then the reel auto-advances
// to the next, looping forever. No pills: nobody was clicking them, so the
// only interaction left is watching.
//
// The product leads first (pipeline, inbox, integrations) -- Vera closes
// the loop as one capability among several, not the whole pitch.
const SCENES: { id: SceneId; label: string; duration: number }[] = [
  { id: "pipeline", label: "Pipeline", duration: 3800 },
  { id: "inbox", label: "One inbox", duration: 4000 },
  { id: "connect", label: "Connections", duration: 3600 },
  { id: "brief", label: "Vera's brief", duration: 4200 },
];

const stats = [
  { label: "Follow-ups due", value: "4", urgent: true },
  { label: "Open quotes", value: "$12.4k", urgent: false },
  { label: "Unpaid work", value: "$3.8k", urgent: true },
  { label: "Active jobs", value: "7", urgent: false },
];

const action = { text: "Follow-up with David Reyes — roof quote sent 8 days ago, no response.", cta: "Send follow-up" };
const alert = "Marcus Webb's water heater job completed 5 weeks ago. Invoice still unpaid ($1,400).";

const thread = {
  contact: "David Reyes",
  inbound: "Hey, still interested — could you do Friday afternoon for the estimate?",
  outbound: "Yes! I'll pencil you in for 2pm Friday. See you then.",
};

const pipeline = [
  { title: "New leads", total: "$6.8k", jobs: ["David Reyes — roof quote", "Nguyen bathroom remodel"] },
  { title: "In progress", total: "$12.9k", jobs: ["Apex Realty — roofing", "Coastal Homes deck"] },
  { title: "Won", total: "$6.4k", jobs: ["Whitfield kitchen"] },
];

const providers = ["QuickBooks", "Jobber", "HubSpot", "Square"];

function SparkleIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#4A3FA8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    </svg>
  );
}

function KanbanIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#4A3FA8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="18" rx="1" /><rect x="9.5" y="3" width="5" height="18" rx="1" /><rect x="16" y="3" width="5" height="18" rx="1" />
    </svg>
  );
}

function ChatIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#4A3FA8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function PlugIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#4A3FA8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M18 8v3a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
    </svg>
  );
}

const SCENE_ICON: Record<SceneId, (props: { size?: number }) => React.JSX.Element> = {
  pipeline: KanbanIcon,
  inbox: ChatIcon,
  connect: PlugIcon,
  brief: SparkleIcon,
};

function TypingDots() {
  return (
    <div className="flex gap-1 rounded-[12px] bg-[#4A3FA8] px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </div>
  );
}

function BriefScene() {
  return (
    <div className="animate-fade-in">
      <div className="flex gap-3 mb-4">
        <div className="w-7 h-7 rounded-full bg-[#4A3FA8]/10 flex items-center justify-center shrink-0 mt-0.5">
          <SparkleIcon />
        </div>
        <p className="text-[13px] text-slate-700 leading-relaxed">Good morning. Here&apos;s what needs your attention.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`animate-fade-up rounded-[10px] border p-3 ${stat.urgent ? "border-red-200/60 bg-red-50/60" : "border-black/[0.06] bg-white"}`}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <p className="text-[10px] font-medium text-slate-500 mb-1 leading-tight">{stat.label}</p>
            <p className={`text-[18px] font-bold tabular-nums leading-none ${stat.urgent ? "text-red-600" : "text-slate-900"}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="animate-fade-up rounded-[10px] border border-[#4A3FA8]/20 bg-[#4A3FA8]/[0.04] p-3.5" style={{ animationDelay: "280ms" }}>
          <p className="text-[12px] text-slate-700 leading-relaxed mb-2.5">{action.text}</p>
          <div className="flex gap-2">
            <div className="rounded-[7px] bg-[#4A3FA8] px-3 py-1.5 text-[11.5px] font-semibold text-white">{action.cta}</div>
            <div className="rounded-[7px] border border-black/[0.08] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-500">Skip</div>
          </div>
        </div>
        <div className="animate-fade-up rounded-[10px] border border-black/[0.06] bg-white p-3.5" style={{ animationDelay: "350ms" }}>
          <p className="text-[12px] text-slate-700 leading-relaxed mb-2.5">{alert}</p>
          <div className="rounded-[7px] border border-black/[0.08] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-500 inline-flex">Got it</div>
        </div>
      </div>
    </div>
  );
}

function InboxScene() {
  return (
    <div className="animate-fade-in flex flex-col justify-end min-h-[248px] gap-2.5 py-2">
      <p className="text-center text-[11px] text-slate-400 mb-1">Texts and emails land in the same thread as the customer&apos;s record</p>
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-[12px] border border-black/[0.06] bg-white px-3 py-2 animate-fade-up">
          <p className="text-[12.5px] text-slate-700 leading-relaxed">{thread.inbound}</p>
        </div>
      </div>
      <div className="flex justify-end animate-fade-up" style={{ animationDelay: "900ms" }}>
        <TypingDots />
      </div>
      <div className="flex justify-end animate-fade-up" style={{ animationDelay: "1900ms" }}>
        <div className="max-w-[75%] rounded-[12px] bg-[#4A3FA8] px-3 py-2">
          <p className="text-[12.5px] text-white leading-relaxed">{thread.outbound}</p>
        </div>
      </div>
    </div>
  );
}

function PipelineScene() {
  return (
    <div className="animate-fade-in">
      <p className="text-[13px] text-slate-700 leading-relaxed mb-4">Every job and quote, tracked automatically — no spreadsheet to update.</p>
      <div className="grid grid-cols-3 gap-2.5">
        {pipeline.map((col, ci) => (
          <div
            key={col.title}
            className="animate-fade-up rounded-[10px] border border-black/[0.06] bg-white p-2.5"
            style={{ animationDelay: `${ci * 100}ms` }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500 mb-1">{col.title}</p>
            <p className="text-[15px] font-bold tabular-nums text-slate-900 mb-2.5">{col.total}</p>
            <div className="space-y-1.5">
              {col.jobs.map((job, ji) => (
                <div
                  key={job}
                  className="animate-fade-up rounded-[7px] bg-[#f6f5f2] px-2 py-1.5 text-[10.5px] leading-snug text-slate-600"
                  style={{ animationDelay: `${ci * 100 + ji * 90 + 120}ms` }}
                >
                  {job}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectScene() {
  return (
    <div className="animate-fade-in">
      <p className="text-[13px] text-slate-700 leading-relaxed mb-4">Connect the software you already use — everything syncs in automatically.</p>
      <div className="space-y-2">
        {providers.map((name, i) => (
          <div
            key={name}
            className="animate-fade-up flex items-center justify-between rounded-[10px] border border-black/[0.06] bg-white px-3.5 py-3"
            style={{ animationDelay: `${i * 260}ms` }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[8px] bg-[#4A3FA8]/10 flex items-center justify-center text-[11px] font-bold text-[#4A3FA8]">
                {name.charAt(0)}
              </div>
              <span className="text-[12.5px] font-semibold text-slate-700">{name}</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Connected
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SCENE_CONTENT: Record<SceneId, () => React.JSX.Element> = {
  brief: BriefScene,
  inbox: InboxScene,
  pipeline: PipelineScene,
  connect: ConnectScene,
};

// Replaces a static screenshot with a looping, auto-playing reel built from
// real app UI (colors, layout, copy) instead of a video file -- loads
// instantly, needs no hosting, and can't drift out of sync with a
// screen-recorded product the way a video eventually does.
export function LiveDemo() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const reducedMotion = useRef(false);
  const scene = SCENES[sceneIndex];
  const Content = SCENE_CONTENT[scene.id];
  const Icon = SCENE_ICON[scene.id];

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (reducedMotion.current) return;
    const timer = setTimeout(() => {
      setSceneIndex((i) => (i + 1) % SCENES.length);
    }, scene.duration);
    return () => clearTimeout(timer);
  }, [sceneIndex, scene.duration]);

  return (
    <div className="mx-auto max-w-2xl rounded-[24px] border border-white/10 bg-white/[0.04] p-2 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
      {/* Story-style progress bar -- shows the reel is playing through
          several scenes without inviting anyone to click a control. */}
      <div className="flex gap-1.5 px-2.5 pt-2.5 pb-1">
        {SCENES.map((s, i) => (
          <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full origin-left bg-white"
              style={
                i < sceneIndex || (i === sceneIndex && reducedMotion.current)
                  ? { transform: "scaleX(1)" }
                  : i === sceneIndex
                    ? { animation: `demo-scene-fill ${scene.duration}ms linear forwards` }
                    : { transform: "scaleX(0)" }
              }
            />
          </div>
        ))}
      </div>

      <div className="rounded-[18px] bg-[#f6f5f2] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06]">
          <div key={scene.id} className="flex items-center gap-2 animate-fade-in">
            <div className="w-5 h-5 rounded-[5px] bg-[#4A3FA8]/20 flex items-center justify-center">
              <Icon size={11} />
            </div>
            <span className="text-[12px] font-semibold text-slate-700">{scene.label}</span>
          </div>
          <span className="text-[11px] text-slate-400">Today</span>
        </div>

        <div className="px-5 py-4 min-h-[280px]">
          <Content key={scene.id} />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

type Stat = { label: string; value: string; urgent: boolean };
type Thread = { contact: string; inbound: string; outbound: string };

type IndustryDemo = {
  label: string;
  brief: string;
  stats: Stat[];
  action: { text: string; cta: string };
  alert: string;
  thread: Thread;
};

// Each industry tells one continuous story across the loop: Vera drafts a
// follow-up for the same person named in the action card, you send it, and
// their reply lands in the same inbox a beat later -- the actual causal
// link between the morning brief and Communications, not two unrelated
// screenshots side by side.
const industries: IndustryDemo[] = [
  {
    label: "Home services",
    brief: "Good morning. Here's what needs your attention.",
    stats: [
      { label: "Follow-ups due", value: "4", urgent: true },
      { label: "Open quotes", value: "$12.4k", urgent: false },
      { label: "Unpaid work", value: "$3.8k", urgent: true },
      { label: "Active jobs", value: "7", urgent: false },
    ],
    action: { text: "Follow-up with David Reyes — roof quote sent 8 days ago, no response.", cta: "Send follow-up" },
    alert: "Marcus Webb's water heater job completed 5 weeks ago. Invoice still unpaid ($1,400).",
    thread: {
      contact: "David Reyes",
      inbound: "Hey, still interested — could you do Friday afternoon for the estimate?",
      outbound: "Yes! I'll pencil you in for 2pm Friday. See you then.",
    },
  },
  {
    label: "Construction",
    brief: "Good morning. Here's what needs your attention.",
    stats: [
      { label: "Pending estimates", value: "3", urgent: true },
      { label: "Active projects", value: "$18.2k", urgent: false },
      { label: "Unpaid work", value: "$6.1k", urgent: true },
      { label: "Scheduled jobs", value: "5", urgent: false },
    ],
    action: { text: "Check in with Apex Realty — roofing estimate open for 12 days.", cta: "Send check-in" },
    alert: "2 project records are missing completed dates. Revenue may be understated.",
    thread: {
      contact: "Apex Realty",
      inbound: "Thanks for reaching out — let's set up a walkthrough next week.",
      outbound: "Sounds good — how's Tuesday at 10am?",
    },
  },
  {
    label: "Professional services",
    brief: "Good morning. Here's what needs your attention.",
    stats: [
      { label: "Open proposals", value: "3", urgent: true },
      { label: "Active projects", value: "$15.8k", urgent: false },
      { label: "Unpaid invoices", value: "$5.2k", urgent: true },
      { label: "Data health", value: "93%", urgent: false },
    ],
    action: { text: "Follow up with Greenfield Partners — proposal sent 14 days ago.", cta: "Send follow-up" },
    alert: "One client file is missing a primary contact email.",
    thread: {
      contact: "Greenfield Partners",
      inbound: "Sorry for the delay on our end — we're ready to move forward.",
      outbound: "Great news! I'll send the agreement over today.",
    },
  },
];

const PHASE_ORDER = ["brief", "sending", "sent", "inbound", "typing", "outbound", "hold"] as const;
type Phase = (typeof PHASE_ORDER)[number];

const PHASE_DURATIONS: Record<Phase, number> = {
  brief: 2600,
  sending: 700,
  sent: 1300,
  inbound: 1800,
  typing: 1100,
  outbound: 1600,
  hold: 2800,
};

function TypingDots() {
  return (
    <div className="flex gap-1 rounded-[12px] bg-[#4A3FA8] px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

// Replaces a static screenshot with a looping, auto-playing sequence built
// from real app UI (colors, layout, copy) instead of a video file -- loads
// instantly, needs no hosting, and can't drift out of sync with a
// screen-recorded product the way a video eventually does.
export function LiveDemo() {
  const [activeIndustry, setActiveIndustry] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const reducedMotion = useRef(false);
  const industry = industries[activeIndustry];
  const phase = PHASE_ORDER[phaseIndex];

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (reducedMotion.current) return;
    const timer = setTimeout(() => {
      setPhaseIndex((i) => (i + 1) % PHASE_ORDER.length);
    }, PHASE_DURATIONS[phase]);
    return () => clearTimeout(timer);
  }, [phase]);

  function pickIndustry(i: number) {
    setActiveIndustry(i);
    setPhaseIndex(0);
  }

  const sentIndex = PHASE_ORDER.indexOf("sent");
  const inboundIndex = PHASE_ORDER.indexOf("inbound");
  const outboundIndex = PHASE_ORDER.indexOf("outbound");

  const sent = phaseIndex >= sentIndex;
  const showingThread = phaseIndex >= inboundIndex;
  const showTyping = phase === "typing";
  const showOutbound = phaseIndex >= outboundIndex;

  const actionLabel = phase === "sending" ? "Sending…" : sent ? "Sent ✓" : industry.action.cta;

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {industries.map((ind, i) => (
          <button
            key={ind.label}
            onClick={() => pickIndustry(i)}
            className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-150 active:scale-[0.96] ${
              activeIndustry === i
                ? "border-white/30 bg-white text-slate-950"
                : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {ind.label}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-2xl rounded-[24px] border border-white/10 bg-white/[0.04] p-2 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
        <div className="rounded-[18px] bg-[#f6f5f2] overflow-hidden">
          {/* Header — crossfades between "Vera" and the contact's thread */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06]">
            <div key={showingThread ? "thread" : "vera"} className="flex items-center gap-2 animate-fade-in">
              {showingThread ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-[#4A3FA8]/15 flex items-center justify-center text-[10px] font-bold text-[#4A3FA8]">
                    {industry.thread.contact.charAt(0)}
                  </div>
                  <span className="text-[12px] font-semibold text-slate-700">{industry.thread.contact}</span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400 bg-black/[0.04] rounded-[4px] px-1.5 py-[1px]">
                    Text
                  </span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-[5px] bg-[#4A3FA8]/20 flex items-center justify-center">
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#4A3FA8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                    </svg>
                  </div>
                  <span className="text-[12px] font-semibold text-slate-700">Vera</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-slate-400">Today</span>
          </div>

          {/* Body */}
          <div className="px-5 py-4 min-h-[280px]">
            {!showingThread ? (
              <div key={`brief-${activeIndustry}`} className="animate-fade-in">
                <div className="flex gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-[#4A3FA8]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#4A3FA8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                    </svg>
                  </div>
                  <p className="text-[13px] text-slate-700 leading-relaxed">{industry.brief}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {industry.stats.map((stat, i) => (
                    <div
                      key={stat.label}
                      className={`animate-fade-up rounded-[10px] border p-3 ${stat.urgent ? "border-red-200/60 bg-red-50/60" : "border-black/[0.06] bg-white"}`}
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      <p className="text-[10px] font-medium text-slate-500 mb-1 leading-tight">{stat.label}</p>
                      <p className={`text-[18px] font-bold tabular-nums leading-none ${stat.urgent ? "text-red-600" : "text-slate-900"}`}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="rounded-[10px] border border-[#4A3FA8]/20 bg-[#4A3FA8]/[0.04] p-3.5">
                    <p className="text-[12px] text-slate-700 leading-relaxed mb-2.5">{industry.action.text}</p>
                    <div className="flex gap-2">
                      <div
                        className={`rounded-[7px] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-all duration-300 ${
                          sent ? "bg-emerald-600" : phase === "sending" ? "bg-[#4A3FA8] opacity-70" : "bg-[#4A3FA8]"
                        }`}
                      >
                        {actionLabel}
                      </div>
                      {!sent && (
                        <div className="rounded-[7px] border border-black/[0.08] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-500">
                          Skip
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[10px] border border-black/[0.06] bg-white p-3.5">
                    <p className="text-[12px] text-slate-700 leading-relaxed mb-2.5">{industry.alert}</p>
                    <div className="rounded-[7px] border border-black/[0.08] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-500 inline-flex">
                      Got it
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div key={`thread-${activeIndustry}`} className="animate-fade-in flex flex-col justify-end min-h-[248px] gap-2.5 py-2">
                <p className="text-center text-[11px] text-slate-400 mb-1">Their reply lands in the same inbox</p>
                <div className="flex justify-start">
                  <div className="max-w-[75%] rounded-[12px] border border-black/[0.06] bg-white px-3 py-2 animate-fade-up">
                    <p className="text-[12.5px] text-slate-700 leading-relaxed">{industry.thread.inbound}</p>
                  </div>
                </div>
                {showTyping && (
                  <div className="flex justify-end animate-fade-in">
                    <TypingDots />
                  </div>
                )}
                {showOutbound && (
                  <div className="flex justify-end">
                    <div className="max-w-[75%] rounded-[12px] bg-[#4A3FA8] px-3 py-2 animate-fade-up">
                      <p className="text-[12.5px] text-white leading-relaxed">{industry.thread.outbound}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

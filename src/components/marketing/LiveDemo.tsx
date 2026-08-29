"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type SceneId = "pipeline" | "inbox" | "connect" | "brief";

// Four different corners of the product, not one story stretched thin --
// each scene gets its own fixed dwell time before the reel smoothly scrolls
// on to the next, looping forever. This plays like continuous footage of
// someone using the app (one frame, one scroll, no slide-deck chrome)
// rather than a stack of cards cutting from one to the next.
//
// The product leads first (pipeline, inbox, integrations) -- Vera closes
// the loop as one capability among several, not the whole pitch.
const SCENES: { id: SceneId; label: string; duration: number }[] = [
  { id: "pipeline", label: "Pipeline", duration: 3800 },
  { id: "inbox", label: "One inbox", duration: 4000 },
  { id: "connect", label: "Connections", duration: 3600 },
  { id: "brief", label: "Vera's brief", duration: 4200 },
];

// Every scene is an abstract, generative-motion "impression" of the product
// -- flowing connector lines, traveling particles, numbers counting up --
// rather than a mockup of any specific real screen. That's deliberate: a
// literal recreation reads as a screenshot and goes stale the moment the
// real UI changes; an abstraction can't be "inaccurate" because it was
// never claiming to be the app, just a feel for what it does.

const providers = ["QuickBooks", "Jobber", "HubSpot", "Square"];

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function SparkleIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--ud-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    </svg>
  );
}

function KanbanIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--ud-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="18" rx="1" /><rect x="9.5" y="3" width="5" height="18" rx="1" /><rect x="16" y="3" width="5" height="18" rx="1" />
    </svg>
  );
}

function ChatIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--ud-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function MailIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--ud-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2.5" /><path d="m3 6.5 9 6 9-6" />
    </svg>
  );
}

function PlugIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--ud-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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

// A straight connector line that draws itself in, plus a small dot that
// travels along it -- the two together are the "flow" motif reused (with
// different node counts/paths) across every scene below.
function FlowLine({ x1, y1, x2, y2, delay = 0 }: { x1: number; y1: number; x2: number; y2: number; delay?: number }) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  return (
    <path
      d={`M ${x1} ${y1} L ${x2} ${y2}`}
      fill="none"
      stroke="var(--ud-accent)"
      strokeOpacity={0.3}
      strokeWidth={1.5}
      vectorEffect="non-scaling-stroke"
      strokeLinecap="round"
      style={{
        strokeDasharray: length,
        strokeDashoffset: length,
        animation: `demo-draw-line 900ms ease-out ${delay}ms both`,
      }}
    />
  );
}

// Three stages flowing into each other, a single particle traveling the
// whole path -- an abstraction of "a job moves from lead to paid," not a
// recreation of the kanban board itself.
function FlowScene() {
  const leads = useCountUp(12, 1000);
  const active = useCountUp(8, 1000);
  const won = useCountUp(5, 1000);
  const nodes = [
    { label: "New leads", value: leads },
    { label: "In progress", value: active },
    { label: "Won", value: won },
  ];
  return (
    <div className="animate-fade-in">
      <p className="text-[13px] text-ud-text leading-relaxed mb-5">Every job, tracked automatically — from lead to paid.</p>
      <div className="relative" style={{ aspectRatio: "100 / 22" }}>
        <svg viewBox="0 0 100 22" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
          <FlowLine x1={7} y1={11} x2={50} y2={11} delay={150} />
          <FlowLine x1={50} y1={11} x2={93} y2={11} delay={650} />
          <circle r={1.8} cy={11} fill="var(--ud-accent)" style={{ animation: "demo-pipeline-dot 2400ms ease-in-out infinite" }} />
        </svg>
        <div className="relative flex items-center justify-between h-full">
          {nodes.map((n, i) => (
            <div key={n.label} className="flex flex-col items-center gap-2 animate-fade-up" style={{ animationDelay: `${i * 150}ms` }}>
              <div
                className="w-14 h-14 rounded-full bg-ud-surface border-2 border-ud-accent/25 shadow-ud flex items-center justify-center"
                style={{ animation: `demo-node-breathe 2800ms ease-in-out ${i * 250}ms infinite` }}
              >
                <span className="text-[17px] font-bold tabular-nums text-ud-ink">{n.value}</span>
              </div>
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.05em] text-ud-muted">{n.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// A message traveling back and forth between two nodes -- the abstraction
// of "a text and a reply land in the same thread," not a rendering of any
// specific conversation UI.
function PingScene() {
  return (
    <div className="animate-fade-in">
      <p className="text-[13px] text-ud-text leading-relaxed mb-5">Every text and email, one thread — nothing lost in someone&apos;s phone.</p>
      <div className="relative" style={{ aspectRatio: "100 / 22" }}>
        <svg viewBox="0 0 100 22" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
          <FlowLine x1={16} y1={11} x2={84} y2={11} delay={100} />
          <circle r={1.8} cy={11} fill="var(--ud-accent)" style={{ animation: "demo-ping-dot 1900ms ease-in-out infinite" }} />
        </svg>
        <div className="relative flex items-center justify-between h-full">
          <div className="flex flex-col items-center gap-2 animate-fade-up">
            <div
              className="w-14 h-14 rounded-full bg-ud-surface border-2 border-ud-accent/25 shadow-ud flex items-center justify-center"
              style={{ animation: "demo-node-breathe 2800ms ease-in-out infinite" }}
            >
              <ChatIcon size={18} />
            </div>
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.05em] text-ud-muted">Customer</span>
          </div>
          <div className="flex flex-col items-center gap-2 animate-fade-up" style={{ animationDelay: "150ms" }}>
            <div
              className="w-14 h-14 rounded-full bg-ud-surface border-2 border-ud-accent/25 shadow-ud flex items-center justify-center"
              style={{ animation: "demo-node-breathe 2800ms ease-in-out 950ms infinite" }}
            >
              <MailIcon size={18} />
            </div>
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.05em] text-ud-muted">Your inbox</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Four tools converging into one glowing hub -- "connect what you already
// use," visualized rather than shown as a literal list of provider rows.
function NetworkScene() {
  const dotAnimations = ["demo-net-dot-1", "demo-net-dot-2", "demo-net-dot-3", "demo-net-dot-4"];
  return (
    <div className="animate-fade-in">
      <p className="text-[13px] text-ud-text leading-relaxed mb-4">Connect the software you already use — everything flows into one place.</p>
      <div className="flex items-center justify-center gap-2.5 mb-4">
        {providers.map((name, i) => (
          <span
            key={name}
            className="animate-fade-up rounded-full border border-ud bg-ud-surface px-3 py-1.5 text-[11px] font-semibold text-ud-ink shadow-ud"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            {name}
          </span>
        ))}
      </div>
      <div className="relative" style={{ aspectRatio: "100 / 30" }}>
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
          <FlowLine x1={10} y1={5} x2={50} y2={27} delay={0} />
          <FlowLine x1={36} y1={5} x2={50} y2={27} delay={150} />
          <FlowLine x1={64} y1={5} x2={50} y2={27} delay={300} />
          <FlowLine x1={90} y1={5} x2={50} y2={27} delay={450} />
          {dotAnimations.map((anim, i) => (
            <circle key={anim} r={1.6} fill="var(--ud-accent)" style={{ animation: `${anim} 1500ms ease-in-out ${i * 260}ms infinite` }} />
          ))}
        </svg>
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
          <div
            className="w-11 h-11 rounded-full bg-ud-accent flex items-center justify-center shadow-[0_8px_24px_rgba(74,63,168,0.4)]"
            style={{ animation: "demo-hub-pulse 2000ms ease-in-out infinite" }}
          >
            <PlugIcon size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}

// A pulsing spark resolving into a handful of numbers -- "Vera turns your
// business into a few things that matter," visualized as the AI noticing
// and surfacing signal, not a copy of the brief panel's actual layout.
function InsightScene() {
  const followUps = useCountUp(4, 900);
  const jobs = useCountUp(7, 900);
  const tiles = [
    { value: String(followUps), label: "Follow-ups", urgent: true },
    { value: "$12.4k", label: "Open quotes", urgent: false },
    { value: "$3.8k", label: "Unpaid", urgent: true },
    { value: String(jobs), label: "Active jobs", urgent: false },
  ];
  return (
    <div className="animate-fade-in text-center">
      <div className="relative mx-auto mb-4 w-12 h-12">
        <span className="absolute inset-0 rounded-full bg-ud-accent/25" style={{ animation: "demo-ping-ring 2200ms ease-out infinite" }} />
        <div
          className="relative w-12 h-12 rounded-full bg-ud-surface border border-ud-accent/30 shadow-ud flex items-center justify-center"
          style={{ animation: "demo-node-breathe 2600ms ease-in-out infinite" }}
        >
          <SparkleIcon size={18} />
        </div>
      </div>
      <p className="text-[13px] text-ud-text leading-relaxed mb-5">Vera reviews your business overnight — and tells you what matters.</p>
      <div className="flex items-center justify-center gap-3">
        {tiles.map((t, i) => (
          <div key={t.label} className="flex flex-col items-center gap-1.5 animate-fade-up" style={{ animationDelay: `${300 + i * 100}ms` }}>
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-ud ${t.urgent ? "border-red-200 bg-red-50/60" : "border-ud-accent/20 bg-ud-surface"}`}
              style={{ animation: `demo-node-breathe 2800ms ease-in-out ${i * 220}ms infinite` }}
            >
              <span className={`text-[13px] font-bold tabular-nums ${t.urgent ? "text-red-600" : "text-ud-ink"}`}>{t.value}</span>
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-ud-muted">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SCENE_CONTENT: Record<SceneId, () => React.JSX.Element> = {
  brief: InsightScene,
  inbox: PingScene,
  pipeline: FlowScene,
  connect: NetworkScene,
};

const EMPTY_HEIGHTS: Record<SceneId, number> = { pipeline: 280, inbox: 280, connect: 280, brief: 280 };

// A looping, auto-playing motion-graphics reel instead of a video file --
// loads instantly, needs no hosting, and (since it's an abstraction rather
// than a mockup of specific screens) can't go stale the way a literal UI
// recreation would the moment the real product changes. All four scenes
// sit stacked in one continuous strip; the reel scrolls smoothly from one to
// the next instead of cutting between separate cards, so it plays more like
// a trailer than a slideshow. Each scene's real rendered height is
// measured after layout -- the viewport animates to match it exactly, so
// content is never clipped or left floating in dead space.
export function LiveDemo() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [epoch, setEpoch] = useState<Record<SceneId, number>>({ pipeline: 0, inbox: 0, connect: 0, brief: 0 });
  const [heights, setHeights] = useState<Record<SceneId, number>>(EMPTY_HEIGHTS);
  const sceneRefs = useRef<Record<SceneId, HTMLDivElement | null>>({ pipeline: null, inbox: null, connect: null, brief: null });
  const reducedMotion = useRef(false);
  const scene = SCENES[sceneIndex];
  const Icon = SCENE_ICON[scene.id];

  // The viewport's own height is React state, not a value CSS-transitions
  // toward -- animating "height" directly meant the box visually lagged
  // behind content for as long as the transition took (800ms), and for
  // that whole window whatever had ALREADY rendered at its real size (the
  // new scene's content, or the inbox reply landing mid-scene) stuck out
  // past the still-catching-up box and got clipped by overflow-hidden.
  // Instead: grow the box height INSTANTLY the moment content needs more
  // room (so it's never shorter than what's actually rendered), and only
  // shrink back down -- once, well after the scroll transition and any
  // in-scene growth (the inbox reply) have had time to finish -- to fit
  // the scene's final settled size exactly, so a shorter new scene doesn't
  // leave permanent dead space below it.
  const [boxHeight, setBoxHeight] = useState<number>(() => EMPTY_HEIGHTS[SCENES[0].id]);
  const heightsRef = useRef(heights);
  heightsRef.current = heights;
  const activeHeight = heights[scene.id];

  useEffect(() => {
    setBoxHeight((prev) => Math.max(prev, activeHeight));
  }, [scene.id, activeHeight]);

  useEffect(() => {
    // 2100ms clears both the ~800ms scroll transition and the inbox
    // scene's own slowest growth step (its reply appears at 1900ms) --
    // reading heightsRef here (not `heights` via closure) means this picks
    // up whatever the scene's height actually settled at by fire time,
    // not a stale value captured back when the scene first became active.
    const t = setTimeout(() => setBoxHeight(heightsRef.current[scene.id]), 2100);
    return () => clearTimeout(t);
  }, [scene.id]);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // A plain one-time measurement isn't enough -- the inbox scene's own
  // content grows after mount as it moves from "inbound only" to "inbound +
  // typing" to "inbound + reply", so a snapshot taken at mount locks the
  // viewport to the shortest state and clips whatever grows in later.
  // ResizeObserver keeps every scene's measured height current for as long
  // as it's mounted, not just at first paint.
  useLayoutEffect(() => {
    const observers: ResizeObserver[] = [];
    for (const s of SCENES) {
      const el = sceneRefs.current[s.id];
      if (!el) continue;
      const ro = new ResizeObserver(() => {
        // offsetHeight (border-box, includes the div's own px-5/py-4
        // padding) -- entries[0].contentRect excludes that padding, which
        // under-measured every scene by exactly its vertical padding and
        // clipped the last ~32px of every scene's content.
        const rounded = el.offsetHeight;
        setHeights((prev) => (prev[s.id] === rounded ? prev : { ...prev, [s.id]: rounded }));
      });
      ro.observe(el);
      observers.push(ro);
    }
    return () => observers.forEach((ro) => ro.disconnect());
  }, []);

  useEffect(() => {
    if (reducedMotion.current) return;
    const timer = setTimeout(() => {
      const next = (sceneIndex + 1) % SCENES.length;
      const nextId = SCENES[next].id;
      // Remounting only the scene about to scroll into view (not the whole
      // reel) replays its entrance animation every loop, so the demo still
      // feels alive on pass two instead of settling into a static screenshot.
      setEpoch((e) => ({ ...e, [nextId]: e[nextId] + 1 }));
      setSceneIndex(next);
    }, scene.duration);
    return () => clearTimeout(timer);
  }, [sceneIndex, scene.duration]);

  let cumulative = 0;
  const offsets: Record<SceneId, number> = { pipeline: 0, inbox: 0, connect: 0, brief: 0 };
  for (const s of SCENES) {
    offsets[s.id] = cumulative;
    cumulative += heights[s.id];
  }

  const transition = reducedMotion.current ? "none" : "800ms cubic-bezier(0.65, 0, 0.35, 1)";

  return (
    <div className="relative mx-auto max-w-2xl" style={{ perspective: 1400 }}>
      {/* Ambient glow behind the floating frame -- the "cinematic stage" the
          product sits on, kept to a single soft accent-tinted blob so it
          reads as premium lighting rather than the old flat AI-startup
          dark-glow-everywhere look. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-visible">
        <div
          className="absolute left-1/2 top-1/2 h-[380px] w-[520px] rounded-full bg-ud-accent/[0.18] blur-[100px]"
          style={{ animation: reducedMotion.current ? "none" : "demo-glow-pulse 5s ease-in-out infinite" }}
        />
      </div>

      <div
        className="relative rounded-[18px] border border-ud bg-ud-surface shadow-[0_50px_100px_-20px_rgba(15,23,42,0.35)] overflow-hidden"
        style={{
          animation: reducedMotion.current ? "none" : "demo-float 7s ease-in-out infinite",
          transformStyle: "preserve-3d",
        }}
      >
        {/* A brief accent ring flash on every scene cut -- a small "camera
            beat" so the transition reads as an edit, not just a scroll. */}
        <div
          key={`flash-${scene.id}`}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[18px] ring-2 ring-inset ring-ud-accent/60"
          style={{ animation: reducedMotion.current ? "none" : "demo-scene-flash 700ms ease-out" }}
        />

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ud">
          <div key={scene.id} className="flex items-center gap-2 animate-fade-in">
            <div className="w-5 h-5 rounded-[5px] bg-ud-accent/[0.12] flex items-center justify-center">
              <Icon size={11} />
            </div>
            <span className="text-[12px] font-semibold text-ud-ink">{scene.label}</span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-ud-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        <div
          className="relative bg-ud-page overflow-hidden"
          style={{ height: boxHeight, transition: "none" }}
        >
          <div style={{ transform: `translateY(-${offsets[scene.id]}px)`, transition: `transform ${transition}` }}>
            {SCENES.map((s) => {
              const Content = SCENE_CONTENT[s.id];
              return (
                <div
                  key={s.id}
                  ref={(el) => { sceneRefs.current[s.id] = el; }}
                  className="px-5 py-4"
                >
                  <Content key={`${s.id}-${epoch[s.id]}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

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

// A straight connector line, plus a small dot that travels along it -- the
// two together are the "flow" motif reused (with different node
// counts/paths) across every scene below. The line renders fully drawn from
// the start -- it previously animated in with its own 900ms "draw" separate
// from the scene's 650ms opacity crossfade, so the line was still only
// partway drawn by the moment the scene had faded fully into view, which
// read as a broken gap in the middle of the line rather than a line that
// just hadn't arrived yet. The crossfade alone is enough of a reveal.
function FlowLine({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <path
      d={`M ${x1} ${y1} L ${x2} ${y2}`}
      fill="none"
      stroke="var(--ud-accent)"
      strokeOpacity={0.3}
      strokeWidth={1.5}
      vectorEffect="non-scaling-stroke"
      strokeLinecap="round"
    />
  );
}

type SceneProps = { active: boolean };

// Every continuous ("infinite") animation below is gated on `active` --
// while a scene sits mounted but off-screen (kept mounted only so the CSS
// grid sizing trick has something to measure), none of its dots/pulses are
// actually running. Without this, all four scenes' animations play from
// the moment the page loads regardless of which one is visible, so by the
// time a scene's turn comes around its motion is already mid-cycle instead
// of starting fresh in sync with the crossfade -- which reads as the
// animation not working at all, not just as bad timing.
//
// Every traveling-dot circle/rect below also gets an explicit
// `opacity: active ? undefined : 0` alongside the animation toggle, and a
// static cx/cy (or x/y) attribute for its resting position, with the actual
// travel done via an animated `transform: translate()` rather than
// animating cx/cy/x themselves. Two separate reasons:
//
// 1. Safari has long had incomplete support for animating raw SVG geometry
//    attributes (cx/cy/x/y/r) through CSS @keyframes -- opacity animates
//    fine there, but the position just doesn't move, so the dot sits fully
//    visible and motionless at its starting point for the whole scene
//    instead of traveling. `transform` (including unitless translate values,
//    which resolve in the SVG's own user-unit space the same way cx/cy do)
//    is universally well supported for CSS animation, SVG included, so it's
//    the cross-browser-safe way to move these.
// 2. Without a static resting attribute, the instant a scene goes inactive
//    and its animation switches to "none", the shape would snap to the SVG
//    default position (0,0) and sit frozen there for the rest of that
//    scene's ~650ms fade-out, which is still mostly opaque -- a stray,
//    motionless dot glued to the left edge on every transition. Giving it
//    a real static position removes that failure mode regardless of browser,
//    and the explicit opacity toggle hides it outright the instant it's
//    inactive rather than leaving it visible anywhere at all.
//
// Any of these that also stagger with a CSS `animation-delay` (the four
// Connections dots, the reply bubble) additionally need `backwards` in
// their animation shorthand -- without it, a delayed animation has no
// effect at all until its delay elapses, so the shape sits at its static
// resting position, fully opaque, for the entire delay. `backwards` makes
// the browser apply the animation's own 0% keyframe (which already starts
// at opacity 0) throughout the delay instead.

// Three stages flowing into each other, a single particle traveling the
// whole path -- an abstraction of "a job moves from lead to paid," not a
// recreation of the kanban board itself.
function FlowScene({ active }: SceneProps) {
  const leads = useCountUp(12, 1000);
  const inProgress = useCountUp(8, 1000);
  const won = useCountUp(5, 1000);
  const nodes = [
    { label: "New leads", value: leads },
    { label: "In progress", value: inProgress },
    { label: "Won", value: won },
  ];
  return (
    <div className="animate-fade-in">
      <p className="text-[13px] text-ud-text leading-relaxed mb-5">Every job, tracked automatically — from lead to paid.</p>
      <div className="relative" style={{ aspectRatio: "100 / 22" }}>
        <svg viewBox="0 0 100 22" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
          <FlowLine x1={7} y1={11} x2={50} y2={11} />
          <FlowLine x1={50} y1={11} x2={93} y2={11} />
          <circle
            r={1.8}
            cx={5}
            cy={11}
            fill="var(--ud-accent)"
            style={{ animation: active ? "demo-pipeline-dot 3200ms ease-in-out infinite backwards" : "none", opacity: active ? undefined : 0 }}
          />
        </svg>
        <div className="relative flex items-center justify-between h-full">
          {nodes.map((n, i) => (
            <div key={n.label} className="flex flex-col items-center gap-2 animate-fade-up" style={{ animationDelay: `${i * 150}ms` }}>
              <div
                className="w-14 h-14 rounded-full bg-ud-surface border-2 border-ud-accent/25 shadow-ud flex items-center justify-center"
                style={{ animation: active ? `demo-node-breathe 2800ms ease-in-out ${i * 250}ms infinite` : "none" }}
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

// Two small message bubbles traveling the path in opposite directions, one
// after the other -- a message going out, then a reply coming back -- the
// abstraction of "a text and a reply land in the same thread," not a
// rendering of any specific conversation UI.
function PingScene({ active }: SceneProps) {
  return (
    <div className="animate-fade-in">
      <p className="text-[13px] text-ud-text leading-relaxed mb-5">Every text and email, one thread — nothing lost in someone&apos;s phone.</p>
      <div className="relative" style={{ aspectRatio: "100 / 22" }}>
        <svg viewBox="0 0 100 22" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
          <FlowLine x1={16} y1={11} x2={84} y2={11} />
          <rect
            x={13}
            y={9.4}
            width={6}
            height={3.2}
            rx={1.6}
            fill="var(--ud-accent)"
            style={{ animation: active ? "demo-msg-bubble-out 3400ms ease-in-out infinite backwards" : "none", opacity: active ? undefined : 0 }}
          />
          <rect
            x={81}
            y={9.4}
            width={6}
            height={3.2}
            rx={1.6}
            fill="var(--ud-accent)"
            fillOpacity={0.6}
            style={{ animation: active ? "demo-msg-bubble-in 3400ms ease-in-out 1700ms infinite backwards" : "none", opacity: active ? undefined : 0 }}
          />
        </svg>
        <div className="relative flex items-center justify-between h-full">
          <div className="flex flex-col items-center gap-2 animate-fade-up">
            <div
              className="w-14 h-14 rounded-full bg-ud-surface border-2 border-ud-accent/25 shadow-ud flex items-center justify-center"
              style={{ animation: active ? "demo-node-breathe 2800ms ease-in-out infinite" : "none" }}
            >
              <ChatIcon size={18} />
            </div>
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.05em] text-ud-muted">Customer</span>
          </div>
          <div className="flex flex-col items-center gap-2 animate-fade-up" style={{ animationDelay: "150ms" }}>
            <div
              className="w-14 h-14 rounded-full bg-ud-surface border-2 border-ud-accent/25 shadow-ud flex items-center justify-center"
              style={{ animation: active ? "demo-node-breathe 2800ms ease-in-out 950ms infinite" : "none" }}
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
function NetworkScene({ active }: SceneProps) {
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
          <FlowLine x1={10} y1={5} x2={50} y2={27} />
          <FlowLine x1={36} y1={5} x2={50} y2={27} />
          <FlowLine x1={64} y1={5} x2={50} y2={27} />
          <FlowLine x1={90} y1={5} x2={50} y2={27} />
          {dotAnimations.map((anim, i) => (
            <circle
              key={anim}
              r={1.6}
              cx={[10, 36, 64, 90][i]}
              cy={5}
              fill="var(--ud-accent)"
              style={{ animation: active ? `${anim} 2400ms ease-in-out ${i * 320}ms infinite backwards` : "none", opacity: active ? undefined : 0 }}
            />
          ))}
        </svg>
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
          <div
            className="w-11 h-11 rounded-full bg-ud-accent flex items-center justify-center shadow-[0_8px_24px_rgba(74,63,168,0.4)]"
            style={{ animation: active ? "demo-hub-pulse 2600ms ease-in-out infinite" : "none" }}
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
function InsightScene({ active }: SceneProps) {
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
        <span className="absolute inset-0 rounded-full bg-ud-accent/25" style={{ animation: active ? "demo-ping-ring 2800ms ease-out infinite" : "none" }} />
        <div
          className="relative w-12 h-12 rounded-full bg-ud-surface border border-ud-accent/30 shadow-ud flex items-center justify-center"
          style={{ animation: active ? "demo-node-breathe 2600ms ease-in-out infinite" : "none" }}
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
              style={{ animation: active ? `demo-node-breathe 2800ms ease-in-out ${i * 220}ms infinite` : "none" }}
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

const SCENE_CONTENT: Record<SceneId, (props: SceneProps) => React.JSX.Element> = {
  brief: InsightScene,
  inbox: PingScene,
  pipeline: FlowScene,
  connect: NetworkScene,
};

// A looping, auto-playing motion-graphics reel instead of a video file --
// loads instantly, needs no hosting, and (since it's an abstraction rather
// than a mockup of specific screens) can't go stale the way a literal UI
// recreation would the moment the real product changes.
//
// The frame's height was previously tracked in JS (measure every scene's
// real height via ResizeObserver, keep the tallest in state) and it never
// stopped visibly wobbling by a few pixels -- sub-pixel text-metric
// rounding as the count-up digits change width was enough to nudge a
// measurement, and any measurement-based approach means fighting that
// forever. This uses a CSS-only technique instead: all four scenes occupy
// the exact same grid cell (each explicitly placed at row 1 / column 1),
// so the single grid track sizes itself to whichever occupant is tallest
// -- a native, deterministic part of how CSS grid lays out overlapping
// content, not something computed and re-computed in JS on every render.
// There is no height to get wrong because nothing ever sets one.
//
// Scenes cross-fade (opacity + a slight scale) instead of scrolling past
// each other -- a scroll needs to know how far to travel, which reintroduces
// exactly the height-tracking problem this is meant to avoid.
export function LiveDemo() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [epoch, setEpoch] = useState<Record<SceneId, number>>({ pipeline: 0, inbox: 0, connect: 0, brief: 0 });
  const reducedMotion = useRef(false);
  const scene = SCENES[sceneIndex];
  const Icon = SCENE_ICON[scene.id];

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (reducedMotion.current) return;
    const timer = setTimeout(() => {
      const next = (sceneIndex + 1) % SCENES.length;
      const nextId = SCENES[next].id;
      // Remounting only the scene about to become active (not the whole
      // reel) replays its entrance animation every loop, so the demo still
      // feels alive on pass two instead of settling into a static screenshot.
      setEpoch((e) => ({ ...e, [nextId]: e[nextId] + 1 }));
      setSceneIndex(next);
    }, scene.duration);
    return () => clearTimeout(timer);
  }, [sceneIndex, scene.duration]);

  // A plain cross-fade is gentle enough to keep even under reduced-motion
  // (unlike the floating tilt, glow pulse, and traveling dots, which are
  // all switched off below) -- an instant hard swap between differently
  // sized scenes is more jarring than a soft fade, not less.
  const crossfade = reducedMotion.current ? "opacity 400ms ease" : "opacity 650ms ease, transform 650ms ease";

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

        <div className="relative bg-ud-page overflow-hidden">
          <div className="grid">
            {SCENES.map((s, i) => {
              const Content = SCENE_CONTENT[s.id];
              const isActive = i === sceneIndex;
              return (
                // Every scene sits in the SAME grid cell (explicit row 1 /
                // column 1 on all four) -- the grid's single track sizes
                // itself to the tallest occupant natively, so this box's
                // height is never computed in JS at all, just laid out by
                // the browser like any other CSS grid.
                <div
                  key={s.id}
                  aria-hidden={!isActive}
                  className="px-5 py-4 flex flex-col justify-center"
                  style={{
                    gridColumn: 1,
                    gridRow: 1,
                    opacity: isActive ? 1 : 0,
                    transform: reducedMotion.current || isActive ? "scale(1)" : "scale(0.98)",
                    transition: crossfade,
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                >
                  <Content key={`${s.id}-${epoch[s.id]}`} active={isActive} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

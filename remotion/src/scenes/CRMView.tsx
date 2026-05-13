import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrowserChrome, RealSidebar } from "./Dashboard";

const C = {
  bg: "#f5f7fb", surface: "#ffffff", border: "#e2e8f0", ink: "#0f172a",
  muted: "#64748b", subtle: "#94a3b8", accent: "#2563eb",
  emerald: "#10b981", amber: "#f59e0b", red: "#ef4444",
};

const opps = [
  { name: "Johnson Bathroom Remodel", person: "Sarah Johnson", value: "$8,400", stage: "Quoted", followUp: "Overdue", stageColor: C.amber, followColor: C.red, source: "Referral" },
  { name: "Rivera Kitchen Renovation", person: "Mike Rivera", value: "$14,200", stage: "In progress", followUp: "Due today", stageColor: C.accent, followColor: C.amber, source: "Website" },
  { name: "Chen Office Plumbing", person: "Lisa Chen", value: "$3,800", stage: "New", followUp: "Not set", stageColor: C.emerald, followColor: C.subtle, source: "Cold call" },
  { name: "Bradley Garage Upgrade", person: "Tom Bradley", value: "$5,100", stage: "Quoted", followUp: "Tomorrow", stageColor: C.amber, followColor: C.muted, source: "Repeat" },
];

const stages = [
  { label: "New", count: 3, value: "$11,200", color: C.emerald, pct: 30 },
  { label: "Quoted", count: 5, value: "$24,400", color: C.amber, pct: 55 },
  { label: "In progress", count: 3, value: "$18,600", color: C.accent, pct: 42 },
  { label: "Closed won", count: 7, value: "$52,100", color: "#8b5cf6", pct: 80 },
];

export const CRMView: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [24, 0], { extrapolateRight: "clamp" });
  const browserSpring = spring({ frame, fps, config: { damping: 16, stiffness: 60 }, delay: 15 });

  return (
    <AbsoluteFill style={{ background: "#0a0f1e" }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px", gap: 40 }}>
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, textAlign: "center" }}>
          <p style={{ fontSize: 16, color: "#8b5cf6", fontWeight: 600, margin: "0 0 12px", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "3px" }}>Pipeline</p>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "system-ui, sans-serif" }}>Every opportunity, tracked</h2>
        </div>
        <div style={{ opacity: browserSpring, transform: `scale(${0.88 + browserSpring * 0.12}) translateY(${(1 - browserSpring) * 24}px)`, width: "100%", borderRadius: 14, overflow: "hidden", border: "1px solid #334155", boxShadow: "0 32px 64px rgba(0,0,0,0.7)" }}>
          <BrowserChrome url="frontierops.business/pipeline" />
          <div style={{ background: C.bg, display: "flex", minHeight: 400 }}>
            <RealSidebar active="pipeline" />
            <div style={{ flex: 1, padding: "24px 28px" }}><PipelineContent frame={frame} fps={fps} /></div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Badge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, color, background: `${color}14`, border: `1px solid ${color}30`, borderRadius: 100, padding: "2px 7px", fontFamily: "system-ui, sans-serif", width: "fit-content" }}>{label}</span>
);

const PipelineContent: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const statsSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, delay: 20 });
  const listOpacity = interpolate(frame, [50, 75], [0, 1], { extrapolateRight: "clamp" });
  const statCards = [
    { label: "Open pipeline", value: "$48,200", helper: "11 opportunities", accent: C.accent },
    { label: "Follow-up needed", value: "4", helper: "Including 2 overdue", accent: C.red },
    { label: "Won this month", value: "$18,400", helper: "5 closed", accent: C.emerald },
    { label: "Missing estimates", value: "2", helper: "No value set", accent: C.amber },
  ];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: C.ink, margin: "0 0 2px", fontFamily: "system-ui, sans-serif" }}>Pipeline</h2>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, fontFamily: "system-ui, sans-serif" }}>Open leads and opportunities</p>
        </div>
        <div style={{ background: C.accent, borderRadius: 10, padding: "7px 14px" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "system-ui, sans-serif" }}>+ New lead</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{ opacity: statsSpring, transform: `translateY(${(1 - statsSpring) * 8}px)`, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "12px 14px", position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: s.accent, borderRadius: "18px 0 0 18px" }} />
            <p style={{ fontSize: 10, color: C.muted, margin: "0 0 3px", fontFamily: "system-ui, sans-serif", fontWeight: 500, paddingLeft: 3 }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 600, color: C.ink, margin: "0 0 1px", fontFamily: "system-ui, sans-serif", paddingLeft: 3 }}>{s.value}</p>
            <p style={{ fontSize: 10, color: C.subtle, margin: 0, fontFamily: "system-ui, sans-serif", paddingLeft: 3 }}>{s.helper}</p>
          </div>
        ))}
      </div>
      <div style={{ opacity: listOpacity, display: "grid", gridTemplateColumns: "1fr 200px", gap: 14 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ borderBottom: "1px solid #f1f5f9", padding: "11px 16px" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: 0, fontFamily: "system-ui, sans-serif" }}>Open opportunities</p>
          </div>
          {opps.map((opp, i) => (
            <div key={opp.name} style={{ padding: "11px 16px", borderBottom: i < opps.length - 1 ? "1px solid #f8fafc" : "none", display: "grid", gridTemplateColumns: "1fr 110px 120px", gap: 8, alignItems: "start" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: "0 0 1px", fontFamily: "system-ui, sans-serif" }}>{opp.name}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0, fontFamily: "system-ui, sans-serif" }}>{opp.person} · {opp.source}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: C.subtle, margin: "0 0 2px", fontFamily: "system-ui, sans-serif" }}>Value</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: 0, fontFamily: "system-ui, sans-serif" }}>{opp.value}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Badge label={opp.stage} color={opp.stageColor} />
                <Badge label={opp.followUp} color={opp.followColor} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {stages.map((s) => (
            <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "11px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: s.color, fontFamily: "system-ui, sans-serif" }}>{s.label}</span>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: "system-ui, sans-serif" }}>{s.count}</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: 0, fontFamily: "system-ui, sans-serif" }}>{s.value}</p>
              <div style={{ height: 3, background: C.border, borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${s.pct}%`, background: s.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

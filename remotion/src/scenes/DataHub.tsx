import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrowserChrome, RealSidebar } from "./Dashboard";

const C = {
  bg: "#f5f7fb", surface: "#ffffff", border: "#e2e8f0", ink: "#0f172a",
  muted: "#64748b", subtle: "#94a3b8", accent: "#2563eb",
  emerald: "#10b981", amber: "#f59e0b", red: "#ef4444",
};

const checks = [
  { label: "Missing email addresses", count: 3, severity: "warning" },
  { label: "Duplicate phone numbers", count: 1, severity: "warning" },
  { label: "Customers with no opportunities", count: 8, severity: "info" },
  { label: "Overdue follow-ups", count: 3, severity: "error" },
  { label: "Unlinked revenue records", count: 2, severity: "warning" },
];

const severityStyle: Record<string, { color: string; bg: string; border: string }> = {
  error: { color: C.red, bg: "#fef2f2", border: "#fecaca" },
  warning: { color: C.amber, bg: "#fffbeb", border: "#fde68a" },
  info: { color: C.accent, bg: "#eff6ff", border: "#bfdbfe" },
};

export const DataHub: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [24, 0], { extrapolateRight: "clamp" });
  const browserSpring = spring({ frame, fps, config: { damping: 16, stiffness: 60 }, delay: 15 });

  return (
    <AbsoluteFill style={{ background: "#0a0f1e" }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px", gap: 40 }}>
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, textAlign: "center" }}>
          <p style={{ fontSize: 16, color: C.amber, fontWeight: 600, margin: "0 0 12px", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "3px" }}>Insights</p>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "system-ui, sans-serif" }}>Know your data is clean</h2>
        </div>
        <div style={{ opacity: browserSpring, transform: `scale(${0.88 + browserSpring * 0.12}) translateY(${(1 - browserSpring) * 24}px)`, width: "100%", borderRadius: 14, overflow: "hidden", border: "1px solid #334155", boxShadow: "0 32px 64px rgba(0,0,0,0.7)" }}>
          <BrowserChrome url="frontierops.business/insights" />
          <div style={{ background: C.bg, display: "flex", minHeight: 400 }}>
            <RealSidebar active="insights" />
            <div style={{ flex: 1, padding: "24px 28px" }}><InsightsContent frame={frame} fps={fps} /></div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const InsightsContent: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const headerSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, delay: 18 });
  const checksOpacity = interpolate(frame, [40, 62], [0, 1], { extrapolateRight: "clamp" });
  const progress = interpolate(frame, [20, 65], [0, 71], { extrapolateRight: "clamp" });
  const r = 32; const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: C.ink, margin: "0 0 2px", fontFamily: "system-ui, sans-serif" }}>Insights</h2>
        <p style={{ fontSize: 13, color: C.muted, margin: 0, fontFamily: "system-ui, sans-serif" }}>Trends and data quality for Acme Plumbing Co.</p>
      </div>
      <div style={{ opacity: headerSpring, transform: `translateY(${(1 - headerSpring) * 8}px)`, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "18px 22px", marginBottom: 18, display: "flex", alignItems: "center", gap: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ flexShrink: 0 }}>
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={r} fill="none" stroke={C.border} strokeWidth="7" />
            <circle cx="44" cy="44" r={r} fill="none" stroke={progress > 60 ? C.amber : C.red} strokeWidth="7" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 44 44)" />
            <text x="44" y="49" textAnchor="middle" fill={C.ink} fontSize="18" fontWeight="700" fontFamily="system-ui, sans-serif">{Math.round(progress)}</text>
          </svg>
          <p style={{ fontSize: 10, color: C.muted, textAlign: "center", margin: "2px 0 0", fontFamily: "system-ui, sans-serif" }}>Data health</p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: "0 0 4px", fontFamily: "system-ui, sans-serif" }}>Your workspace needs some attention</p>
          <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px", fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>Fixing these issues keeps your pipeline accurate and improves your AI Advisor summaries.</p>
          <div style={{ display: "flex", gap: 20 }}>
            {[["17", "Total records"], ["5", "Issues found"], ["12", "Clean"]].map(([val, lbl]) => (
              <div key={lbl}>
                <p style={{ fontSize: 20, fontWeight: 600, color: C.ink, margin: 0, fontFamily: "system-ui, sans-serif" }}>{val}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: 0, fontFamily: "system-ui, sans-serif" }}>{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ opacity: checksOpacity }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.subtle, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px", fontFamily: "system-ui, sans-serif" }}>Quality checks</p>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          {checks.map((check, i) => {
            const s = severityStyle[check.severity];
            const rowSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, delay: 48 + i * 8 });
            return (
              <div key={check.label} style={{ opacity: rowSpring, transform: `translateX(${(1 - rowSpring) * 14}px)`, display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: i < checks.length - 1 ? "1px solid #f8fafc" : "none", background: s.bg }}>
                <div style={{ width: 3, height: 32, background: s.color, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: C.ink, fontFamily: "system-ui, sans-serif" }}>{check.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.color, background: C.surface, border: `1px solid ${s.border}`, borderRadius: 8, padding: "2px 10px", fontFamily: "system-ui, sans-serif" }}>{check.count}</span>
                <span style={{ fontSize: 12, color: C.accent, fontFamily: "system-ui, sans-serif", fontWeight: 500 }}>Fix →</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

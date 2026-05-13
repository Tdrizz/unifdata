import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrowserChrome, RealSidebar } from "./Dashboard";

const C = {
  bg: "#f5f7fb", surface: "#ffffff", border: "#e2e8f0", ink: "#0f172a",
  muted: "#64748b", subtle: "#94a3b8", accent: "#2563eb",
  emerald: "#10b981", amber: "#f59e0b", red: "#ef4444",
};

const rows = [
  { name: "Johnson Remodels", email: "sarah@johnson.com", phone: "555-0142", status: "valid" },
  { name: "Rivera Properties", email: "mike@rivera.net", phone: "555-0198", status: "valid" },
  { name: "Mike Rivera", email: "m.rivera@gmail.com", phone: "555-0198", status: "duplicate" },
  { name: "Chen Dental Group", email: "", phone: "555-0271", status: "error" },
  { name: "Bradley Auto Sales", email: "tom@bradleyauto.com", phone: "555-0333", status: "valid" },
];

const statusMap: Record<string, { color: string; label: string; bg: string }> = {
  valid: { color: C.emerald, label: "Valid", bg: "#f0fdf4" },
  duplicate: { color: C.amber, label: "Duplicate", bg: "#fffbeb" },
  error: { color: C.red, label: "Error", bg: "#fef2f2" },
};

export const ImportEngine: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [24, 0], { extrapolateRight: "clamp" });
  const browserSpring = spring({ frame, fps, config: { damping: 16, stiffness: 60 }, delay: 15 });

  return (
    <AbsoluteFill style={{ background: "#0a0f1e" }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px", gap: 40 }}>
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, textAlign: "center" }}>
          <p style={{ fontSize: 16, color: C.emerald, fontWeight: 600, margin: "0 0 12px", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "3px" }}>Import engine</p>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "system-ui, sans-serif" }}>Clean data in — fast</h2>
        </div>
        <div style={{ opacity: browserSpring, transform: `scale(${0.88 + browserSpring * 0.12}) translateY(${(1 - browserSpring) * 24}px)`, width: "100%", borderRadius: 14, overflow: "hidden", border: "1px solid #334155", boxShadow: "0 32px 64px rgba(0,0,0,0.7)" }}>
          <BrowserChrome url="frontierops.business/imports/sessions/review" />
          <div style={{ background: C.bg, display: "flex", minHeight: 400 }}>
            <RealSidebar active="imports" />
            <div style={{ flex: 1, padding: "24px 28px" }}><ImportContent frame={frame} fps={fps} /></div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ImportContent: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const stepsOpacity = interpolate(frame, [18, 35], [0, 1], { extrapolateRight: "clamp" });
  const tableOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" });
  const steps = [
    { label: "Upload", done: true },
    { label: "Analyze", done: true },
    { label: "Review", active: true },
    { label: "Commit", done: false },
  ];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: C.ink, margin: "0 0 2px", fontFamily: "system-ui, sans-serif" }}>Import session</h2>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, fontFamily: "system-ui, sans-serif" }}>customers_may2025.csv · 5 rows</p>
        </div>
      </div>
      <div style={{ opacity: stepsOpacity, display: "flex", alignItems: "center", gap: 0, marginBottom: 22 }}>
        {steps.map((step, i) => (
          <React.Fragment key={step.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: step.done ? C.emerald : step.active ? C.accent : C.border, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: step.done || step.active ? "#fff" : C.muted, fontFamily: "system-ui, sans-serif" }}>
                {step.done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: step.active ? 600 : 400, color: step.done ? C.emerald : step.active ? C.accent : C.subtle, fontFamily: "system-ui, sans-serif" }}>{step.label}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: step.done ? `${C.emerald}44` : C.border, margin: "0 8px" }} />}
          </React.Fragment>
        ))}
      </div>
      <div style={{ opacity: tableOpacity, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "11px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: 0, fontFamily: "system-ui, sans-serif" }}>Row review</p>
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ fontSize: 12, color: C.emerald, fontFamily: "system-ui, sans-serif" }}>✓ 3 valid</span>
            <span style={{ fontSize: 12, color: C.amber, fontFamily: "system-ui, sans-serif" }}>⚠ 1 duplicate</span>
            <span style={{ fontSize: 12, color: C.red, fontFamily: "system-ui, sans-serif" }}>✗ 1 error</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.8fr 1.2fr 0.8fr", gap: 8, padding: "7px 16px", background: "#f8fafc", borderBottom: `1px solid ${C.border}` }}>
          {["Name", "Email", "Phone", "Status"].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 600, color: C.subtle, fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
          ))}
        </div>
        {rows.map((row, i) => {
          const rowSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, delay: 42 + i * 8 });
          const s = statusMap[row.status];
          return (
            <div key={row.name} style={{ opacity: rowSpring, transform: `translateX(${(1 - rowSpring) * 16}px)`, display: "grid", gridTemplateColumns: "1.8fr 1.8fr 1.2fr 0.8fr", gap: 8, padding: "10px 16px", background: row.status !== "valid" ? s.bg : C.surface, borderBottom: i < rows.length - 1 ? "1px solid #f8fafc" : "none", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: C.ink, fontFamily: "system-ui, sans-serif", fontWeight: 500 }}>{row.name}</span>
              <span style={{ fontSize: 12, color: row.email ? C.muted : `${C.red}99`, fontFamily: "system-ui, sans-serif", fontStyle: row.email ? "normal" : "italic" }}>{row.email || "missing"}</span>
              <span style={{ fontSize: 12, color: C.muted, fontFamily: "system-ui, sans-serif" }}>{row.phone}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 100, padding: "2px 8px", fontFamily: "system-ui, sans-serif", display: "inline-block" }}>{s.label}</span>
            </div>
          );
        })}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <div style={{ padding: "7px 14px", border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <span style={{ fontSize: 12, color: C.muted, fontFamily: "system-ui, sans-serif" }}>Fix 1 error first</span>
          </div>
          <div style={{ padding: "7px 16px", background: C.accent, borderRadius: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "system-ui, sans-serif" }}>Commit 3 valid rows →</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const checks = [
  { label: "Missing email addresses", count: 3, severity: "warning", icon: "✉️" },
  { label: "Duplicate phone numbers", count: 1, severity: "warning", icon: "📞" },
  { label: "Customers without opportunities", count: 8, severity: "info", icon: "🎯" },
  { label: "Overdue follow-ups", count: 3, severity: "error", icon: "⚡" },
  { label: "Unlinked revenue records", count: 2, severity: "warning", icon: "💰" },
];

const severityColor: Record<string, string> = { error: "#ef4444", warning: "#f59e0b", info: "#3b82f6" };

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
          <p style={{ fontSize: 16, color: "#f59e0b", fontWeight: 600, margin: "0 0 12px", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "3px" }}>Data Hub</p>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "system-ui, sans-serif" }}>Know your data is clean</h2>
        </div>
        <div style={{ opacity: browserSpring, transform: `scale(${0.85 + browserSpring * 0.15}) translateY(${(1 - browserSpring) * 30}px)`, width: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid #1e293b", boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
          <div style={{ background: "#111827", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #1e293b" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
            <div style={{ flex: 1, background: "#1e293b", borderRadius: 6, padding: "4px 12px", marginLeft: 8 }}>
              <span style={{ fontSize: 12, color: "#475569", fontFamily: "monospace" }}>frontierops.vercel.app/data-hub</span>
            </div>
          </div>
          <div style={{ background: "#0f172a", padding: "24px 28px" }}>
            <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
              <HealthScore frame={frame} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px", fontFamily: "system-ui, sans-serif" }}>Your workspace has some records that need attention. Fixing these keeps your pipeline accurate and AI summaries more helpful.</p>
                <div style={{ display: "flex", gap: 16 }}>
                  {[["17", "Total records"], ["5", "Issues found"], ["12", "Clean records"]].map(([val, lbl]) => (
                    <div key={lbl}>
                      <p style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0, fontFamily: "system-ui, sans-serif" }}>{val}</p>
                      <p style={{ fontSize: 11, color: "#475569", margin: 0, fontFamily: "system-ui, sans-serif" }}>{lbl}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#64748b", margin: "0 0 12px", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>Quality Checks</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {checks.map((check, i) => {
                const rowSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, delay: 25 + i * 10 });
                const color = severityColor[check.severity];
                return (
                  <div key={check.label} style={{ opacity: rowSpring, transform: `translateX(${(1 - rowSpring) * 20}px)`, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 10 }}>
                    <span style={{ fontSize: 18 }}>{check.icon}</span>
                    <span style={{ flex: 1, fontSize: 14, color: "#94a3b8", fontFamily: "system-ui, sans-serif" }}>{check.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "system-ui, sans-serif", background: `${color}22`, padding: "2px 10px", borderRadius: 6 }}>{check.count}</span>
                    <span style={{ fontSize: 12, color: "#3b82f6", fontFamily: "system-ui, sans-serif" }}>Fix →</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const HealthScore: React.FC<{ frame: number }> = ({ frame }) => {
  const progress = interpolate(frame, [20, 60], [0, 71], { extrapolateRight: "clamp" });
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f59e0b" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 50 50)" />
        <text x="50" y="55" textAnchor="middle" fill="#f1f5f9" fontSize="20" fontWeight="700" fontFamily="system-ui, sans-serif">71</text>
      </svg>
      <span style={{ fontSize: 11, color: "#64748b", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>Data Health</span>
    </div>
  );
};

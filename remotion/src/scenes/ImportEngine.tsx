import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const importRows = [
  { name: "Johnson Remodels", email: "sarah@johnson.com", phone: "555-0142", status: "valid" },
  { name: "Rivera Properties", email: "mike@rivera.net", phone: "555-0198", status: "valid" },
  { name: "Mike Rivera", email: "m.rivera@gmail.com", phone: "555-0198", status: "duplicate" },
  { name: "Chen Dental Group", email: "", phone: "555-0271", status: "error" },
  { name: "Bradley Auto Sales", email: "tom@bradleyauto.com", phone: "555-0333", status: "valid" },
];

const statusColors: Record<string, string> = { valid: "#22c55e", duplicate: "#f59e0b", error: "#ef4444" };
const statusLabels: Record<string, string> = { valid: "✓ Valid", duplicate: "⚠ Duplicate", error: "✗ Error" };

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
          <p style={{ fontSize: 16, color: "#22c55e", fontWeight: 600, margin: "0 0 12px", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "3px" }}>Import engine</p>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "system-ui, sans-serif" }}>Clean data in — fast</h2>
        </div>
        <div style={{ opacity: browserSpring, transform: `scale(${0.85 + browserSpring * 0.15}) translateY(${(1 - browserSpring) * 30}px)`, width: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid #1e293b", boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
          <div style={{ background: "#111827", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #1e293b" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
            <div style={{ flex: 1, background: "#1e293b", borderRadius: 6, padding: "4px 12px", marginLeft: 8 }}>
              <span style={{ fontSize: 12, color: "#475569", fontFamily: "monospace" }}>frontierops.vercel.app/imports/sessions/review</span>
            </div>
          </div>
          <div style={{ background: "#0f172a", padding: "20px 24px" }}>
            <ImportSteps frame={frame} fps={fps} />
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", margin: 0, fontFamily: "system-ui, sans-serif" }}>Row Review — customers_may2025.csv</h4>
                <div style={{ display: "flex", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "#22c55e", fontFamily: "system-ui, sans-serif" }}>3 valid</span>
                  <span style={{ fontSize: 12, color: "#f59e0b", fontFamily: "system-ui, sans-serif" }}>1 duplicate</span>
                  <span style={{ fontSize: 12, color: "#ef4444", fontFamily: "system-ui, sans-serif" }}>1 error</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr 1fr", gap: 8, padding: "6px 12px", marginBottom: 4 }}>
                {["Name", "Email", "Phone", "Status"].map(h => (
                  <span key={h} style={{ fontSize: 11, color: "#475569", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>{h}</span>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {importRows.map((row, i) => {
                  const rowSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, delay: 28 + i * 9 });
                  const color = statusColors[row.status];
                  return (
                    <div key={row.name + i} style={{ opacity: rowSpring, transform: `translateX(${(1 - rowSpring) * 20}px)`, display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr 1fr", gap: 8, padding: "10px 12px", background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#e2e8f0", fontFamily: "system-ui, sans-serif", fontWeight: 500 }}>{row.name}</span>
                      <span style={{ fontSize: 13, color: row.email ? "#94a3b8" : "#ef444466", fontFamily: "system-ui, sans-serif" }}>{row.email || "missing"}</span>
                      <span style={{ fontSize: 13, color: "#94a3b8", fontFamily: "system-ui, sans-serif" }}>{row.phone}</span>
                      <span style={{ fontSize: 11, color, fontFamily: "system-ui, sans-serif", fontWeight: 600 }}>{statusLabels[row.status]}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, gap: 10 }}>
                <div style={{ padding: "8px 16px", background: "#1e293b", borderRadius: 8, border: "1px solid #334155" }}>
                  <span style={{ fontSize: 13, color: "#64748b", fontFamily: "system-ui, sans-serif" }}>Fix errors first</span>
                </div>
                <div style={{ padding: "8px 20px", background: "#1d4ed8", borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: "#fff", fontFamily: "system-ui, sans-serif", fontWeight: 600 }}>Commit 3 valid rows →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const ImportSteps: React.FC<{ frame: number; fps: number }> = () => {
  const steps = ["Upload", "Analyze", "Review", "Commit"];
  const activeStep = 2;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {steps.map((step, i) => (
        <React.Fragment key={step}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < activeStep ? "#22c55e" : i === activeStep ? "#3b82f6" : "#1e293b", border: i === activeStep ? "2px solid #60a5fa" : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: i <= activeStep ? "#fff" : "#475569", fontFamily: "system-ui, sans-serif" }}>
              {i < activeStep ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 11, color: i === activeStep ? "#60a5fa" : i < activeStep ? "#22c55e" : "#475569", fontFamily: "system-ui, sans-serif" }}>{step}</span>
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < activeStep ? "#22c55e44" : "#1e293b", marginBottom: 18, marginLeft: 6, marginRight: 6 }} />}
        </React.Fragment>
      ))}
    </div>
  );
};

import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const customers = [
  { name: "Sarah Johnson", company: "Johnson Remodels", value: "$8,400", tag: "Quote", tagColor: "#f59e0b" },
  { name: "Mike Rivera", company: "Rivera Properties", value: "$3,200", tag: "Overdue", tagColor: "#ef4444" },
  { name: "Lisa Chen", company: "Chen Dental Group", value: "$15,000", tag: "Won", tagColor: "#22c55e" },
  { name: "Tom Bradley", company: "Bradley Auto", value: "$5,800", tag: "New Lead", tagColor: "#3b82f6" },
  { name: "Maria Santos", company: "Santos Retail", value: "$2,100", tag: "In Progress", tagColor: "#8b5cf6" },
];

const pipeline = [
  { stage: "New Leads", count: 4, value: "$14,200", color: "#3b82f6", pct: 35 },
  { stage: "Quoted", count: 6, value: "$28,500", color: "#8b5cf6", pct: 60 },
  { stage: "In Work", count: 3, value: "$11,800", color: "#f59e0b", pct: 28 },
  { stage: "Collecting", count: 4, value: "$12,500", color: "#22c55e", pct: 30 },
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
          <p style={{ fontSize: 16, color: "#8b5cf6", fontWeight: 600, margin: "0 0 12px", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "3px" }}>CRM & Pipeline</p>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "system-ui, sans-serif" }}>Every relationship, every deal</h2>
        </div>
        <div style={{ opacity: browserSpring, transform: `scale(${0.85 + browserSpring * 0.15}) translateY(${(1 - browserSpring) * 30}px)`, width: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid #1e293b", boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
          <div style={{ background: "#111827", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #1e293b" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
            <div style={{ flex: 1, background: "#1e293b", borderRadius: 6, padding: "4px 12px", marginLeft: 8 }}>
              <span style={{ fontSize: 12, color: "#475569", fontFamily: "monospace" }}>frontierops.vercel.app/crm</span>
            </div>
          </div>
          <div style={{ background: "#0f172a", display: "flex", gap: 0, padding: 24 }}>
            <div style={{ flex: 1, marginRight: 24 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", margin: "0 0 14px", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>Pipeline Overview</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pipeline.map((stage, i) => {
                  const stageSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, delay: 25 + i * 10 });
                  return (
                    <div key={stage.stage} style={{ opacity: stageSpring, transform: `translateX(${(1 - stageSpring) * -16}px)` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: "#94a3b8", fontFamily: "system-ui, sans-serif" }}>{stage.stage}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: stage.color, fontFamily: "system-ui, sans-serif" }}>{stage.value}</span>
                      </div>
                      <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${stage.pct}%`, background: stage.color, borderRadius: 3, opacity: 0.8 }} />
                      </div>
                      <span style={{ fontSize: 11, color: "#475569", fontFamily: "system-ui, sans-serif" }}>{stage.count} records</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ flex: 2 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", margin: "0 0 14px", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>Recent Relationships</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {customers.map((c, i) => {
                  const rowSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, delay: 30 + i * 8 });
                  return (
                    <div key={c.name} style={{ opacity: rowSpring, transform: `translateX(${(1 - rowSpring) * 20}px)`, display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#111827", borderRadius: 8, border: "1px solid #1e293b" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e3a5f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#3b82f6", fontFamily: "system-ui, sans-serif", flexShrink: 0 }}>
                        {c.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", margin: 0, fontFamily: "system-ui, sans-serif" }}>{c.name}</p>
                        <p style={{ fontSize: 11, color: "#475569", margin: 0, fontFamily: "system-ui, sans-serif" }}>{c.company}</p>
                      </div>
                      <span style={{ fontSize: 11, background: `${c.tagColor}22`, color: c.tagColor, padding: "2px 8px", borderRadius: 4, fontFamily: "system-ui, sans-serif", fontWeight: 600 }}>{c.tag}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", fontFamily: "system-ui, sans-serif" }}>{c.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

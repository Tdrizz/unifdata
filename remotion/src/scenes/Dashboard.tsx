import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [24, 0], { extrapolateRight: "clamp" });
  const browserSpring = spring({ frame, fps, config: { damping: 16, stiffness: 60 }, delay: 15 });

  return (
    <AbsoluteFill style={{ background: "#0a0f1e" }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px", gap: 44 }}>
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, textAlign: "center" }}>
          <p style={{ fontSize: 16, color: "#3b82f6", fontWeight: 600, margin: "0 0 12px", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "3px" }}>Today's brief</p>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "system-ui, sans-serif" }}>Your operating command center</h2>
        </div>
        <div style={{ opacity: browserSpring, transform: `scale(${0.85 + browserSpring * 0.15}) translateY(${(1 - browserSpring) * 30}px)`, width: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid #1e293b", boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)" }}>
          <div style={{ background: "#111827", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #1e293b" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
            <div style={{ flex: 1, background: "#1e293b", borderRadius: 6, padding: "4px 12px", marginLeft: 8 }}>
              <span style={{ fontSize: 12, color: "#475569", fontFamily: "monospace" }}>frontierops.vercel.app/workspace</span>
            </div>
          </div>
          <div style={{ background: "#0f172a", display: "flex", minHeight: 380 }}>
            <Sidebar />
            <div style={{ flex: 1, padding: 28 }}>
              <WorkspaceContent frame={frame} fps={fps} />
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Sidebar: React.FC = () => {
  const navItems = [
    { label: "Today", icon: "☀️", active: true },
    { label: "CRM", icon: "📊" },
    { label: "Customers", icon: "👥" },
    { label: "Opportunities", icon: "🎯" },
    { label: "Jobs", icon: "🔧" },
    { label: "Revenue", icon: "💰" },
    { label: "Follow-ups", icon: "⚡" },
    { label: "Imports", icon: "📥" },
    { label: "AI Assistant", icon: "🤖" },
  ];
  return (
    <div style={{ width: 190, background: "#080e1a", borderRight: "1px solid #1e293b", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>🏗️</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6", fontFamily: "system-ui, sans-serif" }}>Acme Plumbing</span>
      </div>
      {navItems.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: item.active ? "#1e3a5f" : "transparent" }}>
          <span style={{ fontSize: 14 }}>{item.icon}</span>
          <span style={{ fontSize: 13, color: item.active ? "#93c5fd" : "#475569", fontFamily: "system-ui, sans-serif", fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const WorkspaceContent: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const statSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, delay: 25 });
  const briefOpacity = interpolate(frame, [55, 80], [0, 1], { extrapolateRight: "clamp" });
  const stats = [
    { label: "Active Pipeline", value: "$48,200", sub: "11 open opportunities", color: "#3b82f6" },
    { label: "Unpaid Revenue", value: "$12,500", sub: "4 awaiting payment", color: "#f59e0b" },
    { label: "Open Follow-ups", value: "7", sub: "3 overdue today", color: "#ec4899" },
  ];
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", fontFamily: "system-ui, sans-serif" }}>Good morning, Tyler ☀️</h3>
        <p style={{ fontSize: 13, color: "#475569", margin: 0, fontFamily: "system-ui, sans-serif" }}>Tuesday, May 12 · Acme Plumbing Co.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
        {stats.map((stat) => (
          <div key={stat.label} style={{ opacity: statSpring, transform: `translateY(${(1 - statSpring) * 12}px)`, background: "#111827", border: `1px solid ${stat.color}33`, borderRadius: 10, padding: "14px 16px", borderTop: `2px solid ${stat.color}` }}>
            <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 4px", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>{stat.label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: stat.color, margin: "0 0 2px", fontFamily: "system-ui, sans-serif" }}>{stat.value}</p>
            <p style={{ fontSize: 11, color: "#475569", margin: 0, fontFamily: "system-ui, sans-serif" }}>{stat.sub}</p>
          </div>
        ))}
      </div>
      <div style={{ opacity: briefOpacity, background: "#0c1929", border: "1px solid #1e3a5f", borderRadius: 10, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 14 }}>🤖</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#3b82f6", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "1px" }}>AI Operating Brief</span>
        </div>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 8px", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>Your pipeline is healthy with 11 open opportunities totaling $48,200. Johnson Bathroom Remodel ($8,400) is your largest open quote — follow up soon.</p>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>3 follow-ups are overdue. Rivera Kitchen needs a callback today. $12,500 in completed work is waiting on payment.</p>
      </div>
    </div>
  );
};

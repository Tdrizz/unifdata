import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const C = {
  bg: "#f5f7fb", surface: "#ffffff", border: "#e2e8f0", ink: "#0f172a",
  muted: "#64748b", subtle: "#94a3b8", accent: "#2563eb", accentSoft: "#eff6ff",
  nav: "#0f172a", emerald: "#10b981", amber: "#f59e0b", red: "#ef4444",
};

export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [24, 0], { extrapolateRight: "clamp" });
  const browserSpring = spring({ frame, fps, config: { damping: 16, stiffness: 60 }, delay: 15 });

  return (
    <AbsoluteFill style={{ background: "#0a0f1e" }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px", gap: 40 }}>
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, textAlign: "center" }}>
          <p style={{ fontSize: 16, color: C.accent, fontWeight: 600, margin: "0 0 12px", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "3px" }}>Today&apos;s brief</p>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "system-ui, sans-serif" }}>Your operating command center</h2>
        </div>
        <div style={{ opacity: browserSpring, transform: `scale(${0.88 + browserSpring * 0.12}) translateY(${(1 - browserSpring) * 24}px)`, width: "100%", borderRadius: 14, overflow: "hidden", border: "1px solid #334155", boxShadow: "0 32px 64px rgba(0,0,0,0.7)" }}>
          <BrowserChrome url="frontierops.business/workspace" />
          <div style={{ background: C.bg, display: "flex", minHeight: 400 }}>
            <RealSidebar active="home" />
            <div style={{ flex: 1, padding: "24px 28px", overflow: "hidden" }}><WorkspaceContent frame={frame} fps={fps} /></div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const BrowserChrome: React.FC<{ url: string }> = ({ url }) => (
  <div style={{ background: "#1e293b", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #334155" }}>
    <div style={{ display: "flex", gap: 6 }}>
      <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#ef4444" }} />
      <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#f59e0b" }} />
      <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#22c55e" }} />
    </div>
    <div style={{ flex: 1, background: "#0f172a", borderRadius: 6, padding: "4px 12px", marginLeft: 8, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>🔒</span>
      <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>{url}</span>
    </div>
  </div>
);

export const RealSidebar: React.FC<{ active: string }> = ({ active }) => {
  const sections = [
    { label: "MAIN", items: [
      { id: "home", label: "Home", desc: "What needs attention" },
      { id: "pipeline", label: "Pipeline", desc: "Open opportunities" },
      { id: "insights", label: "Insights", desc: "Trends and data quality" },
    ]},
    { label: "WORKSPACE", items: [
      { id: "customers", label: "Customers", desc: "Contact records" },
      { id: "leads", label: "Leads", desc: "Potential business" },
      { id: "jobs", label: "Jobs", desc: "Active jobs" },
      { id: "sales", label: "Sales", desc: "Sales and collections" },
      { id: "follow-ups", label: "Follow-ups", desc: "Next steps" },
    ]},
    { label: "TOOLS", items: [
      { id: "imports", label: "Import Data", desc: "CSV and Google Sheets" },
      { id: "ai", label: "AI Advisor", desc: "Business summary" },
    ]},
  ];
  return (
    <div style={{ width: 220, background: "#0f172a", padding: "18px 12px", display: "flex", flexDirection: "column", gap: 0, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 12px", marginBottom: 20 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#2563eb" />
          <rect x="5" y="8" width="18" height="3" rx="1.5" fill="white" opacity="0.9" />
          <rect x="5" y="13" width="13" height="3" rx="1.5" fill="white" opacity="0.7" />
          <rect x="5" y="18" width="8" height="3" rx="1.5" fill="white" opacity="0.5" />
        </svg>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0, fontFamily: "system-ui, sans-serif" }}>Acme Plumbing</p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", margin: 0, fontFamily: "system-ui, sans-serif" }}>Field Service</p>
        </div>
      </div>
      {sections.map((section) => (
        <div key={section.label} style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 4px 12px", fontFamily: "system-ui, sans-serif" }}>{section.label}</p>
          {section.items.map((item) => (
            <div key={item.id} style={{ display: "flex", flexDirection: "column", padding: "7px 12px", borderRadius: 12, background: item.id === active ? "#2563eb" : "transparent", marginBottom: 1 }}>
              <span style={{ fontSize: 13, fontWeight: item.id === active ? 600 : 400, color: item.id === active ? "#fff" : "rgba(255,255,255,0.7)", fontFamily: "system-ui, sans-serif" }}>{item.label}</span>
              <span style={{ fontSize: 10, color: item.id === active ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)", fontFamily: "system-ui, sans-serif" }}>{item.desc}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const WorkspaceContent: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const statSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, delay: 22 });
  const sectionsOpacity = interpolate(frame, [55, 80], [0, 1], { extrapolateRight: "clamp" });
  const stats = [
    { label: "Priority items", value: "7", helper: "Follow-ups and payments due", accent: C.red },
    { label: "Pipeline value", value: "$48,200", helper: "11 open opportunities", accent: C.accent },
    { label: "Active jobs", value: "5", helper: "3 awaiting payment", accent: C.amber },
    { label: "Revenue needed", value: "$12,500", helper: "4 unpaid records", accent: C.emerald },
  ];
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: C.subtle, fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 2px" }}>Tuesday, May 13</p>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: C.ink, margin: "0 0 4px", fontFamily: "system-ui, sans-serif" }}>Good morning, Tyler</h2>
        <p style={{ fontSize: 13, color: C.muted, margin: 0, fontFamily: "system-ui, sans-serif" }}>Here’s what needs your attention today at Acme Plumbing Co.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
        {stats.map((stat) => (
          <div key={stat.label} style={{ opacity: statSpring, transform: `translateY(${(1 - statSpring) * 10}px)`, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "14px 16px", position: "relative", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: stat.accent, borderRadius: "20px 0 0 20px" }} />
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 4px", fontFamily: "system-ui, sans-serif", fontWeight: 500, paddingLeft: 4 }}>{stat.label}</p>
            <p style={{ fontSize: 26, fontWeight: 600, color: C.ink, margin: "0 0 2px", fontFamily: "system-ui, sans-serif", paddingLeft: 4 }}>{stat.value}</p>
            <p style={{ fontSize: 11, color: C.subtle, margin: 0, fontFamily: "system-ui, sans-serif", paddingLeft: 4 }}>{stat.helper}</p>
          </div>
        ))}
      </div>
      <div style={{ opacity: sectionsOpacity, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ borderBottom: "1px solid #f1f5f9", padding: "12px 16px" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: 0, fontFamily: "system-ui, sans-serif" }}>Priority queue</p>
            <p style={{ fontSize: 11, color: C.muted, margin: 0, fontFamily: "system-ui, sans-serif" }}>Items needing action now</p>
          </div>
          {[
            { label: "Rivera Kitchen · Callback overdue", badge: "Follow-up", badgeColor: C.red },
            { label: "Johnson Remodel · $8,400 unpaid", badge: "Payment", badgeColor: C.amber },
            { label: "Chen Dental · Quote not responded", badge: "Follow-up", badgeColor: C.red },
          ].map((item, i) => (
            <div key={i} style={{ padding: "10px 16px", borderBottom: i < 2 ? "1px solid #f8fafc" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 12, color: C.ink, margin: 0, fontFamily: "system-ui, sans-serif", fontWeight: 500 }}>{item.label}</p>
              <span style={{ fontSize: 10, fontWeight: 600, color: item.badgeColor, background: `${item.badgeColor}14`, border: `1px solid ${item.badgeColor}33`, borderRadius: 100, padding: "2px 8px", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>{item.badge}</span>
            </div>
          ))}
        </div>
        <div style={{ background: C.accentSoft, border: "1px solid #bfdbfe", borderRadius: 20, overflow: "hidden" }}>
          <div style={{ borderBottom: "1px solid #bfdbfe", padding: "12px 16px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13 }}>✨</span>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.accent, margin: 0, fontFamily: "system-ui, sans-serif" }}>AI Advisor</p>
            <span style={{ fontSize: 10, color: "#93c5fd", fontFamily: "system-ui, sans-serif", marginLeft: "auto" }}>just now</span>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <p style={{ fontSize: 12, color: "#1e40af", margin: "0 0 8px", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>Pipeline is healthy at $48K across 11 opportunities. Johnson Bathroom Remodel is your largest open quote at $8,400 — follow up today.</p>
            <p style={{ fontSize: 12, color: "#1e40af", margin: 0, fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>$12,500 in completed work is awaiting payment. Rivera Kitchen is 8 days overdue.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

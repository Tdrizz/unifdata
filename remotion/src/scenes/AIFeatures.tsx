import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const chatMessages = [
  { role: "user", text: "Which customers haven't paid yet?" },
  { role: "ai", text: "You have 4 unpaid revenue records totaling $12,500. The largest is Rivera Properties ($4,800) from a completed kitchen job on Apr 28. Johnson Remodels owes $3,200 — their invoice is 12 days past due." },
  { role: "user", text: "Who should I follow up with today?" },
  { role: "ai", text: "3 follow-ups are overdue: Mike Rivera (callback from last week), Chen Dental (quote sent 10 days ago — no response), and Bradley Auto (service estimate pending approval)." },
];

export const AIFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [24, 0], { extrapolateRight: "clamp" });
  const browserSpring = spring({ frame, fps, config: { damping: 16, stiffness: 60 }, delay: 15 });

  return (
    <AbsoluteFill style={{ background: "#0a0f1e" }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px", gap: 40 }}>
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, textAlign: "center" }}>
          <p style={{ fontSize: 16, color: "#8b5cf6", fontWeight: 600, margin: "0 0 12px", fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "3px" }}>AI-powered</p>
          <h2 style={{ fontSize: 48, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "system-ui, sans-serif" }}>AI that knows your business</h2>
        </div>
        <div style={{ opacity: browserSpring, transform: `scale(${0.85 + browserSpring * 0.15}) translateY(${(1 - browserSpring) * 30}px)`, width: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid #1e293b", boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
          <div style={{ background: "#111827", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #1e293b" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
            <div style={{ flex: 1, background: "#1e293b", borderRadius: 6, padding: "4px 12px", marginLeft: 8 }}>
              <span style={{ fontSize: 12, color: "#475569", fontFamily: "monospace" }}>frontierops.vercel.app/ai-assistant</span>
            </div>
          </div>
          <div style={{ background: "#0f172a", display: "flex", minHeight: 360 }}>
            <div style={{ width: 320, borderRight: "1px solid #1e293b", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 16 }}>✨</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa", fontFamily: "system-ui, sans-serif" }}>Operating Brief</span>
              </div>
              <BriefContent frame={frame} />
            </div>
            <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 16 }}>💬</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", fontFamily: "system-ui, sans-serif" }}>Ask about your workspace</span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                {chatMessages.map((msg, i) => {
                  const msgSpring = spring({ frame, fps, config: { damping: 14, stiffness: 70 }, delay: 30 + i * 16 });
                  return (
                    <div key={i} style={{ opacity: msgSpring, transform: `translateY(${(1 - msgSpring) * 10}px)`, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: msg.role === "user" ? "#1d4ed8" : "#1e293b", border: msg.role === "ai" ? "1px solid #334155" : "none" }}>
                        <p style={{ fontSize: 13, color: "#e2e8f0", margin: 0, fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <div style={{ flex: 1, background: "#111827", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px" }}>
                  <span style={{ fontSize: 13, color: "#475569", fontFamily: "system-ui, sans-serif" }}>Ask a question about your business...</span>
                </div>
                <div style={{ width: 40, height: 40, background: "#7c3aed", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 16 }}>↑</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const BriefContent: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame, [25, 55], [0, 1], { extrapolateRight: "clamp" });
  const highlights = [
    { icon: "📊", text: "Pipeline healthy — $48K active" },
    { icon: "⚠️", text: "$12.5K unpaid, 4 records" },
    { icon: "🔔", text: "3 overdue follow-ups" },
    { icon: "🎯", text: "Johnson quote needs attention" },
  ];
  return (
    <div style={{ opacity }}>
      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>Generated by Gemini · Updated just now</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {highlights.map((h, i) => {
          const itemOpacity = interpolate(frame, [30 + i * 8, 50 + i * 8], [0, 1], { extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ opacity: itemOpacity, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 14 }}>{h.icon}</span>
              <span style={{ fontSize: 13, color: "#94a3b8", fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>{h.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

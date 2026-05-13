import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const tools = [
  { label: "Spreadsheets", icon: "📊", color: "#22c55e" },
  { label: "Email threads", icon: "✉️", color: "#f59e0b" },
  { label: "Sticky notes", icon: "📝", color: "#f97316" },
  { label: "Group texts", icon: "💬", color: "#06b6d4" },
  { label: "Paper invoices", icon: "🧾", color: "#8b5cf6" },
  { label: "Memory", icon: "🧠", color: "#ec4899" },
];

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [30, 0], { extrapolateRight: "clamp" });
  const chaosOpacity = interpolate(frame, [25, 50], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#0a0f1e" }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 120px", gap: 60 }}>
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, textAlign: "center" }}>
          <p style={{ fontSize: 18, color: "#3b82f6", fontWeight: 600, margin: "0 0 16px", fontFamily: "system-ui, -apple-system, sans-serif", textTransform: "uppercase", letterSpacing: "3px" }}>The problem</p>
          <h2 style={{ fontSize: 56, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", lineHeight: 1.1 }}>
            Your business data is <span style={{ color: "#f87171" }}>everywhere</span>
          </h2>
        </div>
        <div style={{ opacity: chaosOpacity, display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", maxWidth: 800 }}>
          {tools.map((tool, i) => {
            const cardSpring = spring({ frame, fps, config: { damping: 14, stiffness: 70 }, delay: 30 + i * 8 });
            const rotation = [-8, 5, -4, 7, -6, 3][i];
            return (
              <div key={tool.label} style={{ opacity: cardSpring, transform: `scale(${cardSpring}) rotate(${rotation * (1 - cardSpring)}deg)`, background: "#1e293b", border: `1px solid ${tool.color}33`, borderRadius: 12, padding: "16px 24px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{tool.icon}</span>
                <span style={{ fontSize: 18, color: "#94a3b8", fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 500 }}>{tool.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" }) }}>
          <p style={{ fontSize: 22, color: "#64748b", margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", textAlign: "center" }}>
            FrontierOps brings it all into one clean workspace
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

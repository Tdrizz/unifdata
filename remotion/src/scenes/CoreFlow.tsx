import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const steps = [
  { label: "Relationships", sub: "Clients · Patients · Accounts", icon: "👥", color: "#3b82f6" },
  { label: "Opportunities", sub: "Quotes · Proposals · Deals", icon: "🎯", color: "#8b5cf6" },
  { label: "Work", sub: "Jobs · Projects · Visits", icon: "🔧", color: "#f59e0b" },
  { label: "Revenue", sub: "Payments · Invoices · Sales", icon: "💰", color: "#22c55e" },
  { label: "Actions", sub: "Follow-ups · Reminders", icon: "⚡", color: "#ec4899" },
];

export const CoreFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [24, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#0a0f1e" }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px", gap: 64 }}>
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, textAlign: "center" }}>
          <p style={{ fontSize: 16, color: "#3b82f6", fontWeight: 600, margin: "0 0 12px", fontFamily: "system-ui, -apple-system, sans-serif", textTransform: "uppercase", letterSpacing: "3px" }}>The core model</p>
          <h2 style={{ fontSize: 52, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>One connected business flow</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%", justifyContent: "center" }}>
          {steps.map((step, i) => {
            const cardDelay = 20 + i * 14;
            const cardSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, delay: cardDelay });
            const arrowOpacity = i < steps.length - 1 ? interpolate(frame, [cardDelay + 14, cardDelay + 24], [0, 1], { extrapolateRight: "clamp" }) : 0;
            return (
              <React.Fragment key={step.label}>
                <div style={{ opacity: cardSpring, transform: `scale(${cardSpring}) translateY(${(1 - cardSpring) * 20}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flex: 1, maxWidth: 200 }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${step.color}22`, border: `2px solid ${step.color}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>{step.icon}</div>
                  <div style={{ background: "#111827", border: `1px solid ${step.color}44`, borderRadius: 14, padding: "16px 20px", textAlign: "center", width: "100%" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: step.color, fontFamily: "system-ui, -apple-system, sans-serif", marginBottom: 4 }}>{step.label}</div>
                    <div style={{ fontSize: 12, color: "#64748b", fontFamily: "system-ui, -apple-system, sans-serif", lineHeight: 1.5 }}>{step.sub}</div>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ opacity: arrowOpacity, display: "flex", alignItems: "center", padding: "0 8px", marginTop: -30 }}>
                    <svg width="32" height="24" viewBox="0 0 32 24">
                      <path d="M0 12 H26 M20 6 L28 12 L20 18" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ opacity: interpolate(frame, [80, 110], [0, 1], { extrapolateRight: "clamp" }) }}>
          <p style={{ fontSize: 18, color: "#475569", margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", textAlign: "center" }}>
            Accepted opportunities automatically create work and expected revenue records
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

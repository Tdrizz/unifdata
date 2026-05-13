import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const industries = [
  { name: "Field Service", icon: "🔧", color: "#f59e0b", steps: ["Clients", "Quotes", "Service Visits", "Payments", "Client Actions"] },
  { name: "Healthcare", icon: "🏥", color: "#22c55e", steps: ["Patients", "Treatment Plans", "Appointments", "Collections", "Patient Actions"] },
  { name: "Professional Services", icon: "💼", color: "#8b5cf6", steps: ["Clients", "Proposals", "Projects", "Invoices", "Client Actions"] },
  { name: "Insurance", icon: "🛡️", color: "#3b82f6", steps: ["Clients", "Policy Opportunities", "Policy Tasks", "Commissions", "Renewal Actions"] },
];

export const IndustryAware: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [24, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#0a0f1e" }}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 80px", gap: 52 }}>
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, textAlign: "center" }}>
          <p style={{ fontSize: 16, color: "#22c55e", fontWeight: 600, margin: "0 0 12px", fontFamily: "system-ui, -apple-system, sans-serif", textTransform: "uppercase", letterSpacing: "3px" }}>Industry-aware</p>
          <h2 style={{ fontSize: 52, fontWeight: 800, color: "#f1f5f9", margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>Speaks your business language</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, width: "100%" }}>
          {industries.map((industry, i) => {
            const cardSpring = spring({ frame, fps, config: { damping: 14, stiffness: 70 }, delay: 18 + i * 12 });
            return (
              <div key={industry.name} style={{ opacity: cardSpring, transform: `scale(${cardSpring}) translateY(${(1 - cardSpring) * 16}px)`, background: "#111827", border: `1px solid ${industry.color}33`, borderRadius: 16, padding: "24px 28px", borderLeft: `3px solid ${industry.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  <span style={{ fontSize: 26 }}>{industry.icon}</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: industry.color, fontFamily: "system-ui, -apple-system, sans-serif" }}>{industry.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {industry.steps.map((step, si) => (
                    <React.Fragment key={step}>
                      <span style={{ fontSize: 13, color: "#94a3b8", fontFamily: "system-ui, -apple-system, sans-serif", fontWeight: 500, background: "#1e293b", borderRadius: 6, padding: "3px 8px" }}>{step}</span>
                      {si < industry.steps.length - 1 && <span style={{ color: "#334155", fontSize: 12 }}>→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ opacity: interpolate(frame, [75, 100], [0, 1], { extrapolateRight: "clamp" }) }}>
          <p style={{ fontSize: 18, color: "#475569", margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", textAlign: "center" }}>Same powerful system — terminology that fits your world</p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

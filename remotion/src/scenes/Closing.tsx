import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const features = [
  "Pipeline & relationships",
  "Smart data imports",
  "AI operating brief",
  "Industry-aware workspace",
  "Opportunity lifecycle sync",
  "Data quality hub",
];

export const Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 }, delay: 5 });
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" });
  const taglineY = interpolate(frame, [20, 45], [16, 0], { extrapolateRight: "clamp" });
  const featuresOpacity = interpolate(frame, [35, 60], [0, 1], { extrapolateRight: "clamp" });
  const ctaSpring = spring({ frame, fps, config: { damping: 14, stiffness: 70 }, delay: 55 });
  const glowOpacity = interpolate(frame, [0, 80], [0, 0.8], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#0a0f1e" }}>
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.14) 0%, rgba(139,92,246,0.08) 40%, transparent 70%)", opacity: glowOpacity }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36, padding: "0 120px" }}>
        <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})`, display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="56" height="56" viewBox="0 0 72 72" fill="none">
            <rect width="72" height="72" rx="16" fill="#1e40af" />
            <rect x="14" y="20" width="44" height="6" rx="3" fill="#93c5fd" />
            <rect x="14" y="33" width="32" height="6" rx="3" fill="#60a5fa" />
            <rect x="14" y="46" width="20" height="6" rx="3" fill="#3b82f6" />
            <circle cx="54" cy="52" r="8" fill="#22c55e" />
            <path d="M50 52l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 60, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-2px", fontFamily: "system-ui, sans-serif" }}>Frontier<span style={{ color: "#3b82f6" }}>Ops</span></span>
        </div>
        <div style={{ opacity: taglineOpacity, transform: `translateY(${taglineY}px)`, textAlign: "center" }}>
          <p style={{ fontSize: 28, color: "#94a3b8", margin: 0, fontFamily: "system-ui, sans-serif", fontWeight: 400 }}>One workspace. Every part of your business.</p>
        </div>
        <div style={{ opacity: featuresOpacity, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 700 }}>
          {features.map((f, i) => {
            const pillOpacity = interpolate(frame, [40 + i * 5, 58 + i * 5], [0, 1], { extrapolateRight: "clamp" });
            return (
              <div key={f} style={{ opacity: pillOpacity, background: "#111827", border: "1px solid #334155", borderRadius: 100, padding: "8px 18px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
                <span style={{ fontSize: 14, color: "#94a3b8", fontFamily: "system-ui, sans-serif" }}>{f}</span>
              </div>
            );
          })}
        </div>
        <div style={{ opacity: ctaSpring, transform: `scale(${0.9 + ctaSpring * 0.1})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)", borderRadius: 14, padding: "18px 48px", boxShadow: "0 8px 32px rgba(59,130,246,0.3)" }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "system-ui, sans-serif" }}>frontierops.vercel.app</span>
          </div>
          <p style={{ fontSize: 16, color: "#475569", margin: 0, fontFamily: "system-ui, sans-serif" }}>Live product — sign up free</p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 }, delay: 10 });
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" });
  const taglineY = interpolate(frame, [40, 70], [20, 0], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [65, 90], [0, 1], { extrapolateRight: "clamp" });
  const glowOpacity = interpolate(frame, [0, 60], [0, 0.6], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#0a0f1e" }}>
      <DotGrid />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)", opacity: glowOpacity }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})`, display: "flex", alignItems: "center", gap: 20 }}>
          <LogoMark />
          <span style={{ fontSize: 80, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-2px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
            Frontier<span style={{ color: "#3b82f6" }}>Ops</span>
          </span>
        </div>
        <div style={{ opacity: taglineOpacity, transform: `translateY(${taglineY}px)`, textAlign: "center" }}>
          <p style={{ fontSize: 28, color: "#94a3b8", fontWeight: 400, margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", letterSpacing: "0.5px" }}>
            Industry-aware business operating system
          </p>
        </div>
        <div style={{ opacity: subtitleOpacity }}>
          <p style={{ fontSize: 18, color: "#64748b", margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", textAlign: "center" }}>
            For local companies that mean business
          </p>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, background: "linear-gradient(transparent, #0a0f1e)" }} />
    </AbsoluteFill>
  );
};

const LogoMark: React.FC = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
    <rect width="72" height="72" rx="16" fill="#1e40af" />
    <rect x="14" y="20" width="44" height="6" rx="3" fill="#93c5fd" />
    <rect x="14" y="33" width="32" height="6" rx="3" fill="#60a5fa" />
    <rect x="14" y="46" width="20" height="6" rx="3" fill="#3b82f6" />
    <circle cx="54" cy="52" r="8" fill="#22c55e" />
    <path d="M50 52l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DotGrid: React.FC = () => {
  const dots = [];
  const cols = 24;
  const rows = 14;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <div key={`${r}-${c}`} style={{ position: "absolute", left: `${(c / cols) * 100}%`, top: `${(r / rows) * 100}%`, width: 2, height: 2, borderRadius: "50%", background: "#1e293b" }} />
      );
    }
  }
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>{dots}</div>;
};

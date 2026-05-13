import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const SceneFadeWrapper: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
}> = ({ children, durationInFrames, fadeInFrames = 12, fadeOutFrames = 18 }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame,
    [0, fadeInFrames, durationInFrames - fadeOutFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};

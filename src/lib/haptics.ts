type HapticStyle = "light" | "medium" | "heavy" | "success" | "error" | "warning";

const patterns: Record<HapticStyle, number | number[]> = {
  light:   8,
  medium:  15,
  heavy:   28,
  success: [10, 50, 10],
  error:   [50, 30, 50, 30, 50],
  warning: [30, 20, 30],
};

export function haptic(style: HapticStyle = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate(patterns[style]);
}

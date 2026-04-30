import type { ReactNode } from "react";

export function PageFrame({
  children,
  maxWidth = "wide",
}: {
  children: ReactNode;
  maxWidth?: "default" | "wide" | "full";
}) {
  const widthClass =
    maxWidth === "full"
      ? "max-w-none"
      : maxWidth === "wide"
        ? "max-w-[1440px]"
        : "max-w-7xl";

  return <div className={`mx-auto w-full ${widthClass}`}>{children}</div>;
}

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  padding?: number;
  radius?: "sm" | "md" | "lg";
  raised?: boolean;
  interactive?: boolean;
};

export function Card({
  className,
  padding = 16,
  radius = "md",
  raised,
  interactive,
  style,
  children,
  ...rest
}: Props) {
  return (
    <div
      {...rest}
      className={cn(
        "bg-ud-surface border border-ud",
        radius === "sm" && "rounded-[10px]",
        radius === "md" && "rounded-[12px]",
        radius === "lg" && "rounded-[14px]",
        raised ? "shadow-ud-raised" : "shadow-ud",
        interactive && "cursor-pointer transition-[border-color,box-shadow] duration-[120ms] ease-out hover:border-ud-hard",
        className,
      )}
      style={{ padding, ...style }}
    >
      {children}
    </div>
  );
}

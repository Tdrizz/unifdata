import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  padding?: number;
  radius?: "sm" | "md" | "lg";
  raised?: boolean;
  interactive?: boolean;
  flush?: boolean;
};

export function Card({ className, padding = 20, radius = "md", raised, interactive, flush, style, children, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={cn(
        "bg-ud-surface",
        !flush && "border border-ud",
        radius === "sm" && "rounded-[8px]",
        radius === "md" && "rounded-[12px]",
        radius === "lg" && "rounded-[14px]",
        raised ? "shadow-ud-raised" : "shadow-ud",
        interactive && "cursor-pointer transition-[border-color,box-shadow] duration-[120ms] hover:border-ud-hard hover:shadow-ud-raised",
        className,
      )}
      style={{ padding, ...style }}
    >
      {children}
    </div>
  );
}

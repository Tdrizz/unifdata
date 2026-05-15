import { cn } from "@/lib/utils";
import type { ElementType, ReactNode } from "react";

type Props = {
  as?: ElementType;
  size?: number;
  italic?: boolean;
  children: ReactNode;
  className?: string;
};

export function Display({ as: As = "h1", size = 36, italic, children, className }: Props) {
  return (
    <As
      className={cn(
        "font-serif font-normal leading-[1.05] tracking-[-0.015em] text-ud-ink",
        className,
      )}
      style={{ fontSize: size, fontStyle: italic ? "italic" : "normal", textWrap: "pretty" }}
    >
      {children}
    </As>
  );
}

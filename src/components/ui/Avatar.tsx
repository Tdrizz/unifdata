import { cn } from "@/lib/utils";

const BG_PALETTE = [
  "#3a3835",
  "#4a4641",
  "#5a544c",
  "#3f3b35",
  "#2f2c28",
  "#48433d",
];

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

type Props = {
  name: string;
  size?: number;
  square?: boolean;
  className?: string;
};

export function Avatar({ name, size = 36, square, className }: Props) {
  const bg = BG_PALETTE[hashName(name) % BG_PALETTE.length];
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center shrink-0 font-semibold leading-none select-none",
        square ? "rounded-[33%]" : "rounded-full",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: "#f7f6f3",
        fontSize: size * 0.38,
      }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}

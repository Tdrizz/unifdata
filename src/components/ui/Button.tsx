import type { ButtonHTMLAttributes } from "react";

const variantClasses = {
  primary:
    "rounded-2xl bg-[#1D2D3E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A8C2A]/40 disabled:opacity-50",
  accent:
    "rounded-2xl bg-[#7A8C2A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#6b7c24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A8C2A]/40 disabled:opacity-50",
  secondary:
    "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A8C2A]/40 disabled:opacity-50",
};

const sizeOverrides = {
  sm: "rounded-xl px-3 py-2 text-xs",
};

export function Button({
  variant = "primary",
  size,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeOverrides;
}) {
  const base = variantClasses[variant];
  const sizeClass = size ? sizeOverrides[size] : "";
  return (
    <button className={`${base} ${sizeClass} ${className ?? ""}`.trim()} {...props}>
      {children}
    </button>
  );
}

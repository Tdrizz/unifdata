import type { ButtonHTMLAttributes } from "react";

const variantClasses = {
  primary:
    "rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50",
  secondary:
    "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50",
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

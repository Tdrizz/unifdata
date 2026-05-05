import type { ReactNode } from "react";

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
      {hint && (
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {hint}
        </span>
      )}
    </label>
  );
}

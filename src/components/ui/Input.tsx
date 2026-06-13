import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

const base = "w-full rounded-[9px] border border-ud bg-ud-surface px-3.5 py-[10px] text-[14px] text-ud-ink outline-none transition-[box-shadow,border-color] duration-150 focus:ring-2 focus:ring-ud-accent/10 focus:border-ud-accent placeholder:text-ud-faint disabled:opacity-50 disabled:cursor-not-allowed";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "resize-none min-h-[88px]", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select className={cn(base, "cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}

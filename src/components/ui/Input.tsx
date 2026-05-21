import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-ud bg-ud-surface-sunk px-4 py-[11px] text-base text-ud-ink outline-none transition-[box-shadow,border-color] duration-150 focus:ring-2 focus:ring-ud-accent/15 focus:border-ud-accent placeholder:text-ud-faint";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} resize-none`} {...props} />;
}

export function Select({
  children,
  ...props
}: InputHTMLAttributes<HTMLSelectElement> & {
  children: React.ReactNode;
}) {
  return (
    <select className={inputClass} {...props}>
      {children}
    </select>
  );
}

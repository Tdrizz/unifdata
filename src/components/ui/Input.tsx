import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-[#7A8C2A]/40 focus:border-[#7A8C2A]";

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

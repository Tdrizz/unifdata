"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-[#1D2D3E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57] disabled:opacity-60"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

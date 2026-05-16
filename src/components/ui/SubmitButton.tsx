"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-[10px] bg-ud-accent px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

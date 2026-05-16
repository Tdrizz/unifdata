"use client";

import { useRouter, usePathname } from "next/navigation";

export function DismissError({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-start justify-between gap-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm font-medium text-red-700">{message}</p>
      <button
        onClick={() => router.replace(pathname)}
        className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700"
      >
        Dismiss
      </button>
    </div>
  );
}

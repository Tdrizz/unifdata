"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

function SearchInputInner({ placeholder = "Search…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) {
        params.set("q", next);
      } else {
        params.delete("q");
      }
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
  }

  return (
    <div className="flex items-center gap-2 rounded-[10px] bg-ud-surface-sunk border border-ud px-3 py-2 focus-within:border-ud-hard transition-colors">
      <svg className="h-4 w-4 shrink-0 text-ud-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-ud-ink outline-none placeholder:text-ud-faint"
      />
    </div>
  );
}

export function SearchInput({ placeholder }: { placeholder?: string }) {
  return (
    <Suspense fallback={null}>
      <SearchInputInner placeholder={placeholder} />
    </Suspense>
  );
}

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PaginationInner({
  count,
  pageSize,
}: {
  count: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page") ?? 1);
  const totalPages = Math.ceil(count / pageSize);

  if (totalPages <= 1) return null;

  function goTo(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.replace(`${pathname}?${params.toString()}`);
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => goTo(currentPage - 1)}
        className="rounded-[8px] border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-sunk disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => goTo(page)}
          className={
            page === currentPage
              ? "rounded-[8px] bg-ud-accent px-3 py-2 text-xs font-semibold text-white"
              : "rounded-[8px] border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-sunk"
          }
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => goTo(currentPage + 1)}
        className="rounded-[8px] border border-ud bg-ud-surface px-3 py-2 text-xs font-semibold text-ud-muted hover:bg-ud-surface-sunk disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

export function Pagination({
  count,
  pageSize,
}: {
  count: number;
  pageSize: number;
}) {
  return (
    <Suspense fallback={null}>
      <PaginationInner count={count} pageSize={pageSize} />
    </Suspense>
  );
}

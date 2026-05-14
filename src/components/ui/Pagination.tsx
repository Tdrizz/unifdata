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
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
              ? "rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
              : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          }
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => goTo(currentPage + 1)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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

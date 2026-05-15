"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#eef2f7] px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-2xl rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
          Something went wrong
        </p>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          UnifData could not load this page.
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          Try refreshing the page. If this keeps happening, go back home and
          reopen the record from there.
        </p>

        {error.digest && (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-500">
            Error reference: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Try again
          </button>

          <Link
            href="/workspace"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

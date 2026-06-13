"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#eef2f7] px-4 py-10 text-ud-ink">
      <div className="mx-auto max-w-2xl rounded-[14px] border border-ud-danger/20 bg-ud-surface p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ud-danger">
          Something went wrong
        </p>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ud-ink">
          UnifData could not load this page.
        </h1>

        <p className="mt-3 text-sm leading-7 text-ud-muted">
          Try refreshing the page. If this keeps happening, go back home and
          reopen the record from there.
        </p>

        {error.digest && (
          <p className="mt-4 rounded-[10px] border border-ud bg-ud-surface-sunk p-3 text-xs font-medium text-ud-faint">
            Error reference: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-[8px] bg-ud-accent px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Try again
          </button>

          <Link
            href="/"
            className="rounded-[8px] border border-ud bg-ud-surface px-4 py-2.5 text-[13px] font-semibold text-ud-muted hover:bg-ud-surface-sunk transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function RouteError({
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
    <main className="px-7 py-10">
      <div className="mx-auto max-w-lg rounded-[14px] border border-red-200 bg-ud-surface p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
          Something went wrong
        </p>
        <h1 className="mt-3 text-xl font-semibold text-ud-ink">
          This page could not be loaded.
        </h1>
        <p className="mt-2 text-sm text-ud-muted leading-6">
          Try refreshing. If the issue persists, go back and reopen the record.
        </p>
        {error.digest && (
          <p className="mt-4 rounded-[8px] border border-ud bg-ud-surface-sunk p-3 text-xs font-medium text-ud-faint">
            Ref: {error.digest}
          </p>
        )}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-[9px] bg-ud-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
          <Link
            href="/workspace"
            className="rounded-[9px] border border-ud bg-ud-surface px-4 py-2.5 text-sm font-medium text-ud-muted hover:bg-ud-surface-sunk"
          >
            Go to workspace
          </Link>
        </div>
      </div>
    </main>
  );
}

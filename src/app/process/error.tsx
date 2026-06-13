"use client";

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
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[14px] border border-ud bg-ud-surface p-6 shadow-ud">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ud-danger">
          Something went wrong
        </p>
        <h2 className="mt-2 text-[17px] font-semibold text-ud-ink">
          This page could not be loaded.
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-ud-muted">
          Try refreshing. If it keeps happening, go back to the workspace and reopen from there.
        </p>
        {error.digest && (
          <p className="mt-3 rounded-[8px] border border-ud bg-ud-surface-sunk px-3 py-2 text-[11px] text-ud-faint font-medium">
            Ref: {error.digest}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={reset} className="rounded-[8px] bg-ud-accent px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity">
            Try again
          </button>
          <a href="/workspace" className="rounded-[8px] border border-ud bg-ud-surface px-4 py-2.5 text-[13px] font-semibold text-ud-muted hover:bg-ud-surface-sunk transition-colors">
            Go to workspace
          </a>
        </div>
      </div>
    </div>
  );
}

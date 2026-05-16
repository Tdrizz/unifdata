import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[#eef2f7] px-4 py-10 text-ud-ink">
      <div className="mx-auto max-w-2xl rounded-[14px] border border-ud bg-ud-surface p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ud-faint">
          Not found
        </p>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ud-ink">
          This page or record could not be found.
        </h1>

        <p className="mt-3 text-sm leading-7 text-ud-muted">
          The link may be wrong, the record may have been deleted, or you may
          not have access to it.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/workspace"
            className="rounded-[10px] bg-ud-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Back to Home
          </Link>

          <Link
            href="/data-hub"
            className="rounded-[10px] border border-ud bg-ud-surface px-4 py-3 text-sm font-semibold text-ud-muted hover:bg-ud-surface-sunk"
          >
            Open Data Hub
          </Link>
        </div>
      </div>
    </main>
  );
}

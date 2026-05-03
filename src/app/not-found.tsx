import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[#eef2f7] px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Not found
        </p>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          This page or record could not be found.
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          The link may be wrong, the record may have been deleted, or you may
          not have access to it.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/workspace"
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to Home
          </Link>

          <Link
            href="/data-hub"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open Data Hub
          </Link>
        </div>
      </div>
    </main>
  );
}

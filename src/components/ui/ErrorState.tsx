import Link from "next/link";

export function ErrorState({
  title = "Something went wrong",
  description = "The app could not load this section. Try refreshing the page.",
  actionLabel = "Back to Home",
  actionHref = "/workspace",
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-3xl border border-red-100 bg-red-50 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
        Error
      </p>

      <h2 className="mt-3 text-xl font-semibold tracking-tight text-red-950">
        {title}
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-7 text-red-700">
        {description}
      </p>

      <Link
        href={actionHref}
        className="mt-5 inline-flex rounded-2xl bg-red-950 px-4 py-3 text-sm font-semibold text-white hover:bg-red-900"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

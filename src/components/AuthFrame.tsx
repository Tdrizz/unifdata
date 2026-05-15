import Link from "next/link";
import type { ReactNode } from "react";
import { ProductMark } from "@/components/ProductMark";

export function AuthFrame({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#090e1a] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
        <section className="relative hidden overflow-hidden p-10 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(148,163,184,0.2),transparent_28rem)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.15),rgba(9,14,26,1))]" />

          <div className="relative flex h-full flex-col justify-between">
            <ProductMark inverse />

            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                Business data command center
              </p>

              <h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight">
                A cleaner operating system for messy local business data.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                Organize customers, opportunities, work, revenue, follow-ups,
                imports, and AI summaries around the business sector.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              Built for businesses outgrowing spreadsheets, memory, and outdated
              tools.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <ProductMark inverse />
            </div>

            <div className="rounded-4xl border border-white/10 bg-white/7 p-8 shadow-2xl backdrop-blur">
              <Link
                href="/"
                className="text-sm font-medium text-slate-300 hover:text-white"
              >
                ← Back to home
              </Link>

              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  UnifData
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                  {title}
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {description}
                </p>
              </div>

              <div className="mt-8">{children}</div>

              {footer && <div className="mt-6">{footer}</div>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

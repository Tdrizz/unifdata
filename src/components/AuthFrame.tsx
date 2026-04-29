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
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
        <section className="relative hidden overflow-hidden p-10 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.28),transparent_28rem)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.3),rgba(15,23,42,1))]" />

          <div className="relative flex h-full flex-col justify-between">
            <ProductMark dark />

            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-200">
                Business command center
              </p>

              <h1 className="mt-5 text-5xl font-black leading-tight tracking-tight">
                One clean system for customers, jobs, sales, and follow-ups.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                FrontierOps helps local service businesses turn scattered data
                into a simple operating dashboard.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              Built for local businesses that need clarity, not more software
              clutter.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <ProductMark dark />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur">
              <Link
                href="/"
                className="text-sm font-semibold text-slate-300 hover:text-white"
              >
                ← Back to home
              </Link>

              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                  FrontierOps
                </p>

                <h1 className="mt-3 text-3xl font-black tracking-tight">
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

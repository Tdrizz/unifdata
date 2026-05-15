import Link from "next/link";
import { ProductMark } from "@/components/ProductMark";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-[#090e1a] px-6 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <Link href="/">
            <ProductMark inverse />
          </Link>

          <div className="mt-12">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Invite-only beta
            </p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight tracking-tight">
              Request access for your business data workspace.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
              UnifData is onboarding a small number of pilot companies that
              need cleaner customer, job, follow-up, and revenue operations.
            </p>
            <div className="mt-8 grid max-w-xl gap-3 text-sm text-slate-300 sm:grid-cols-3">
              {["Reviewed manually", "Clerk invite only", "Paid beta access"].map(
                (label) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    {label}
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/7 p-8 shadow-2xl backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Request access
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Tell us about the operation.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Approved leads receive a Clerk invitation and subscription link.
            </p>
          </div>

          <div className="mt-8">
            <WaitlistForm />
          </div>
        </section>
      </div>
    </main>
  );
}

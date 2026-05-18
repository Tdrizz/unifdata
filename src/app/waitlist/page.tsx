import { PublicNav } from "@/components/PublicNav";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-[#090e1a] text-white">
      <PublicNav active="waitlist" />

      <div className="mx-auto grid min-h-[calc(100vh-56px)] w-full max-w-6xl items-center gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <div className="mt-4">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Invite-only beta
            </p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight tracking-tight">
              One place for every customer, job, quote, and payment.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
              We&apos;re onboarding a small group of local service businesses.
              Approved applicants get a personal setup session and full workspace access from day one.
            </p>
            <div className="mt-8 grid max-w-xl gap-3 text-sm text-slate-300 sm:grid-cols-3">
              {["Reviewed manually", "Invite-only access", "Paid beta access"].map(
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
              Tell us about your business.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Approved applicants receive an invite link within 48 hours.
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

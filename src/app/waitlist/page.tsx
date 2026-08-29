import { PublicNav } from "@/components/PublicNav";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-ud-page text-ud-ink">
      <PublicNav active="waitlist" />

      <div className="mx-auto grid min-h-[calc(100vh-56px)] w-full max-w-6xl items-center gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <div className="mt-4">
            <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.22em] text-ud-muted">
              Invite-only beta
            </p>
            <h1 className="animate-fade-up [animation-delay:80ms] mt-4 max-w-xl text-5xl font-semibold leading-tight tracking-tight text-ud-ink">
              Your customers, jobs, and revenue — in one place.
            </h1>
            <p className="animate-fade-up [animation-delay:160ms] mt-5 max-w-xl text-base leading-8 text-ud-text">
              We&apos;re onboarding a small group of service businesses.
              Approved applicants get a personal setup session and full workspace
              access from day one.
            </p>
            <div className="animate-fade-up [animation-delay:240ms] mt-8 grid max-w-xl gap-3 text-sm text-ud-text sm:grid-cols-3">
              {["Reviewed manually", "Invite-only access", "Personal setup included"].map(
                (label) => (
                  <div
                    key={label}
                    className="rounded-[14px] border border-ud bg-ud-surface px-4 py-3"
                  >
                    {label}
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="animate-fade-up [animation-delay:120ms] rounded-[24px] border border-ud bg-ud-surface p-8 shadow-ud">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ud-muted">
              Request access
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ud-ink">
              Tell us about your business.
            </h2>
            <p className="mt-2 text-sm leading-6 text-ud-text">
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

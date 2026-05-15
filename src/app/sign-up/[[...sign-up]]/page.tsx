import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { ProductMark } from "@/components/ProductMark";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#090e1a] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col justify-center">
        <Link href="/" className="mb-10">
          <ProductMark inverse />
        </Link>

        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Invitation required
            </p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight tracking-tight">
              Create your account from a beta invite.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-slate-300">
              Public registrations should be disabled in Clerk. This screen is
              for invited pilot customers completing their account setup.
            </p>
            <Link
              href="/waitlist"
              className="mt-8 inline-flex rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Join the waitlist
            </Link>
          </section>

          <section className="flex justify-center lg:justify-end">
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              fallbackRedirectUrl="/pricing"
              appearance={{
                elements: {
                  cardBox: "shadow-2xl",
                },
              }}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

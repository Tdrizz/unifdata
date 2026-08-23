import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { PublicNav } from "@/components/PublicNav";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#090e1a] text-white">
      <PublicNav active="login" />

      <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-6xl flex-col justify-center px-6 py-10">
        {/* Form leads on every screen size, same as /sign-in — see that page
            for why: a hero block above the fold made the real form
            invisible without scrolling on mobile. */}
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="flex justify-center lg:justify-start lg:order-2">
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              fallbackRedirectUrl="/workspace"
              appearance={{
                elements: {
                  cardBox: "shadow-2xl",
                },
              }}
            />
          </section>

          <section className="mt-8 text-center lg:mt-0 lg:order-1 lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Invitation required
            </p>
            <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight lg:text-5xl">
              Create your account from a beta invite.
            </h1>
            <p className="mt-3 text-[14px] leading-6 text-slate-400 lg:mt-5 lg:max-w-lg lg:text-base lg:leading-8 lg:text-slate-300">
              Not invited yet?{" "}
              <Link href="/waitlist" className="font-semibold text-white underline underline-offset-2 hover:text-slate-200">
                Request access
              </Link>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

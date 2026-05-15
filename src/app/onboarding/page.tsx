import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { ProductMark } from "@/components/ProductMark";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentCompany = await getCurrentCompany();

  if (currentCompany) {
    redirect("/workspace");
  }

  return (
    <main className="min-h-screen bg-[#090e1a] px-6 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section>
          <Link href="/">
            <ProductMark inverse />
          </Link>

          <div className="mt-12">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Build around the business
            </p>

            <h1 className="mt-4 text-5xl font-semibold leading-tight tracking-tight">
              Choose the sector so the workspace knows what matters.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
              A medical office, contractor, home services crew, and
              professional services firm should not operate from the same
              generic workspace.
            </p>
          </div>
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/7 p-8 shadow-2xl backdrop-blur">
          <Link href="/" className="text-sm font-medium text-slate-300">
            ← Back to home
          </Link>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Company setup
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Create your workspace
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              This creates the company workspace and sets the dashboard language
              for the business.
            </p>
          </div>

          <div className="mt-8">
            <OnboardingForm />
          </div>
        </section>
      </div>
    </main>
  );
}

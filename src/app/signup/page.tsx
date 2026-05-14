import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/AuthFrame";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./SignupForm";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/workspace");

  return (
    <AuthFrame
      title="Create workspace"
      description="Start building an industry-aware CRM and data management system for a business."
      footer={
        <p className="text-center text-sm text-slate-300">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-white underline">
            Log in
          </a>
        </p>
      }
    >
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthFrame>
  );
}

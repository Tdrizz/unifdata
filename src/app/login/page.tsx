import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/AuthFrame";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/workspace");

  return (
    <AuthFrame
      title="Log in"
      description="Access your company workspace and continue organizing the business."
      footer={
        <p className="text-center text-sm text-slate-300">
          Need an account?{" "}
          <a href="/signup" className="font-semibold text-white underline">
            Create one
          </a>
        </p>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}

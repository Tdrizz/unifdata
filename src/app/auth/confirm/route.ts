import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/workspace";

  if (token_hash && type) {
    const cookieStore = await cookies();
    const successResponse = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              successResponse.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.verifyOtp({ token_hash, type });

    if (!error) {
      return successResponse;
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("The link is invalid or has expired. Request a new one.")}`,
  );
}

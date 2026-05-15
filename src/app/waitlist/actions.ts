"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const waitlistSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  company: z.string().trim().min(2, "Enter your company name.").max(160),
  email: z.email("Enter a valid email address.").max(254),
  companySize: z.string().trim().min(1, "Select a company size.").max(80),
  useCase: z.string().trim().min(20, "Share a little more detail.").max(2000),
  website: z.string().trim().max(0, "Invalid submission.").optional(),
});

export type WaitlistState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitWaitlistRequest(
  _prevState: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  const parsed = waitlistSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    companySize: formData.get("companySize"),
    useCase: formData.get("useCase"),
    website: formData.get("website"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] ??= issue.message;
    }

    return { fieldErrors };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("waitlist_requests").insert({
    name: parsed.data.name,
    company: parsed.data.company,
    email: parsed.data.email.toLowerCase(),
    company_size: parsed.data.companySize,
    use_case: parsed.data.useCase,
    status: "new",
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: true,
      };
    }

    console.error("[waitlist.submit]", error);
    return {
      error: "Your request could not be saved. Please try again.",
    };
  }

  return { ok: true };
}

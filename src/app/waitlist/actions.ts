"use server";

import { z } from "zod";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

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

  const email = parsed.data.email.toLowerCase();
  const supabase = await createClient();

  // Pre-generate ID so we don't need a SELECT RLS policy for anon users
  const id = crypto.randomUUID();

  const { error: dbError } = await supabase
    .from("waitlist_requests")
    .insert({
      id,
      name: parsed.data.name,
      company: parsed.data.company,
      email,
      company_size: parsed.data.companySize,
      use_case: parsed.data.useCase,
      status: "pending",
    });

  if (dbError) {
    if (dbError.code === "23505") return { ok: true };
    console.error("[waitlist.submit] db error", dbError);
    return { error: "Your request could not be saved. Please try again." };
  }

  // Email the owner for approval
  const resendKey = process.env.RESEND_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  if (resendKey) {
    const approveUrl = `${appUrl}/api/admin/waitlist/approve?id=${id}`;
    const resend = new Resend(resendKey);

    await resend.emails.send({
      from: "UnifData <noreply@unifdata.com>",
      to: "unifdata@gmail.com",
      subject: `New access request: ${parsed.data.name} — ${parsed.data.company}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#a09b91;">UnifData</p>
          <h2 style="margin:0 0 4px;font-size:18px;color:#171614;">New access request</h2>
          <p style="margin:0 0 20px;font-size:14px;color:#6b6760;">Review and approve to send them a sign-up invite.</p>

          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
            <tr><td style="padding:8px 0;color:#6b6760;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;color:#171614;">${parsed.data.name}</td></tr>
            <tr><td style="padding:8px 0;color:#6b6760;">Email</td><td style="padding:8px 0;color:#171614;">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#6b6760;">Company</td><td style="padding:8px 0;color:#171614;">${parsed.data.company}</td></tr>
            <tr><td style="padding:8px 0;color:#6b6760;">Size</td><td style="padding:8px 0;color:#171614;">${parsed.data.companySize}</td></tr>
          </table>

          <div style="background:#f7f6f3;border-radius:10px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#2c2a26;line-height:1.6;">${parsed.data.useCase.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>

          <a href="${approveUrl}" style="display:inline-block;background:#5C6F1A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;">
            Approve &amp; send invite →
          </a>

          <p style="margin:16px 0 0;font-size:12px;color:#a09b91;">
            Clicking approve sends them a Clerk sign-up invitation. You must be logged in to UnifData for the link to work.
          </p>
        </div>
      `,
    }).catch((err) => console.error("[waitlist.submit] resend error", err));
  }

  return { ok: true };
}

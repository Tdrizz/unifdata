import { aiRouter, AI_MODELS } from "@/lib/ai/router";
import { markdownToEmailHtml, stripMarkdown } from "@/lib/email/format";
import { isCompleteWork, isOpenFollowUp } from "@/lib/status";
import { buildVoiceBlock } from "@/lib/ai/prompts/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function sendWeeklySummary(
  orgId: string,
  ownerEmail: string,
  supabase: SupabaseClient,
): Promise<void> {
  // Fetch company to gate on Pro tier
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, tier")
    .eq("id", orgId)
    .single();

  if (!company) return;

  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    salesThisWeekResult,
    salesLastWeekResult,
    jobsCompletedResult,
    followUpsResult,
    alertsResult,
    roiResult,
  ] = await Promise.all([
    supabase
      .from("sales")
      .select("amount")
      .eq("company_id", orgId)
      .gte("created_at", startOfThisWeek.toISOString()),
    supabase
      .from("sales")
      .select("amount")
      .eq("company_id", orgId)
      .gte("created_at", startOfLastWeek.toISOString())
      .lt("created_at", startOfThisWeek.toISOString()),
    supabase
      .from("jobs")
      .select("id, status")
      .eq("company_id", orgId)
      .gte("updated_at", startOfThisWeek.toISOString()),
    supabase
      .from("follow_ups")
      .select("id, status")
      .eq("company_id", orgId)
      .gte("created_at", startOfThisWeek.toISOString()),
    supabase
      .from("agent_alerts")
      .select("title, severity")
      .eq("organization_id", orgId)
      .eq("status", "unread")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("roi_events")
      .select("amount_recovered")
      .eq("organization_id", orgId)
      .gte("created_at", startOfMonth.toISOString()),
  ]);

  const revenueThisWeek = (salesThisWeekResult.data ?? []).reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0,
  );
  const revenueLastWeek = (salesLastWeekResult.data ?? []).reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0,
  );
  // Both counts previously compared status exactly, so "Completed" never
  // matched and the weekly email always reported zero work finished.
  const jobsCompleted = (jobsCompletedResult.data ?? []).filter(
    (j) => isCompleteWork((j as { status: string | null }).status),
  ).length;
  const followUpsAdded = followUpsResult.data?.length ?? 0;
  const followUpsResolved = (followUpsResult.data ?? []).filter(
    (f) => !isOpenFollowUp(f.status),
  ).length;
  // Plain titles, not "[severity] title" -- the bracketed severity word was
  // leaking straight into the email as literal text (an email could read
  // "[critical] ..."), which is exactly the raw, alarming phrasing the voice
  // guidelines below ask the model to avoid everywhere else.
  const topAlerts = (alertsResult.data ?? [])
    .slice(0, 3)
    .map((a) => a.title)
    .join("\n");
  const roiTotal = (roiResult.data ?? []).reduce(
    (sum, r) => sum + Number(r.amount_recovered || 0),
    0,
  );

  const revDelta =
    revenueLastWeek > 0
      ? `${revenueThisWeek >= revenueLastWeek ? "+" : ""}${Math.round(((revenueThisWeek - revenueLastWeek) / revenueLastWeek) * 100)}% vs last week`
      : "no data for comparison";

  const prompt = `${buildVoiceBlock()}

Write this week's business summary email for ${company.name}.

Data this week:
- Revenue: $${Math.round(revenueThisWeek).toLocaleString()} (${revDelta})
- Jobs completed: ${jobsCompleted}
- Follow-ups added: ${followUpsAdded}, resolved: ${followUpsResolved}
${roiTotal > 0 ? `- Recovered via outreach this month: $${Math.round(roiTotal).toLocaleString()}\n` : ""}${topAlerts ? `- Open items this week:\n${topAlerts}` : ""}

Write a friendly 3-4 sentence summary covering the revenue trend and this
week's activity. You may point at one specific open item worth looking at
(name it plainly, don't invent detail beyond what's given above), but do not
tell the owner what to do about it or promise any outcome. Plain text only,
no markdown, no severity words in brackets.`;

  const response = await aiRouter.chat.completions.create({
    model: AI_MODELS.alertFormatter,
    temperature: 0.5,
    messages: [{ role: "user", content: prompt }],
  });

  const emailBody = response.choices[0]?.message?.content ?? "";
  if (!emailBody) return;

  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM_EMAIL ?? `noreply@${domain}`;

  if (!apiKey || !domain || !ownerEmail) return;

  await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      from,
      to: ownerEmail,
      subject: `Your weekly business summary — ${company.name}`,
      text: stripMarkdown(emailBody),
      html: markdownToEmailHtml(emailBody),
    }),
  });
}

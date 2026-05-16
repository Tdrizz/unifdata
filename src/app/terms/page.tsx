import type { Metadata } from "next";
import { PublicNav } from "@/components/PublicNav";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "UnifData Terms of Service — the rules governing use of the platform.",
};

const lastUpdated = "May 2, 2026";

const sections = [
  {
    title: "Agreement to Terms",
    body: "By using UnifData, you agree to these Terms of Service. If you do not agree, do not use the service.",
  },
  {
    title: "Description of Service",
    body: "UnifData is a business operations platform for organizing customer records, opportunities, work, revenue, follow-ups, imports, and AI-generated operating briefs. UnifData may include features for CSV imports, Google Sheets imports, data review, dashboards, and AI summaries.",
  },
  {
    title: "Beta and Pilot Use",
    body: "UnifData may be offered as an early-stage, beta, or pilot product. Features may change, be incomplete, or contain errors. You are responsible for reviewing imported data, AI-generated summaries, and business records before relying on them.",
  },
  {
    title: "User Responsibilities",
    body: "You are responsible for maintaining the accuracy of the data you add or import into UnifData, protecting your account access, and ensuring that your use of the service complies with applicable laws and agreements.",
  },
  {
    title: "Google Integrations",
    body: "If you connect Google Sheets or Google Drive features, you authorize UnifData to access the Google files or spreadsheets you choose to use with the service. UnifData uses that access to provide spreadsheet selection, review, and import features.",
  },
  {
    title: "AI-Generated Content",
    body: "AI-generated briefs and recommendations are provided for convenience only. They may be incomplete, outdated, or inaccurate. UnifData does not provide legal, financial, accounting, tax, medical, or professional advice. You should independently verify important information before making business decisions.",
  },
  {
    title: "Acceptable Use",
    body: "You may not use UnifData to violate laws, infringe the rights of others, upload malicious code, attempt unauthorized access, interfere with the service, or misuse connected third-party services.",
  },
  {
    title: "Third-Party Services",
    body: "UnifData may connect with third-party services such as Google Sheets, hosting providers, database providers, authentication providers, and AI providers. Your use of those services may also be governed by their own terms and policies.",
  },
  {
    title: "Availability and Changes",
    body: "UnifData may change, suspend, or discontinue features at any time. We may also update these Terms. Continued use of the service after changes means you accept the updated Terms.",
  },
  {
    title: "Limitation of Liability",
    body: 'UnifData is provided on an "as is" and "as available" basis. To the maximum extent allowed by law, UnifData is not liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, lost revenue, lost data, or business interruption.',
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-ud-page text-ud-ink">
      <PublicNav />

      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ud-faint">
            Legal
          </p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-2 text-[13px] text-ud-muted">Last updated: {lastUpdated}</p>
        </div>

        {/* Sections */}
        <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden divide-y divide-ud">
          {sections.map((section) => (
            <div key={section.title} className="px-6 py-5">
              <h2 className="text-[14.5px] font-semibold text-ud-ink">{section.title}</h2>
              <p className="mt-2 text-[13.5px] leading-7 text-ud-muted">{section.body}</p>
            </div>
          ))}

          <div className="px-6 py-5">
            <h2 className="text-[14.5px] font-semibold text-ud-ink">Contact</h2>
            <p className="mt-2 text-[13.5px] leading-7 text-ud-muted">
              Questions about these Terms can be sent to{" "}
              <a
                href="mailto:unifdata@gmail.com"
                className="font-semibold text-ud-ink underline underline-offset-2"
              >
                unifdata@gmail.com
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

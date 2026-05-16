import type { Metadata } from "next";
import Link from "next/link";
import { ProductMark } from "@/components/ProductMark";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "UnifData Privacy Policy — how we collect, use, and protect your data.",
};

const lastUpdated = "May 2, 2026";

const sections = [
  {
    title: "Overview",
    body: "UnifData is a business operations platform that helps users organize people, opportunities, work, revenue, follow-ups, imports, and AI-generated operating briefs. This Privacy Policy explains what information UnifData collects, how it is used, and how users can contact us.",
  },
  {
    title: "Information We Collect",
    body: "UnifData may collect account information such as your email address, workspace information such as business name and settings, and business records you create or import, including customers, opportunities, work records, revenue records, follow-ups, import sessions, and AI reports.",
  },
  {
    title: "Google Sheets and Google Account Data",
    body: "If you connect Google Sheets, UnifData requests permission to access the Google files or spreadsheets you choose to use with the app. UnifData uses this access to let you select spreadsheets, review rows, and import business data into your workspace. UnifData does not use Google user data for advertising and does not sell Google user data. Google data is used only to provide user-facing features in UnifData, such as spreadsheet selection, import review, and data import.",
  },
  {
    title: "AI Features",
    body: "UnifData may use AI services, including Gemini, to generate operating briefs from your workspace data. These briefs are intended to help summarize business activity, risks, priorities, and next steps. AI-generated content may be incomplete or inaccurate and should be reviewed before being relied on.",
  },
  {
    title: "How We Use Information",
    body: "We use information to provide the UnifData service, operate workspaces, import and organize business records, display dashboards, generate AI briefs, troubleshoot issues, improve the product, and maintain security.",
  },
  {
    title: "How Information Is Shared",
    body: "We do not sell user data. We may share information with service providers that help operate UnifData, such as hosting, database, authentication, and AI infrastructure providers. We may also disclose information if required by law or to protect the rights, security, or integrity of UnifData.",
  },
  {
    title: "Data Retention",
    body: "Workspace data is retained while your account or workspace is active, unless deleted by you or removed as part of maintenance, legal, or security requirements.",
  },
  {
    title: "Your Choices",
    body: "You may update or delete records inside UnifData. You may also disconnect Google access through your Google Account settings. If you need help with data access or deletion, contact us using the email below.",
  },
  {
    title: "Security",
    body: "We take reasonable steps to protect workspace data and limit access to authorized users. No online service can guarantee perfect security, so users should avoid importing unnecessary sensitive information.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-ud-page text-ud-ink">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-ud bg-ud-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/">
            <ProductMark />
          </Link>
          <Link
            href="/"
            className="rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-ud-muted hover:bg-ud-surface-sunk hover:text-ud-ink"
          >
            ← Back to home
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ud-faint">
            Legal
          </p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight">
            Privacy Policy
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
              Questions about this Privacy Policy can be sent to{" "}
              <a
                href="mailto:tittanolson@gmail.com"
                className="font-semibold text-ud-ink underline underline-offset-2"
              >
                tittanolson@gmail.com
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

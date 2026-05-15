import Link from "next/link";

const lastUpdated = "May 2, 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#eef2f7] px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-slate-950"
          >
            ← Back to UnifData
          </Link>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Privacy Policy
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            UnifData Privacy Policy
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-600">
            Last updated: {lastUpdated}
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-6 text-sm leading-7 text-slate-700">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Overview</h2>
              <p className="mt-2">
                UnifData is a business operations platform that helps users
                organize people, opportunities, work, revenue, follow-ups,
                imports, and AI-generated operating briefs. This Privacy Policy
                explains what information UnifData collects, how it is used,
                and how users can contact us.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Information We Collect
              </h2>
              <p className="mt-2">
                UnifData may collect account information such as your email
                address, workspace information such as business name and
                settings, and business records you create or import, including
                customers, opportunities, work records, revenue records,
                follow-ups, import sessions, and AI reports.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Google Sheets and Google Account Data
              </h2>
              <p className="mt-2">
                If you connect Google Sheets, UnifData requests permission to
                access the Google files or spreadsheets you choose to use with
                the app. UnifData uses this access to let you select
                spreadsheets, review rows, and import business data into your
                workspace.
              </p>
              <p className="mt-2">
                UnifData does not use Google user data for advertising and
                does not sell Google user data. Google data is used only to
                provide user-facing features in UnifData, such as spreadsheet
                selection, import review, and data import.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                AI Features
              </h2>
              <p className="mt-2">
                UnifData may use AI services, including Gemini, to generate
                operating briefs from your workspace data. These briefs are
                intended to help summarize business activity, risks, priorities,
                and next steps. AI-generated content may be incomplete or
                inaccurate and should be reviewed before being relied on.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                How We Use Information
              </h2>
              <p className="mt-2">
                We use information to provide the UnifData service, operate
                workspaces, import and organize business records, display
                dashboards, generate AI briefs, troubleshoot issues, improve the
                product, and maintain security.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                How Information Is Shared
              </h2>
              <p className="mt-2">
                We do not sell user data. We may share information with service
                providers that help operate UnifData, such as hosting,
                database, authentication, and AI infrastructure providers. We
                may also disclose information if required by law or to protect
                the rights, security, or integrity of UnifData.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Data Retention
              </h2>
              <p className="mt-2">
                Workspace data is retained while your account or workspace is
                active, unless deleted by you or removed as part of maintenance,
                legal, or security requirements.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Your Choices
              </h2>
              <p className="mt-2">
                You may update or delete records inside UnifData. You may
                also disconnect Google access through your Google Account
                settings. If you need help with data access or deletion, contact
                us using the email below.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">Security</h2>
              <p className="mt-2">
                We take reasonable steps to protect workspace data and limit
                access to authorized users. No online service can guarantee
                perfect security, so users should avoid importing unnecessary
                sensitive information.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">Contact</h2>
              <p className="mt-2">
                Questions about this Privacy Policy can be sent to{" "}
                <a
                  href="mailto:tittanolson@gmail.com"
                  className="font-semibold text-slate-950 underline"
                >
                  tittanolson@gmail.com
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

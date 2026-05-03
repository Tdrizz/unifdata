import Link from "next/link";

const lastUpdated = "May 2, 2026";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#eef2f7] px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-600 hover:text-slate-950"
          >
            ← Back to FrontierOps
          </Link>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Terms of Service
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            FrontierOps Terms of Service
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-600">
            Last updated: {lastUpdated}
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-6 text-sm leading-7 text-slate-700">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Agreement to Terms
              </h2>
              <p className="mt-2">
                By using FrontierOps, you agree to these Terms of Service. If
                you do not agree, do not use the service.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Description of Service
              </h2>
              <p className="mt-2">
                FrontierOps is a business operations platform for organizing
                customer records, opportunities, work, revenue, follow-ups,
                imports, and AI-generated operating briefs. FrontierOps may
                include features for CSV imports, Google Sheets imports, data
                review, dashboards, and AI summaries.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Beta and Pilot Use
              </h2>
              <p className="mt-2">
                FrontierOps may be offered as an early-stage, beta, or pilot
                product. Features may change, be incomplete, or contain errors.
                You are responsible for reviewing imported data, AI-generated
                summaries, and business records before relying on them.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                User Responsibilities
              </h2>
              <p className="mt-2">
                You are responsible for maintaining the accuracy of the data you
                add or import into FrontierOps, protecting your account access,
                and ensuring that your use of the service complies with
                applicable laws and agreements.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Google Integrations
              </h2>
              <p className="mt-2">
                If you connect Google Sheets or Google Drive features, you
                authorize FrontierOps to access the Google files or spreadsheets
                you choose to use with the service. FrontierOps uses that access
                to provide spreadsheet selection, review, and import features.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                AI-Generated Content
              </h2>
              <p className="mt-2">
                AI-generated briefs and recommendations are provided for
                convenience only. They may be incomplete, outdated, or
                inaccurate. FrontierOps does not provide legal, financial,
                accounting, tax, medical, or professional advice. You should
                independently verify important information before making
                business decisions.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Acceptable Use
              </h2>
              <p className="mt-2">
                You may not use FrontierOps to violate laws, infringe the rights
                of others, upload malicious code, attempt unauthorized access,
                interfere with the service, or misuse connected third-party
                services.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Third-Party Services
              </h2>
              <p className="mt-2">
                FrontierOps may connect with third-party services such as Google
                Sheets, hosting providers, database providers, authentication
                providers, and AI providers. Your use of those services may also
                be governed by their own terms and policies.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Availability and Changes
              </h2>
              <p className="mt-2">
                FrontierOps may change, suspend, or discontinue features at any
                time. We may also update these Terms. Continued use of the
                service after changes means you accept the updated Terms.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Limitation of Liability
              </h2>
              <p className="mt-2">
                FrontierOps is provided on an “as is” and “as available” basis.
                To the maximum extent allowed by law, FrontierOps is not liable
                for indirect, incidental, special, consequential, or punitive
                damages, or for lost profits, lost revenue, lost data, or
                business interruption.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">Contact</h2>
              <p className="mt-2">
                Questions about these Terms can be sent to{" "}
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

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getDraftApprovalRates,
  getZodFailureRates,
  getNightlyRunSuccessRate,
  getToolCallSuccessRates,
  getRoiByOrg,
  getRetrievalFallbackRate,
  getAvgInboxItemsPerOrg,
} from "@/lib/admin/ai-metrics";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function pct(n: number): string {
  return `${n}%`;
}

function approvalColor(rate: number): string {
  if (rate >= 60) return "text-green-600";
  if (rate >= 40) return "text-amber-600";
  return "text-red-600";
}

function nightlyColor(rate: number): string {
  if (rate >= 95) return "text-green-600";
  if (rate >= 90) return "text-amber-600";
  return "text-red-600";
}

function zodColor(failures: number): string {
  if (failures === 0) return "text-green-600";
  if (failures <= 2) return "text-amber-600";
  return "text-red-600";
}

function toolColor(rate: number): string {
  if (rate >= 95) return "text-green-600";
  if (rate >= 90) return "text-amber-600";
  return "text-red-600";
}

function retrievalColor(fallbackRate: number): string {
  if (fallbackRate < 10) return "text-green-600";
  if (fallbackRate <= 25) return "text-amber-600";
  return "text-red-600";
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-[rgba(0,0,0,0.07)] bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[rgba(0,0,0,0.06)]">
        <p className="text-[12px] font-bold uppercase tracking-[0.10em] text-ud-accent">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[rgba(0,0,0,0.04)] last:border-0">
      <span className="text-[13px] text-gray-600">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${color ?? "text-gray-900"}`}>{value}</span>
    </div>
  );
}

export default async function AiHealthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email !== process.env.ADMIN_EMAIL) {
    redirect("/");
  }

  const [
    draftRates,
    zodFailures,
    nightlyStats,
    toolCalls,
    roiByOrg,
    retrieval,
    inboxStats,
  ] = await Promise.all([
    getDraftApprovalRates(7),
    getZodFailureRates(7),
    getNightlyRunSuccessRate(14),
    getToolCallSuccessRates(7),
    getRoiByOrg(30),
    getRetrievalFallbackRate(7),
    getAvgInboxItemsPerOrg(7),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-ud-accent mb-1">Internal</p>
          <h1 className="text-[26px] font-semibold text-gray-900 tracking-tight">AI Health Dashboard</h1>
          <p className="text-[13px] text-gray-500 mt-1">Last 7 days (nightly runs: 14 days, ROI: 30 days)</p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Draft Approval Rates */}
          <Card title="Draft Approval Rates">
            {draftRates.length === 0 ? (
              <p className="text-[13px] text-gray-400">No drafts in this period.</p>
            ) : (
              draftRates.map((row) => (
                <MetricRow
                  key={row.draft_type}
                  label={`${row.draft_type} (${row.total} total)`}
                  value={pct(row.approvalRate)}
                  color={approvalColor(row.approvalRate)}
                />
              ))
            )}
          </Card>

          {/* Nightly Runs */}
          <Card title="Nightly Runs (14 days)">
            <MetricRow
              label="Success rate"
              value={pct(nightlyStats.successRate)}
              color={nightlyColor(nightlyStats.successRate)}
            />
            <MetricRow label="Total runs" value={String(nightlyStats.total)} />
            <MetricRow label="Successful" value={String(nightlyStats.success)} color="text-green-600" />
            <MetricRow label="Failed" value={String(nightlyStats.failed)} color={nightlyStats.failed > 0 ? "text-red-600" : "text-gray-900"} />
          </Card>

          {/* Zod Failures */}
          <Card title="Zod Failures by Agent">
            {zodFailures.length === 0 ? (
              <p className="text-[13px] text-green-600 font-medium">No failures this period.</p>
            ) : (
              zodFailures.map((row) => (
                <MetricRow
                  key={row.agent_name}
                  label={row.agent_name}
                  value={`${row.failures} / ${row.total} runs`}
                  color={zodColor(row.failures)}
                />
              ))
            )}
          </Card>

          {/* Tool Call Success */}
          <Card title="Tool Call Success Rates">
            {toolCalls.length === 0 ? (
              <p className="text-[13px] text-gray-400">No tool calls logged this period.</p>
            ) : (
              toolCalls.map((row) => (
                <MetricRow
                  key={row.tool}
                  label={`${row.tool} (${row.total} calls)`}
                  value={pct(row.successRate)}
                  color={toolColor(row.successRate)}
                />
              ))
            )}
          </Card>

          {/* Semantic Retrieval */}
          <Card title="Semantic Retrieval">
            {retrieval.semanticCount + retrieval.fallbackCount === 0 ? (
              <p className="text-[13px] text-gray-400">No retrieval data logged yet.</p>
            ) : (
              <>
                <MetricRow
                  label="Semantic path"
                  value={pct(100 - retrieval.fallbackRate)}
                  color="text-green-600"
                />
                <MetricRow
                  label="Fallback path"
                  value={pct(retrieval.fallbackRate)}
                  color={retrievalColor(retrieval.fallbackRate)}
                />
                <MetricRow label="Semantic requests" value={String(retrieval.semanticCount)} />
                <MetricRow label="Fallback requests" value={String(retrieval.fallbackCount)} />
              </>
            )}
          </Card>

          {/* Inbox Productivity */}
          <Card title="Inbox Productivity (7 days)">
            <MetricRow label="Total inbox items" value={String(inboxStats.totalItems)} />
            <MetricRow label="Active orgs" value={String(inboxStats.totalOrgs)} />
            <MetricRow label="Avg items per org" value={String(inboxStats.avgItemsPerOrg)} />
          </Card>

          {/* ROI by Org */}
          <div className="col-span-2">
            <Card title="ROI This Month by Org">
              {roiByOrg.length === 0 ? (
                <p className="text-[13px] text-gray-400">No ROI events recorded this month.</p>
              ) : (
                roiByOrg.map((row) => (
                  <MetricRow
                    key={row.organization_id}
                    label={row.organization_id}
                    value={formatCurrency(row.total)}
                    color="text-green-600"
                  />
                ))
              )}
            </Card>
          </div>
        </div>

        <p className="mt-8 text-[11px] text-gray-400 text-center">
          Thresholds: Approval &gt;60% green · Nightly success &gt;95% green · Zod 0 failures green · Tool success &gt;95% green · Retrieval fallback &lt;10% green
        </p>
      </div>
    </div>
  );
}

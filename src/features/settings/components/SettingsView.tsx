import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SyncNowButton } from "@/components/ui/SyncNowButton";
import { formatTimestampDate } from "@/lib/date-format";
import { businessSectorOptions } from "@/lib/industry-profiles";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { LogoutButton } from "@/components/LogoutButton";
import { updateWorkspaceAction, removeMember } from "../actions";
import type { SettingsIntegration } from "../types";
import { InviteMemberForm } from "./InviteMemberForm";
import { ApiKeyManager } from "./ApiKeyManager";

interface Company {
  id: string;
  name: string;
  business_sector: string;
}

interface User {
  email: string;
}

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

interface SettingsViewProps {
  company: Company;
  user: User;
  integrations: SettingsIntegration[];
  geminiEnabled: boolean;
  members: Array<{ user_id: string; role: string; profiles: { full_name: string | null } | null }>;
  currentUserRole: string | null;
  apiKeys: ApiKey[];
}

function titleCase(value: string | null) {
  const text = String(value || "")
    .replace(/_/g, " ")
    .trim();

  if (!text) {
    return "";
  }

  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusTone(status: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("active") || normalized.includes("connected")) {
    return "success" as const;
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("expired")
  ) {
    return "danger" as const;
  }

  if (normalized.includes("pending")) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function getStatusLabel(status: string | null) {
  return titleCase(status) || "Not connected";
}

export function SettingsView({
  company,
  user,
  integrations,
  geminiEnabled,
  members,
  currentUserRole,
  apiKeys,
}: SettingsViewProps) {
  const googleIntegration = integrations.find((integration) =>
    String(integration.provider || "")
      .toLowerCase()
      .includes("google"),
  );

  const quickbooksIntegration = integrations.find((i) => i.provider === "quickbooks");
  const squareIntegration = integrations.find((i) => i.provider === "square");
  const hubspotIntegration = integrations.find((i) => i.provider === "hubspot");
  const jobberIntegration = integrations.find((i) => i.provider === "jobber");

  return (
    <div className="space-y-5 px-4 md:px-6 pt-5 pb-8">
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage the business profile, connected tools, and account access."
      />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
        {/* Business profile card */}
        <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
          <div className="px-[22px] py-[18px] border-b border-ud">
            <p className="text-[14.5px] font-semibold text-ud-ink">Business profile</p>
            <p className="mt-0.5 text-[13px] text-ud-muted">Basic details used across the workspace.</p>
          </div>
          <div className="p-[22px]">
            <form action={updateWorkspaceAction} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-[13px] font-medium text-ud-ink">
                  Business name
                  <input
                    name="name"
                    required
                    defaultValue={company.name || ""}
                    placeholder="UnifData Demo Company"
                    className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-[14px] py-[10px] text-[13.5px] text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/20"
                  />
                </label>

                <label className="block text-[13px] font-medium text-ud-ink">
                  Business sector
                  <select
                    name="business_sector"
                    defaultValue={company.business_sector || "general"}
                    className="mt-2 w-full rounded-[10px] border border-ud bg-ud-surface px-[14px] py-[10px] text-[13.5px] text-ud-ink outline-none focus:ring-2 focus:ring-ud-accent/20"
                  >
                    {businessSectorOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-[12px] leading-5 text-ud-muted">
                    Controls the language and priorities shown in dashboards.
                  </span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-[10px] bg-ud-ink px-[16px] py-[9px] text-[13.5px] font-semibold text-white hover:opacity-90"
                >
                  Save settings
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-5">
          {/* Account card */}
          <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
            <div className="px-[22px] py-[18px] border-b border-ud">
              <p className="text-[14.5px] font-semibold text-ud-ink">Account</p>
              <p className="mt-0.5 text-[13px] text-ud-muted">Signed-in user and current workspace.</p>
            </div>
            <div className="p-[22px] space-y-3">
              <div className="rounded-[10px] border border-ud bg-ud-surface-soft p-[14px]">
                <p className="text-[12px] font-medium text-ud-muted">Signed in</p>
                <p className="mt-1 text-[14px] font-semibold text-ud-ink">
                  {user.email || "No email available"}
                </p>
              </div>

              <div className="rounded-[10px] border border-ud bg-ud-surface-soft p-[14px]">
                <p className="text-[12px] font-medium text-ud-muted">Workspace</p>
                <p className="mt-1 text-[14px] font-semibold text-ud-ink">{company.name}</p>
              </div>

              <LogoutButton />
            </div>
          </div>

          {/* Change password card */}
          <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
            <div className="px-[22px] py-[18px] border-b border-ud">
              <p className="text-[14.5px] font-semibold text-ud-ink">Change password</p>
              <p className="mt-0.5 text-[13px] text-ud-muted">Set a new password for your account.</p>
            </div>
            <div>
              <ChangePasswordForm />
            </div>
          </div>

          {/* Launch tools card */}
          <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
            <div className="px-[22px] py-[18px] border-b border-ud">
              <p className="text-[14.5px] font-semibold text-ud-ink">Launch tools</p>
              <p className="mt-0.5 text-[13px] text-ud-muted">Status for the tools UnifData uses.</p>
            </div>
            <div className="p-[22px] space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-[10px] border border-ud bg-ud-surface-soft p-[14px]">
                <div>
                  <p className="text-[14px] font-semibold text-ud-ink">Gemini AI</p>
                  <p className="mt-1 text-[13px] text-ud-muted">Generates operating briefs.</p>
                </div>
                <StatusBadge tone={geminiEnabled ? "success" : "warning"}>
                  {geminiEnabled ? "Enabled" : "Missing key"}
                </StatusBadge>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-[10px] border border-ud bg-ud-surface-soft p-[14px]">
                <div>
                  <p className="text-[14px] font-semibold text-ud-ink">Google Sheets</p>
                  <p className="mt-1 text-[13px] text-ud-muted">Used for spreadsheet imports.</p>
                </div>
                <StatusBadge
                  tone={
                    googleIntegration
                      ? getStatusTone(googleIntegration.status)
                      : "neutral"
                  }
                >
                  {googleIntegration
                    ? getStatusLabel(googleIntegration.status)
                    : "Not connected"}
                </StatusBadge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data integrations card */}
      <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
        <div className="px-[22px] py-[18px] border-b border-ud">
          <p className="text-[14.5px] font-semibold text-ud-ink">Data integrations</p>
          <p className="mt-0.5 text-[13px] text-ud-muted">
            Connect your business tools. Once connected, UnifData syncs their data automatically every day — no CSV exports needed.
          </p>
        </div>
        <div className="divide-y divide-ud">
          {[
            {
              provider: "quickbooks",
              label: "QuickBooks",
              description: "Syncs customers, invoices, and estimates.",
              integration: quickbooksIntegration,
              startHref: "/api/integrations/quickbooks/start",
            },
            {
              provider: "square",
              label: "Square",
              description: "Syncs customers and payments.",
              integration: squareIntegration,
              startHref: "/api/integrations/square/start",
            },
            {
              provider: "hubspot",
              label: "HubSpot",
              description: "Syncs contacts and deals.",
              integration: hubspotIntegration,
              startHref: "/api/integrations/hubspot/start",
            },
            {
              provider: "jobber",
              label: "Jobber",
              description: "Syncs clients, jobs, quotes, and invoices.",
              integration: jobberIntegration,
              startHref: "/api/integrations/jobber/start",
            },
          ].map(({ provider, label, description, integration, startHref }) => (
            <div
              key={label}
              className="flex flex-wrap items-center justify-between gap-4 p-[18px]"
            >
              <div>
                <p className="text-[14px] font-semibold text-ud-ink">{label}</p>
                <p className="mt-0.5 text-[13px] text-ud-muted">{description}</p>
                {integration?.provider_account_name && (
                  <p className="mt-1 text-[12px] text-ud-faint">
                    {integration.provider_account_name}
                    {integration.created_at && (
                      <> · Connected {formatTimestampDate(integration.created_at)}</>
                    )}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {integration ? (
                  <>
                    <StatusBadge tone={getStatusTone(integration.status)}>
                      {getStatusLabel(integration.status)}
                    </StatusBadge>
                    {integration.status === "active" && (
                      <SyncNowButton provider={provider} label={label} />
                    )}
                    <Link
                      href={startHref}
                      className="rounded-[10px] border border-ud bg-ud-surface px-[16px] py-[9px] text-[13.5px] font-semibold text-ud-ink hover:bg-ud-surface-soft"
                    >
                      Reconnect
                    </Link>
                  </>
                ) : (
                  <Link
                    href={startHref}
                    className="rounded-[10px] bg-ud-ink px-[16px] py-[9px] text-[13.5px] font-semibold text-white hover:opacity-90"
                  >
                    Connect {label}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team members card */}
      <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
        <div className="px-[22px] py-[18px] border-b border-ud">
          <p className="text-[14.5px] font-semibold text-ud-ink">Team Members</p>
          <p className="mt-0.5 text-[13px] text-ud-muted">Manage who has access to this workspace.</p>
        </div>
        <div className="p-[22px]">
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between rounded-[10px] border border-ud bg-ud-surface p-[12px]"
              >
                <div>
                  <p className="text-[14px] font-semibold text-ud-ink">
                    {member.profiles?.full_name ?? "Team member"}
                  </p>
                  <p className="text-[12px] text-ud-muted capitalize">{member.role}</p>
                </div>
                {currentUserRole === "owner" && (
                  <form action={removeMember.bind(null, member.user_id)}>
                    <button
                      type="submit"
                      className="text-[12.5px] font-medium text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
          {currentUserRole === "owner" && <InviteMemberForm />}
        </div>
      </div>

      {/* API Keys card */}
      <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
        <div className="px-[22px] py-[18px] border-b border-ud">
          <p className="text-[14.5px] font-semibold text-ud-ink">API Keys</p>
          <p className="mt-0.5 text-[13px] text-ud-muted">
            Use these keys to send leads programmatically via the{" "}
            <code className="rounded px-1 py-0.5 bg-ud-surface-soft text-[12px]">POST /api/leads/ingest</code>{" "}
            endpoint. Each key is scoped to this workspace.
          </p>
        </div>
        <div className="p-[22px]">
          <ApiKeyManager
            apiKeys={apiKeys}
            canManage={currentUserRole === "owner" || currentUserRole === "admin"}
          />
        </div>
      </div>
    </div>
  );
}

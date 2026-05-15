import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SyncNowButton } from "@/components/ui/SyncNowButton";
import { formatTimestampDate } from "@/lib/date-format";
import { businessSectorOptions } from "@/lib/industry-profiles";
import { ColorPickers } from "@/components/settings/ColorPickers";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { updateWorkspaceAction, signOutAction, removeMember } from "../actions";
import type { SettingsIntegration } from "../types";
import { InviteMemberForm } from "./InviteMemberForm";

interface Company {
  id: string;
  name: string;
  business_sector: string;
  brand_color: string;
  accent_color: string;
}

interface User {
  email: string;
}

interface SettingsViewProps {
  company: Company;
  user: User;
  integrations: SettingsIntegration[];
  geminiEnabled: boolean;
  members: Array<{ user_id: string; role: string; profiles: { full_name: string | null } | null }>;
  currentUserRole: string | null;
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

function getProviderLabel(provider: string | null) {
  const labels: Record<string, string> = {
    google_sheets: "Google Sheets",
    google: "Google",
    quickbooks: "QuickBooks",
    square: "Square",
    hubspot: "HubSpot",
    jobber: "Jobber",
  };

  return labels[provider || ""] || titleCase(provider) || "Integration";
}

export function SettingsView({
  company,
  user,
  integrations,
  geminiEnabled,
  members,
  currentUserRole,
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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage the business profile, appearance, connected tools, and account access."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/workspace"
              className="rounded-2xl bg-[#1D2D3E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57]"
            >
              Home
            </Link>

            <Link
              href="/imports"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Import data
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr] items-start">
        <SectionCard
          title="Business profile"
          description="Basic details used across the workspace."
        >
          <form action={updateWorkspaceAction} className="space-y-5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Business name
                <input
                  name="name"
                  required
                  defaultValue={company.name || ""}
                  placeholder="UnifData Demo Company"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Business sector
                <select
                  name="business_sector"
                  defaultValue={company.business_sector || "general"}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {businessSectorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  Controls the language and priorities shown in dashboards.
                </span>
              </label>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4">
                <p className="font-semibold text-slate-950">Appearance</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Pick the colors used for workspace branding and accents.
                </p>
              </div>
              <ColorPickers
                defaultBrandColor={company.brand_color}
                defaultAccentColor={company.accent_color}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-2xl bg-[#1D2D3E] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57]"
              >
                Save settings
              </button>
            </div>
          </form>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard
            title="Account"
            description="Signed-in user and current workspace."
          >
            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">
                  Signed in
                </p>
                <p className="mt-1 font-semibold text-slate-950">
                  {user.email || "No email available"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">
                  Workspace
                </p>
                <p className="mt-1 font-semibold text-slate-950">
                  {company.name}
                </p>
              </div>

              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </form>
            </div>
          </SectionCard>

          <SectionCard
            title="Change password"
            description="Set a new password for your account."
          >
            <ChangePasswordForm />
          </SectionCard>

          <SectionCard
            title="Launch tools"
            description="Status for the tools UnifData uses."
          >
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-semibold text-slate-950">Gemini AI</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Generates operating briefs.
                  </p>
                </div>

                <StatusBadge tone={geminiEnabled ? "success" : "warning"}>
                  {geminiEnabled ? "Enabled" : "Missing key"}
                </StatusBadge>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-semibold text-slate-950">
                    Google Sheets
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Used for spreadsheet imports.
                  </p>
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
          </SectionCard>
        </div>
      </section>

      <SectionCard
        title="Data integrations"
        description="Connect your business tools. Once connected, UnifData syncs their data automatically every day — no CSV exports needed."
      >
        <div className="divide-y divide-slate-100">
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
              className="flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div>
                <p className="font-semibold text-slate-950">{label}</p>
                <p className="mt-0.5 text-sm text-slate-500">{description}</p>
                {integration?.provider_account_name && (
                  <p className="mt-1 text-xs text-slate-400">
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
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Reconnect
                    </Link>
                  </>
                ) : (
                  <Link
                    href={startHref}
                    className="rounded-2xl bg-[#1D2D3E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57]"
                  >
                    Connect {label}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Connected tools"
        description="All external services connected to this workspace."
      >
        {integrations.length === 0 ? (
          <EmptyState
            title="No connected tools"
            description="Connect a data provider above to get started."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {integrations.map((integration) => (
              <article
                key={integration.id}
                className="grid gap-3 p-4 md:grid-cols-[1fr_180px_130px] md:items-center"
              >
                <div>
                  <p className="font-semibold text-slate-950">
                    {getProviderLabel(integration.provider)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {integration.provider_account_name || "Connected account"}
                  </p>
                </div>

                <p className="text-sm font-medium text-slate-500">
                  Added {formatTimestampDate(integration.created_at)}
                </p>

                <div className="md:text-right">
                  <StatusBadge tone={getStatusTone(integration.status)}>
                    {getStatusLabel(integration.status)}
                  </StatusBadge>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Team Members"
        description="Manage who has access to this workspace."
      >
        <div className="p-5">
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div>
                  <p className="font-semibold text-slate-950">{member.profiles?.full_name ?? "Team member"}</p>
                  <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                </div>
                {currentUserRole === "owner" && (
                  <form action={removeMember.bind(null, member.user_id)}>
                    <button type="submit" className="text-xs text-red-500 hover:underline">Remove</button>
                  </form>
                )}
              </div>
            ))}
          </div>
          {currentUserRole === "owner" && <InviteMemberForm />}
        </div>
      </SectionCard>
    </div>
  );
}

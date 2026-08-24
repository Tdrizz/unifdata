import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { businessSectorOptions as businessSectorGroups } from "@/lib/industry-profiles";
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

interface MobileSettingsViewProps {
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

export function MobileSettingsView({
  company,
  user,
  integrations,
  geminiEnabled,
  members,
  currentUserRole,
}: MobileSettingsViewProps) {
  const googleIntegration = integrations.find((integration) =>
    String(integration.provider || "")
      .toLowerCase()
      .includes("google"),
  );

  return (
    <div className="px-4 pt-[22px] pb-8 space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage the business profile, appearance, connected tools, and account access."
      />

      {/* Business profile card */}
      <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
        <div className="px-[22px] py-[18px] border-b border-ud">
          <p className="text-[14.5px] font-semibold text-ud-ink">Business profile</p>
          <p className="mt-0.5 text-[13px] text-ud-muted">Basic details used across the workspace.</p>
        </div>
        <div className="p-[22px]">
          <form action={updateWorkspaceAction} className="space-y-5">
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
                {businessSectorGroups.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.options.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="mt-2 block text-[12px] leading-5 text-ud-muted">
                Controls the language and priorities shown in dashboards.
              </span>
            </label>

            <div className="rounded-[14px] border border-ud bg-ud-surface-soft p-[18px]">
              <div className="mb-4">
                <p className="text-[14px] font-semibold text-ud-ink">Appearance</p>
                <p className="mt-1 text-[13px] leading-6 text-ud-muted">
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
                className="rounded-[10px] bg-ud-ink px-[16px] py-[9px] text-[13.5px] font-semibold text-white hover:opacity-90"
              >
                Save settings
              </button>
            </div>
          </form>
        </div>
      </div>

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

          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-[10px] border border-ud bg-ud-surface px-[16px] py-[9px] text-[13.5px] font-semibold text-ud-ink hover:bg-ud-surface-soft"
            >
              Sign out
            </button>
          </form>
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
              <p className="text-[14px] font-semibold text-ud-ink">Data matching</p>
              <p className="mt-1 text-[13px] text-ud-muted">Powers customer-matching embeddings for the Data Keeper.</p>
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

      {/* Integrations moved to /imports */}
      <div className="rounded-[14px] border border-ud bg-ud-surface shadow-ud overflow-hidden">
        <div className="px-[22px] py-[18px]">
          <p className="text-[14.5px] font-semibold text-ud-ink">Integrations</p>
          <p className="mt-0.5 mb-3 text-[13px] text-ud-muted">Connect your existing tools to sync data automatically.</p>
          <Link href="/imports" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ud-accent hover:opacity-80 transition-opacity">
            Manage integrations in Imports →
          </Link>
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
                      className="text-[12.5px] font-medium text-ud-danger hover:underline"
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
    </div>
  );
}

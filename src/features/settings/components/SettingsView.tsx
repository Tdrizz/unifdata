import Link from "next/link";
import { SyncNowButton } from "@/components/ui/SyncNowButton";
import { formatTimestampDate } from "@/lib/date-format";
import { businessSectorOptions } from "@/lib/industry-profiles";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { LogoutButton } from "@/components/LogoutButton";
import { updateWorkspaceAction, removeMember, disconnectIntegrationAction } from "../actions";
import type { SettingsIntegration } from "../types";
import { InviteMemberForm } from "./InviteMemberForm";
import { NotificationToggles } from "./NotificationToggles";
import { DeleteWorkspaceModal } from "./DeleteWorkspaceModal";

interface Company {
  id: string;
  name: string;
  business_sector: string;
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
  notificationPrefs: Record<string, boolean>;
}

function isConnected(integration: SettingsIntegration | undefined) {
  const s = String(integration?.status || "").toLowerCase();
  return s.includes("active") || s.includes("connected");
}

export function SettingsView({
  company,
  user,
  integrations,
  geminiEnabled: _geminiEnabled,
  members,
  currentUserRole,
  notificationPrefs,
}: SettingsViewProps) {
  const googleIntegration = integrations.find((i) =>
    String(i.provider || "").toLowerCase().includes("google"),
  );
  const quickbooksIntegration = integrations.find((i) => i.provider === "quickbooks");
  const squareIntegration = integrations.find((i) => i.provider === "square");
  const hubspotIntegration = integrations.find((i) => i.provider === "hubspot");
  const jobberIntegration = integrations.find((i) => i.provider === "jobber");

  const integrationRows = [
    {
      provider: "quickbooks",
      label: "QuickBooks",
      desc: "Sync customers, invoices, and revenue",
      integration: quickbooksIntegration,
      startHref: "/api/integrations/quickbooks/start",
    },
    {
      provider: "google_sheets",
      label: "Google Sheets",
      desc: "Used for bulk imports via the Imports page",
      integration: googleIntegration,
      startHref: "/api/integrations/google/start",
    },
    {
      provider: "jobber",
      label: "Jobber",
      desc: "Sync jobs, quotes, and field schedules",
      integration: jobberIntegration,
      startHref: "/api/integrations/jobber/start",
    },
    {
      provider: "hubspot",
      label: "HubSpot",
      desc: "Sync contacts and deal activity",
      integration: hubspotIntegration,
      startHref: "/api/integrations/hubspot/start",
    },
    {
      provider: "square",
      label: "Square",
      desc: "Import payments, invoices, and customer records",
      integration: squareIntegration,
      startHref: "/api/integrations/square/start",
    },
  ];

  return (
    <div style={{ padding: "28px 28px 40px" }}>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Settings</div>
          <div className="page-title">Workspace settings</div>
          <div className="page-desc">Manage your business profile, integrations, and account.</div>
        </div>
      </div>

      <div style={{ maxWidth: "680px" }}>

        {/* ── Business profile ── */}
        <div className="setting-section">
          <div className="setting-section-head">
            <div className="setting-section-title">Business profile</div>
            <div className="setting-section-desc">Details used across the workspace and AI outputs.</div>
          </div>
          <form action={updateWorkspaceAction}>
            <div className="form-row" style={{ marginBottom: "16px" }}>
              <div>
                <label className="form-label">Business name</label>
                <input
                  name="name"
                  required
                  defaultValue={company.name || ""}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Industry</label>
                <select
                  name="business_sector"
                  defaultValue={company.business_sector || "general"}
                  className="form-input"
                >
                  {businessSectorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="reset" className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-ink">Save changes</button>
            </div>
          </form>
        </div>

        {/* ── Account ── */}
        <div className="setting-section">
          <div className="setting-section-head">
            <div className="setting-section-title">Account</div>
            <div className="setting-section-desc">Your personal sign-in details.</div>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-row-label">Signed in as</div>
              <div className="setting-row-desc">{user.email}</div>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-row-label">Workspace</div>
              <div className="setting-row-desc">{company.name}</div>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-row-label">Password</div>
              <div className="setting-row-desc">Change your account password</div>
            </div>
          </div>
          <div style={{ paddingTop: "8px" }}>
            <ChangePasswordForm />
          </div>
          <div style={{ paddingTop: "12px" }}>
            <LogoutButton />
          </div>
        </div>

        {/* ── Notifications ── */}
        <div className="setting-section">
          <div className="setting-section-head">
            <div className="setting-section-title">Notifications</div>
            <div className="setting-section-desc">Control what triggers an in-app notification.</div>
          </div>
          <NotificationToggles initialPrefs={notificationPrefs} />
        </div>

        {/* ── Integrations ── */}
        <div className="setting-section">
          <div className="setting-section-head">
            <div className="setting-section-title">Integrations</div>
            <div className="setting-section-desc">Connect external tools to sync data automatically.</div>
          </div>
          {integrationRows.map(({ provider, label, desc, integration, startHref }) => {
            const connected = isConnected(integration);
            return (
              <div key={label} className="setting-row">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div className="setting-row-label">{label}</div>
                    {connected && (
                      <span className="badge badge-success">Connected</span>
                    )}
                  </div>
                  <div className="setting-row-desc">{desc}</div>
                  {integration?.provider_account_name && (
                    <div style={{ fontSize: "11px", color: "var(--faint)", marginTop: "2px" }}>
                      {integration.provider_account_name}
                      {integration.created_at && (
                        <> · Connected {formatTimestampDate(integration.created_at)}</>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  {connected && integration?.status === "active" && (
                    <SyncNowButton provider={provider} label={label} />
                  )}
                  {connected ? (
                    <form action={disconnectIntegrationAction.bind(null, provider)}>
                      <button type="submit" className="btn btn-ghost btn-sm">Disconnect</button>
                    </form>
                  ) : (
                    <Link href={startHref} className="btn btn-ghost btn-sm">Connect</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Team members ── */}
        <div className="setting-section">
          <div className="setting-section-head">
            <div className="setting-section-title">Team members</div>
            <div className="setting-section-desc">Manage who has access to this workspace.</div>
          </div>
          {members.map((member) => (
            <div key={member.user_id} className="setting-row">
              <div>
                <div className="setting-row-label">{member.profiles?.full_name ?? "Team member"}</div>
                <div className="setting-row-desc" style={{ textTransform: "capitalize" }}>{member.role}</div>
              </div>
              {currentUserRole === "owner" && (
                <form action={removeMember.bind(null, member.user_id)}>
                  <button type="submit" className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}>
                    Remove
                  </button>
                </form>
              )}
            </div>
          ))}
          {currentUserRole === "owner" && (
            <div style={{ paddingTop: "12px" }}>
              <InviteMemberForm />
            </div>
          )}
        </div>

        {/* ── Danger zone ── */}
        <div className="setting-section" style={{ paddingBottom: "8px" }}>
          <div className="setting-section-head">
            <div className="setting-section-title" style={{ color: "#dc2626" }}>Danger zone</div>
            <div className="setting-section-desc">Irreversible actions. Proceed with care.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", border: "1px solid #fecaca", borderRadius: "10px", background: "#fff8f8", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#dc2626" }}>Delete workspace</div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>Permanently deletes all data. Cannot be undone.</div>
            </div>
            <DeleteWorkspaceModal companyName={company.name} />
          </div>
        </div>

      </div>
    </div>
  );
}

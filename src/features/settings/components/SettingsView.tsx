import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
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
  const text = String(value || "").replace(/_/g, " ").trim();
  if (!text) return "";
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isConnected(integration: SettingsIntegration | undefined) {
  const s = String(integration?.status || "").toLowerCase();
  return s.includes("active") || s.includes("connected");
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
  const googleIntegration = integrations.find((i) =>
    String(i.provider || "").toLowerCase().includes("google"),
  );
  const quickbooksIntegration = integrations.find((i) => i.provider === "quickbooks");
  const squareIntegration = integrations.find((i) => i.provider === "square");
  const hubspotIntegration = integrations.find((i) => i.provider === "hubspot");
  const jobberIntegration = integrations.find((i) => i.provider === "jobber");

  const integrationRows = [
    {
      label: "QuickBooks",
      desc: "Sync customers, invoices, and revenue",
      integration: quickbooksIntegration,
      startHref: "/api/integrations/quickbooks/start",
    },
    {
      label: "Google Sheets",
      desc: "Used for bulk imports via the Imports page",
      integration: googleIntegration,
      startHref: "/api/integrations/google/start",
    },
    {
      label: "Jobber",
      desc: "Sync jobs, quotes, and field schedules",
      integration: jobberIntegration,
      startHref: "/api/integrations/jobber/start",
    },
    {
      label: "Google Calendar",
      desc: "Pull appointments in as scheduled visits",
      integration: undefined,
      startHref: "/api/integrations/google-calendar/start",
    },
    {
      label: "HubSpot",
      desc: "Sync contacts and deal activity",
      integration: hubspotIntegration,
      startHref: "/api/integrations/hubspot/start",
    },
    {
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
              <button type="button" className="btn btn-ghost">Cancel</button>
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
          <div className="setting-row">
            <div>
              <div className="setting-row-label">Overdue follow-ups</div>
              <div className="setting-row-desc">Alert when a follow-up passes its due date</div>
            </div>
            <div className="toggle toggle-on" />
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-row-label">New pipeline activity</div>
              <div className="setting-row-desc">Lead status changes and new opportunities</div>
            </div>
            <div className="toggle toggle-on" />
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-row-label">Unpaid invoices</div>
              <div className="setting-row-desc">Remind me when an invoice goes past due</div>
            </div>
            <div className="toggle toggle-off" />
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-row-label">AI operating brief</div>
              <div className="setting-row-desc">Daily morning summary from the AI assistant</div>
            </div>
            <div className="toggle toggle-on" />
          </div>
        </div>

        {/* ── Integrations ── */}
        <div className="setting-section">
          <div className="setting-section-head">
            <div className="setting-section-title">Integrations</div>
            <div className="setting-section-desc">Connect external tools to sync data automatically.</div>
          </div>
          {integrationRows.map(({ label, desc, integration, startHref }) => {
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
                    <SyncNowButton provider={integration.provider} label={label} />
                  )}
                  <Link
                    href={startHref}
                    className="btn btn-ghost btn-sm"
                  >
                    {connected ? "Disconnect" : "Connect"}
                  </Link>
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

        {/* ── API Keys ── */}
        <div className="setting-section">
          <div className="setting-section-head">
            <div className="setting-section-title">API Keys</div>
            <div className="setting-section-desc">
              Use these keys to send leads programmatically via the{" "}
              <code style={{ fontSize: "12px", background: "var(--surface-sunk)", padding: "1px 5px", borderRadius: "4px" }}>
                POST /api/leads/ingest
              </code>{" "}
              endpoint.
            </div>
          </div>
          <ApiKeyManager
            apiKeys={apiKeys}
            canManage={currentUserRole === "owner" || currentUserRole === "admin"}
          />
        </div>

        {/* ── Billing & plan ── */}
        <div className="setting-section">
          <div className="setting-section-head">
            <div className="setting-section-title">Billing & plan</div>
            <div className="setting-section-desc">Your current plan and payment details.</div>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-row-label">Current plan</div>
              <div className="setting-row-desc">Starter · $29/month · billed monthly</div>
            </div>
            <button className="btn btn-ghost btn-sm">Upgrade</button>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-row-label">Next billing date</div>
              <div className="setting-row-desc">June 1, 2026 · Visa ending in 4242</div>
            </div>
            <button className="btn btn-ghost btn-sm">Manage</button>
          </div>
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
            <button className="btn btn-sm" style={{ borderColor: "#fca5a5", color: "#dc2626", background: "transparent", flexShrink: 0 }}>
              Delete workspace
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

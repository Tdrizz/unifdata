import Link from "next/link";
import { SyncNowButton } from "@/components/ui/SyncNowButton";
import { formatTimestampDate } from "@/lib/date-format";
import { businessSectorOptions as businessSectorGroups } from "@/lib/industry-profiles";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { LogoutButton } from "@/components/LogoutButton";
import { updateWorkspaceAction, removeMember, disconnectIntegrationAction } from "../actions";
import type { SettingsIntegration } from "../types";
import { InviteMemberForm } from "./InviteMemberForm";
import { NotificationToggles } from "./NotificationToggles";
import { DeleteWorkspaceModal } from "./DeleteWorkspaceModal";
import { PageHeader } from "@/components/ui/PageHeader";
import { AiSettingsToggles } from "./AiSettingsToggles";
import { MonthlyGoalForm } from "./MonthlyGoalForm";
import { TagsSettings, type TagItem } from "./TagsSettings";
import { CustomFieldsSettings, type CustomFieldDef } from "./CustomFieldsSettings";
import { ProcessBoardsSettings, type Board } from "./ProcessBoardsSettings";
import { LabelsSettings } from "./LabelsSettings";

interface Company {
  id: string;
  name: string;
  business_sector: string;
  tier?: string;
  preferences?: Record<string, unknown>;
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
  currentMonthRevenue?: number;
  tags: TagItem[];
  contactFields: CustomFieldDef[];
  recordFields: CustomFieldDef[];
  boards: Board[];
  profileOverrides: Record<string, string>;
  defaultLabels: {
    customerSingular: string;
    customerPlural: string;
    jobSingular: string;
    jobPlural: string;
    pipelineLabel: string;
    recordLabel: string;
    recordPlural: string;
    completedLabel: string;
    cancelledLabel: string;
    valueLabel: string;
    activeStatusLabel: string;
    inactiveStatusLabel: string;
  };
}

function isConnected(integration: SettingsIntegration | undefined) {
  const s = String(integration?.status || "").toLowerCase();
  return s.includes("active") || s.includes("connected");
}

const btnGhost = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms]";
const btnGhostSm = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[12px] px-[11px] py-[5px] rounded-[7px] bg-ud-surface border border-ud text-ud-muted hover:text-ud-ink hover:border-ud-hard transition-[color,border-color] duration-[120ms]";
const btnInk = "inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-ink text-white hover:opacity-85 transition-opacity duration-[120ms]";

export function SettingsView({
  company,
  user,
  integrations,
  geminiEnabled: _geminiEnabled,
  members,
  currentUserRole,
  notificationPrefs,
  currentMonthRevenue,
  tags,
  contactFields,
  recordFields,
  boards,
  profileOverrides,
  defaultLabels,
}: SettingsViewProps) {
  const googleIntegration = integrations.find((i) =>
    String(i.provider || "").toLowerCase().includes("google"),
  );
  const quickbooksIntegration = integrations.find((i) => i.provider === "quickbooks");
  const squareIntegration = integrations.find((i) => i.provider === "square");
  const hubspotIntegration = integrations.find((i) => i.provider === "hubspot");
  const jobberIntegration = integrations.find((i) => i.provider === "jobber");

  const integrationRows = [
    { provider: "quickbooks", label: "QuickBooks", desc: "Sync customers, invoices, and revenue", integration: quickbooksIntegration, startHref: "/api/integrations/quickbooks/start" },
    { provider: "google_sheets", label: "Google Sheets", desc: "Used for bulk imports via the Imports page", integration: googleIntegration, startHref: "/api/integrations/google/start" },
    { provider: "jobber", label: "Jobber", desc: "Sync jobs, quotes, and field schedules", integration: jobberIntegration, startHref: "/api/integrations/jobber/start" },
    // HubSpot is hidden for new connections (sales-CRM tool, off the
    // operational roadmap) but stays manageable where already connected.
    ...(hubspotIntegration
      ? [{ provider: "hubspot", label: "HubSpot", desc: "Sync contacts and deal activity", integration: hubspotIntegration, startHref: "/api/integrations/hubspot/start" }]
      : []),
    { provider: "square", label: "Square", desc: "Import payments, invoices, and customer records", integration: squareIntegration, startHref: "/api/integrations/square/start" },
  ];

  return (
    <div className="px-7 pb-10 pt-7">
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage your business profile, integrations, and account."
        className="mb-6"
      />

      <div style={{ maxWidth: "680px" }}>

        {/* Business profile */}
        <div className="py-[26px] border-b border-ud">
          <div className="mb-[18px]">
            <p className="text-[13.5px] font-semibold text-ud-ink mb-0.5">Business profile</p>
            <p className="text-[12px] text-ud-muted">Details used across the workspace and AI outputs.</p>
          </div>
          <form action={updateWorkspaceAction}>
            <div className="form-row" style={{ marginBottom: "16px" }}>
              <div>
                <label className="form-label">Business name</label>
                <input name="name" required defaultValue={company.name || ""} className="form-input" />
              </div>
              <div>
                <label className="form-label">Industry</label>
                <select name="business_sector" defaultValue={company.business_sector || "general"} className="form-input">
                  {businessSectorGroups.map((group) => (
                    <optgroup key={group.group} label={group.group}>
                      {group.options.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="reset" className={btnGhost}>Cancel</button>
              <button type="submit" className={btnInk}>Save changes</button>
            </div>
          </form>
        </div>

        {/* Account */}
        <div className="py-[26px] border-b border-ud">
          <div className="mb-[18px]">
            <p className="text-[13.5px] font-semibold text-ud-ink mb-0.5">Account</p>
            <p className="text-[12px] text-ud-muted">Your personal sign-in details.</p>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.04)] gap-4">
            <div>
              <p className="text-[13px] font-medium text-ud-ink">Signed in as</p>
              <p className="text-[12px] text-ud-muted mt-[1px]">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.04)] gap-4">
            <div>
              <p className="text-[13px] font-medium text-ud-ink">Workspace</p>
              <p className="text-[12px] text-ud-muted mt-[1px]">{company.name}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.04)] gap-4">
            <div>
              <p className="text-[13px] font-medium text-ud-ink">Password</p>
              <p className="text-[12px] text-ud-muted mt-[1px]">Change your account password</p>
            </div>
          </div>
          <div style={{ paddingTop: "8px" }}><ChangePasswordForm /></div>
          <div style={{ paddingTop: "12px" }}><LogoutButton /></div>
        </div>

        {/* Notifications */}
        <div className="py-[26px] border-b border-ud">
          <div className="mb-[18px]">
            <p className="text-[13.5px] font-semibold text-ud-ink mb-0.5">Notifications</p>
            <p className="text-[12px] text-ud-muted">Control what triggers an in-app notification.</p>
          </div>
          <NotificationToggles initialPrefs={notificationPrefs} />
        </div>

        {/* Integrations */}
        <div className="py-[26px] border-b border-ud">
          <div className="mb-[18px]">
            <p className="text-[13.5px] font-semibold text-ud-ink mb-0.5">Integrations</p>
            <p className="text-[12px] text-ud-muted">Connect external tools to sync data automatically.</p>
          </div>
          {integrationRows.map(({ provider, label, desc, integration, startHref }) => {
            const connected = isConnected(integration);
            return (
              <div key={label} className="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.04)] last:border-b-0 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-ud-ink">{label}</p>
                    {connected && (
                      <span className="inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-success-bg text-ud-success">Connected</span>
                    )}
                  </div>
                  <p className="text-[12px] text-ud-muted mt-[1px]">{desc}</p>
                  {integration?.provider_account_name && (
                    <p style={{ fontSize: "11px", color: "var(--faint)", marginTop: "2px" }}>
                      {integration.provider_account_name}
                      {integration.created_at && <> · Connected {formatTimestampDate(integration.created_at)}</>}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  {connected && integration?.status === "active" && (
                    <SyncNowButton provider={provider} label={label} />
                  )}
                  {connected ? (
                    <form action={disconnectIntegrationAction.bind(null, provider)}>
                      <button type="submit" className={btnGhostSm}>Disconnect</button>
                    </form>
                  ) : (
                    <Link href={startHref} className={btnGhostSm}>Connect</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Team members */}
        <div className="py-[26px] border-b border-ud">
          <div className="mb-[18px]">
            <p className="text-[13.5px] font-semibold text-ud-ink mb-0.5">Team members</p>
            <p className="text-[12px] text-ud-muted">Manage who has access to this workspace.</p>
          </div>
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between py-3 border-b border-[rgba(0,0,0,0.04)] last:border-b-0 gap-4">
              <div>
                <p className="text-[13px] font-medium text-ud-ink">{member.profiles?.full_name ?? "Team member"}</p>
                <p className="text-[12px] text-ud-muted mt-[1px] capitalize">{member.role}</p>
              </div>
              {currentUserRole === "owner" && (
                <form action={removeMember.bind(null, member.user_id)}>
                  <button type="submit" className={btnGhostSm} style={{ color: "var(--danger)" }}>Remove</button>
                </form>
              )}
            </div>
          ))}
          {currentUserRole === "owner" && (
            <div style={{ paddingTop: "12px" }}><InviteMemberForm /></div>
          )}
        </div>

        {/* Plan */}
        <div className="py-[26px] border-b border-ud">
          <div className="mb-[18px]">
            <p className="text-[13.5px] font-semibold text-ud-ink mb-0.5">Plan</p>
            <p className="text-[12px] text-ud-muted">Your current subscription and features.</p>
          </div>
          {company.tier === "pro" ? (
            <div className="flex items-center justify-between py-3 border border-[rgba(74,63,168,0.18)] rounded-[10px] px-4 bg-[rgba(74,63,168,0.04)]">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-ud-ink">Pro</p>
                  <span className="inline-flex items-center px-[9px] py-[3px] rounded-[6px] text-[11px] font-semibold bg-ud-accent text-white">Active</span>
                </div>
                <p className="text-[12px] text-ud-muted mt-[1px]">$199/mo · AI inbox, nightly agent pipeline, ROI tracking</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between py-3 border border-ud rounded-[10px] px-4 gap-4">
              <div>
                <p className="text-[13px] font-semibold text-ud-ink">Standard</p>
                <p className="text-[12px] text-ud-muted mt-[1px]">$49/mo · CRM, AI chat, integrations</p>
              </div>
              <Link
                href="/api/billing/upgrade"
                className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[13px] px-3 py-2 rounded-[9px] bg-ud-accent text-white hover:opacity-90 transition-opacity"
              >
                Upgrade to Pro →
              </Link>
            </div>
          )}
        </div>

        {/* AI settings */}
        <div className="py-[26px] border-b border-ud">
          <div className="mb-[18px]">
            <p className="text-[13.5px] font-semibold text-ud-ink mb-0.5">AI settings</p>
            <p className="text-[12px] text-ud-muted">Control how the AI operates across your workspace.</p>
          </div>
          <AiSettingsToggles
            autopilot={company.preferences?.autopilot === true}
            aiFirstMode={company.preferences?.ai_first_mode === true}
            isPro={company.tier === "pro"}
          />
        </div>

        {/* Revenue goal */}
        {company.tier === "pro" && (
          <div className="py-[26px] border-b border-ud">
            <div className="mb-[18px]">
              <p className="text-[13.5px] font-semibold text-ud-ink mb-0.5">Revenue goal</p>
              <p className="text-[12px] text-ud-muted">Set a monthly target so the AI can track your progress and flag shortfalls early.</p>
            </div>
            <MonthlyGoalForm
              currentGoal={company.preferences?.monthly_revenue_goal as number | undefined}
              currentMonthRevenue={currentMonthRevenue}
            />
          </div>
        )}

        {/* Tags */}
        <div className="py-[26px] border-b border-ud">
          <div className="mb-[18px]">
            <p className="text-[13.5px] font-semibold text-ud-ink mb-0.5">Tags</p>
            <p className="text-[12px] text-ud-muted">Organize contacts with color-coded labels.</p>
          </div>
          <TagsSettings orgId={company.id} initialTags={tags} />
        </div>

        {/* Custom fields */}
        <div className="py-[26px] border-b border-ud">
          <div className="mb-[18px]">
            <p className="text-[13.5px] font-semibold text-ud-ink mb-0.5">Custom fields</p>
            <p className="text-[12px] text-ud-muted">Add extra data fields to contacts and process records.</p>
          </div>
          <CustomFieldsSettings orgId={company.id} contactFields={contactFields} recordFields={recordFields} />
        </div>

        {/* Process boards */}
        <div className="py-[26px] border-b border-ud">
          <div className="mb-[18px]">
            <p className="text-[13.5px] font-semibold text-ud-ink mb-0.5">Process boards</p>
            <p className="text-[12px] text-ud-muted">Define the stages records move through in your workflow.</p>
          </div>
          <ProcessBoardsSettings orgId={company.id} boards={boards} />
        </div>

        {/* Labels */}
        <div className="py-[26px] border-b border-ud">
          <div className="mb-[18px]">
            <p className="text-[13.5px] font-semibold text-ud-ink mb-0.5">Labels</p>
            <p className="text-[12px] text-ud-muted">Customize terminology used across your workspace.</p>
          </div>
          <LabelsSettings orgId={company.id} profileOverrides={profileOverrides} defaultLabels={defaultLabels} />
        </div>

        {/* Danger zone */}
        <div className="py-[26px]" style={{ paddingBottom: "8px" }}>
          <div className="mb-[18px]">
            <p className="text-[13.5px] font-semibold mb-0.5" style={{ color: "#dc2626" }}>Danger zone</p>
            <p className="text-[12px] text-ud-muted">Irreversible actions. Proceed with care.</p>
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

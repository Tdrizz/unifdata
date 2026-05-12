import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { formatTimestampDate } from "@/lib/date-format";
import { businessSectorOptions, industryProfiles } from "@/lib/industry-profiles";
import { ColorPickers } from "@/components/settings/ColorPickers";

const validBusinessSectors = new Set(Object.keys(industryProfiles));

type IntegrationRecord = {
  id: string;
  provider: string | null;
  provider_account_name: string | null;
  status: string | null;
  created_at: string;
};

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeHexColor(value: string, fallback: string) {
  const color = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color.toLowerCase();
  }

  return fallback;
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

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentCompany = await getCurrentCompany();

  if (!currentCompany) {
    redirect("/onboarding");
  }

  const { company } = currentCompany;

  async function updateWorkspace(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const currentCompany = await getCurrentCompany();

    if (!currentCompany) {
      redirect("/onboarding");
    }

    const { company } = currentCompany;

    const name = getFormString(formData, "name");
    const rawSector = getFormString(formData, "business_sector");
    const businessSector = validBusinessSectors.has(rawSector)
      ? rawSector
      : "general";

    const brandColor = normalizeHexColor(
      getFormString(formData, "brand_color"),
      "#0f172a",
    );

    const accentColor = normalizeHexColor(
      getFormString(formData, "accent_color"),
      "#2563eb",
    );

    if (!name) {
      throw new Error("Business name is required.");
    }

    const { data: member, error: memberError } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("company_id", company.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (!member) {
      throw new Error("You are not a member of this workspace.");
    }

    const { data: updatedCompany, error } = await supabase
      .from("companies")
      .update({
        name,
        business_sector: businessSector,
        brand_color: brandColor,
        accent_color: accentColor,
      })
      .eq("id", company.id)
      .select("id, name, business_sector, brand_color, accent_color")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!updatedCompany) {
      throw new Error(
        "Settings could not be saved. Please try again or contact support if the issue persists.",
      );
    }

    revalidatePath("/settings");
    revalidatePath("/workspace");
    revalidatePath("/", "layout");

    redirect("/settings");
  }

  async function signOut() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();

    redirect("/login");
  }

  const integrationsResult = await supabase
    .from("integrations")
    .select("id, provider, provider_account_name, status, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const integrations = (integrationsResult.data || []) as IntegrationRecord[];

  const googleIntegration = integrations.find((integration) =>
    String(integration.provider || "")
      .toLowerCase()
      .includes("google"),
  );

  const quickbooksIntegration = integrations.find((i) => i.provider === "quickbooks");
  const squareIntegration = integrations.find((i) => i.provider === "square");
  const hubspotIntegration = integrations.find((i) => i.provider === "hubspot");
  const jobberIntegration = integrations.find((i) => i.provider === "jobber");

  const geminiEnabled = Boolean(process.env.GEMINI_API_KEY);

  const brandColor = normalizeHexColor(company.brand_color || "", "#0f172a");
  const accentColor = normalizeHexColor(company.accent_color || "", "#2563eb");

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={brandColor}
      accentColor={accentColor}
      businessSector={company.business_sector}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Settings"
          title="Workspace settings"
          description="Manage the business profile, appearance, connected tools, and account access."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/workspace"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
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
            <form action={updateWorkspace} className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Business name
                  <input
                    name="name"
                    required
                    defaultValue={company.name || ""}
                    placeholder="FrontierOps Demo Company"
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
                  defaultBrandColor={brandColor}
                  defaultAccentColor={accentColor}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
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

                <form action={signOut}>
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
              title="Launch tools"
              description="Status for the tools FrontierOps uses."
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
          description="Connect your business tools. Once connected, FrontierOps syncs their data automatically every day — no CSV exports needed."
        >
          <div className="divide-y divide-slate-100">
            {[
              {
                provider: "quickbooks",
                label: "QuickBooks",
                description: "Syncs customers, invoices, and estimates.",
                integration: quickbooksIntegration,
                startHref: "/api/integrations/quickbooks/start",
                syncHref: "/api/sync/quickbooks",
              },
              {
                provider: "square",
                label: "Square",
                description: "Syncs customers and payments.",
                integration: squareIntegration,
                startHref: "/api/integrations/square/start",
                syncHref: "/api/sync/square",
              },
              {
                provider: "hubspot",
                label: "HubSpot",
                description: "Syncs contacts and deals.",
                integration: hubspotIntegration,
                startHref: "/api/integrations/hubspot/start",
                syncHref: "/api/sync/hubspot",
              },
              {
                provider: "jobber",
                label: "Jobber",
                description: "Syncs clients, jobs, quotes, and invoices.",
                integration: jobberIntegration,
                startHref: "/api/integrations/jobber/start",
                syncHref: "/api/sync/jobber",
              },
            ].map(({ label, description, integration, startHref }) => (
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
                      className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
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
      </div>
    </AppShell>
  );
}


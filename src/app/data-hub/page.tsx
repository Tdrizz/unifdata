import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";

export default async function DataHubPage() {
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

  const [
    customersResult,
    leadsResult,
    jobsResult,
    salesResult,
    followUpsResult,
    importsResult,
    aiReportsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email, address, created_at")
      .eq("company_id", company.id),
    supabase
      .from("leads")
      .select("id, service_requested, status, created_at")
      .eq("company_id", company.id),
    supabase
      .from("jobs")
      .select("id, service_type, status, created_at")
      .eq("company_id", company.id),
    supabase
      .from("sales")
      .select("id, amount, payment_status, created_at")
      .eq("company_id", company.id),
    supabase
      .from("follow_ups")
      .select("id, status, due_date, created_at")
      .eq("company_id", company.id),
    supabase
      .from("imports")
      .select("id, file_name, records_created, created_at")
      .eq("company_id", company.id),
    supabase
      .from("ai_reports")
      .select("id, report_type, created_at")
      .eq("company_id", company.id),
  ]);

  const customers = customersResult.data || [];
  const leads = leadsResult.data || [];
  const jobs = jobsResult.data || [];
  const sales = salesResult.data || [];
  const followUps = followUpsResult.data || [];
  const imports = importsResult.data || [];
  const aiReports = aiReportsResult.data || [];

  const incompleteCustomers = customers.filter(
    (customer) => !customer.phone && !customer.email,
  ).length;

  const totalRecords =
    customers.length +
    leads.length +
    jobs.length +
    sales.length +
    followUps.length +
    imports.length +
    aiReports.length;

  const recordCollections = [
    {
      title: "Customers",
      description: "Contact records, notes, addresses, and customer details.",
      count: customers.length,
      href: "/customers",
    },
    {
      title: "Leads",
      description: "Pipeline opportunities, estimates, and sources.",
      count: leads.length,
      href: "/leads",
    },
    {
      title: "Jobs",
      description: "Scheduled, active, completed, and paid work.",
      count: jobs.length,
      href: "/jobs",
    },
    {
      title: "Sales",
      description: "Revenue records, payment status, and service performance.",
      count: sales.length,
      href: "/sales",
    },
    {
      title: "Follow-Ups",
      description: "Open and completed reminders tied to customers and leads.",
      count: followUps.length,
      href: "/follow-ups",
    },
    {
      title: "Imports",
      description: "Customer data migrations and import history.",
      count: imports.length,
      href: "/imports",
    },
    {
      title: "AI Reports",
      description: "Generated summaries and business insights.",
      count: aiReports.length,
      href: "/ai-assistant",
    },
  ];

  const recentActivity = [
    ...customers.map((item) => ({
      type: "Customer",
      label: item.name,
      created_at: item.created_at,
    })),
    ...leads.map((item) => ({
      type: "Lead",
      label: item.service_requested,
      created_at: item.created_at,
    })),
    ...jobs.map((item) => ({
      type: "Job",
      label: item.service_type,
      created_at: item.created_at,
    })),
    ...sales.map((item) => ({
      type: "Sale",
      label: `$${Number(item.amount || 0).toLocaleString()} ${item.payment_status}`,
      created_at: item.created_at,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 10);

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Data Management"
          title="Data Hub"
          description="A clean access layer for every major business record stored in FrontierOps."
          actions={
            <Link
              href="/imports"
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Import customer data
            </Link>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Total records"
            value={totalRecords}
            helper="Across all major collections"
          />
          <StatCard
            label="Customer records"
            value={customers.length}
            helper="Core CRM database"
          />
          <StatCard
            label="Incomplete customers"
            value={incompleteCustomers}
            helper="Missing phone and email"
            tone={incompleteCustomers > 0 ? "warning" : "default"}
          />
        </section>

        <SectionCard
          title="Record collections"
          description="Jump into the main business datasets."
        >
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {recordCollections.map((collection) => (
              <Link
                key={collection.title}
                href={collection.href}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">
                      {collection.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {collection.description}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                    {collection.count}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent activity"
          description="Newest records created across the workspace."
        >
          {recentActivity.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No activity yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentActivity.map((item, index) => (
                <div
                  key={`${item.type}-${item.label}-${index}`}
                  className="grid gap-3 p-5 md:grid-cols-[140px_1fr_180px]"
                >
                  <p className="text-sm font-semibold text-slate-500">
                    {item.type}
                  </p>
                  <p className="font-semibold text-slate-950">{item.label}</p>
                  <p className="text-sm text-slate-500 md:text-right">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}

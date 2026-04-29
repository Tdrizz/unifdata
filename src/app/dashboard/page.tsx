const metrics = [
  {
    label: "Monthly Revenue",
    value: "$64,800",
    description: "Revenue tracked this month",
  },
  {
    label: "New Leads",
    value: "28",
    description: "New business opportunities",
  },
  {
    label: "Open Estimates",
    value: "$31,500",
    description: "Potential revenue waiting on approval",
  },
  {
    label: "Jobs Completed",
    value: "17",
    description: "Completed jobs this month",
  },
  {
    label: "Follow-Ups Due",
    value: "6",
    description: "Customers needing contact",
  },
];

const topServices = [
  {
    name: "Excavation",
    revenue: "$28,400",
  },
  {
    name: "Snow Removal",
    revenue: "$18,900",
  },
  {
    name: "Hauling",
    revenue: "$9,700",
  },
];

const followUps = [
  {
    customer: "Mike Johnson",
    service: "Driveway gravel repair",
    due: "Today",
    value: "$3,500",
  },
  {
    customer: "Sarah Miller",
    service: "Snow removal contract",
    due: "Tomorrow",
    value: "$1,200",
  },
  {
    customer: "Arctic Rentals LLC",
    service: "Lot clearing estimate",
    due: "2 days",
    value: "$7,800",
  },
];

const recentLeads = [
  {
    customer: "Ryan Thompson",
    source: "Referral",
    service: "Excavation",
    status: "New",
    value: "$4,200",
  },
  {
    customer: "Northline Storage",
    source: "Google Business",
    service: "Snow Removal",
    status: "Estimate Sent",
    value: "$2,800",
  },
  {
    customer: "Kona Freight Yard",
    source: "Facebook",
    service: "Hauling",
    status: "Contacted",
    value: "$1,600",
  },
];

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              FrontierOps Demo
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Business Dashboard
            </h1>
            <p className="mt-2 text-slate-600">
              A simple overview of customers, sales, jobs, and follow-ups.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Demo Company:{" "}
            <span className="font-semibold text-slate-950">
              Arctic Ridge Services
            </span>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              description={metric.description}
            />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="AI Summary">
            <p className="leading-7 text-slate-600">
              Revenue is up this month, but there are 6 follow-ups due and
              $31,500 in open estimates. The biggest opportunity is following up
              with older estimates before they go cold.
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">
                Recommended next action
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Contact the 3 highest-value open estimates before Friday.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Top Services">
            <div className="space-y-3">
              {topServices.map((service) => (
                <div
                  key={service.name}
                  className="flex justify-between border-b border-slate-100 pb-2"
                >
                  <span className="text-slate-600">{service.name}</span>
                  <span className="font-semibold text-slate-950">
                    {service.revenue}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Follow-Ups Due">
            <div className="space-y-3">
              {followUps.map((followUp) => (
                <div
                  key={followUp.customer}
                  className="rounded-xl border border-slate-100 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {followUp.customer}
                      </p>
                      <p className="text-sm text-slate-500">
                        {followUp.service}
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {followUp.due}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">
                    Estimate value:{" "}
                    <span className="font-semibold">{followUp.value}</span>
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent Leads">
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 font-medium">Source</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Value</th>
                  </tr>
                </thead>

                <tbody>
                  {recentLeads.map((lead) => (
                    <tr
                      key={lead.customer}
                      className="border-t border-slate-100"
                    >
                      <td className="p-3">
                        <p className="font-medium text-slate-950">
                          {lead.customer}
                        </p>
                        <p className="text-xs text-slate-500">{lead.service}</p>
                      </td>
                      <td className="p-3 text-slate-600">{lead.source}</td>
                      <td className="p-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {lead.status}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-950">
                        {lead.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </section>
      </div>
    </main>
  );
}

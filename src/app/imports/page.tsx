import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { ImportCustomersClient } from "./ImportCustomersClient";

export default async function ImportsPage() {
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

  const { data: imports, error } = await supabase
    .from("imports")
    .select("id, file_name, import_type, status, records_created, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""}>
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Data Migration
          </p>

          <h1 className="mt-2 text-3xl font-bold">Imports</h1>

          <p className="mt-2 text-slate-600">
            Upload customer CSV files and map spreadsheet columns into
            FrontierOps.
          </p>
        </header>

        <ImportCustomersClient />

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-bold">Recent imports</h2>
            <p className="mt-1 text-sm text-slate-500">
              Import history for this company.
            </p>
          </div>

          {!imports || imports.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No imports yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4 font-medium">File</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Records</th>
                    <th className="p-4 font-medium">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {imports.map((item) => (
                    <tr key={item.id}>
                      <td className="p-4 font-semibold text-slate-950">
                        {item.file_name}
                      </td>
                      <td className="p-4 text-slate-600">{item.import_type}</td>
                      <td className="p-4 text-slate-600">{item.status}</td>
                      <td className="p-4 text-slate-600">
                        {item.records_created}
                      </td>
                      <td className="p-4 text-slate-600">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

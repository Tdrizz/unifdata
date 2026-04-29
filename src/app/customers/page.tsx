import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { createCustomerAction, deleteCustomerAction } from "./actions";

export default async function CustomersPage() {
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

  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, phone, email, address, customer_type, notes, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""}>
      <div className="space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              CRM
            </p>

            <h1 className="mt-2 text-3xl font-bold">Customers</h1>

            <p className="mt-2 text-slate-600">
              Add and manage customer records for {company.name}.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Total customers:{" "}
            <span className="font-bold text-slate-950">
              {customers?.length || 0}
            </span>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Add customer</h2>

          <form
            action={createCustomerAction}
            className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label className="text-sm font-medium text-slate-700">
                Customer name
              </label>
              <input
                name="name"
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Mike Johnson"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Customer type
              </label>
              <input
                name="customerType"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Residential, commercial, repeat client..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                name="phone"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="907-555-1234"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                name="email"
                type="email"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="customer@example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Address
              </label>
              <input
                name="address"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="123 Main St, Anchorage, AK"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Notes
              </label>
              <textarea
                name="notes"
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Important details, preferences, job history, etc."
              />
            </div>

            <div className="md:col-span-2">
              <button className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800">
                Add customer
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-bold">Customer list</h2>
            <p className="mt-1 text-sm text-slate-500">
              These records are coming from Supabase and filtered to your
              company.
            </p>
          </div>

          {!customers || customers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-lg font-semibold">No customers yet.</p>
              <p className="mt-2 text-slate-500">
                Add your first customer using the form above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Contact</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Address</th>
                    <th className="p-4 font-medium">Notes</th>
                    <th className="p-4 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="p-4 align-top">
                        <p className="font-semibold text-slate-950">
                          {customer.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Added{" "}
                          {new Date(customer.created_at).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="p-4 align-top text-slate-600">
                        <p>{customer.phone || "No phone"}</p>
                        <p className="mt-1">{customer.email || "No email"}</p>
                      </td>

                      <td className="p-4 align-top text-slate-600">
                        {customer.customer_type || "—"}
                      </td>

                      <td className="max-w-xs p-4 align-top text-slate-600">
                        {customer.address || "—"}
                      </td>

                      <td className="max-w-xs p-4 align-top text-slate-600">
                        {customer.notes || "—"}
                      </td>

                      <td className="p-4 align-top">
                        <form action={deleteCustomerAction}>
                          <input
                            type="hidden"
                            name="customerId"
                            value={customer.id}
                          />

                          <button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                            Delete
                          </button>
                        </form>
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
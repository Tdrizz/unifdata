"use client";

import { useState, useTransition } from "react";
import { mergeCustomers } from "../actions";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface DuplicateGroup {
  key: string;
  type: "email" | "phone";
  customers: Customer[];
}

export function DuplicatesPage({ groups: initialGroups }: { groups: DuplicateGroup[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [isPending, startTransition] = useTransition();

  const handleMerge = (winnerId: string, loserId: string) => {
    startTransition(async () => {
      await mergeCustomers(winnerId, loserId);
      setGroups((prev) =>
        prev
          .map((g) => ({ ...g, customers: g.customers.filter((c) => c.id !== loserId) }))
          .filter((g) => g.customers.length >= 2)
      );
    });
  };

  if (groups.length === 0) {
    return <div className="py-16 text-center text-slate-500">No duplicate customers found.</div>;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={`${group.type}-${group.key}`} className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-4 text-sm text-slate-500">
            Duplicate <strong>{group.type}</strong>: <span className="font-mono">{group.key}</span>
          </p>
          <div className="space-y-3">
            {group.customers.map((customer, i) => (
              <div key={customer.id} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="font-semibold text-slate-950">{customer.name}</p>
                  <p className="text-xs text-slate-500">
                    {customer.email ?? ""}{customer.phone ? ` · ${customer.phone}` : ""}
                  </p>
                </div>
                {i === 0 ? (
                  <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Keep</span>
                ) : (
                  <button
                    onClick={() => handleMerge(group.customers[0].id, customer.id)}
                    disabled={isPending}
                    className="shrink-0 rounded-lg bg-[#1D2D3E] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#2a3f57] disabled:opacity-50"
                  >
                    Merge into first
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

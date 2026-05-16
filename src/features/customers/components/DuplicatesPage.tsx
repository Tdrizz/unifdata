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
    return <div className="py-16 text-center text-ud-faint">No duplicate customers found.</div>;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={`${group.type}-${group.key}`} className="rounded-[12px] border border-ud bg-ud-surface p-5 shadow-ud">
          <p className="mb-4 text-sm text-ud-muted">
            Duplicate <strong>{group.type}</strong>: <span className="font-mono">{group.key}</span>
          </p>
          <div className="space-y-3">
            {group.customers.map((customer, i) => (
              <div key={customer.id} className="flex items-center justify-between gap-4 rounded-[8px] bg-ud-surface-sunk p-3">
                <div>
                  <p className="font-semibold text-ud-ink">{customer.name}</p>
                  <p className="text-xs text-ud-faint">
                    {customer.email ?? ""}{customer.phone ? ` · ${customer.phone}` : ""}
                  </p>
                </div>
                {i === 0 ? (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Keep</span>
                ) : (
                  <button
                    onClick={() => handleMerge(group.customers[0].id, customer.id)}
                    disabled={isPending}
                    className="shrink-0 rounded-[8px] bg-ud-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
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

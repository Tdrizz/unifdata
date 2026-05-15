# Phase F: Data Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Help users identify and merge duplicate customers that were created by imports from multiple sources, keeping all associated leads, jobs, follow-ups, and sales linked to the surviving record.

**Architecture:** A `findDuplicateCustomers` query groups customers by normalized email and phone, returning groups with 2+ members. A `mergeCustomers(winnerId, loserId)` Server Action re-parents all FK references from the loser to the winner across 4 tables, then deletes the loser. A Duplicates page surfaces these groups with a merge UI.

**Tech Stack:** Next.js App Router Server Actions, Supabase, TypeScript

---

### Task 1: Duplicate detection query

**Goal:** Create a server query that finds customers sharing the same email or phone number within the same company.

**Files:**
- Modify: `src/features/customers/queries.ts`

**Acceptance Criteria:**
- [ ] `findDuplicateCustomers(companyId)` function exported from `queries.ts`
- [ ] Returns an array of duplicate groups: `Array<{ key: string; customers: Customer[] }>`
- [ ] Each group has 2+ customers with the same non-empty email OR phone
- [ ] Customers with empty email AND empty phone are excluded

**Verify:** Manually insert two customers with the same email in Supabase → `findDuplicateCustomers()` returns a group containing both.

**Steps:**

- [ ] **Step 1: Read the current customers queries file**

```bash
cat src/features/customers/queries.ts
cat src/types/db.ts | grep -A 30 '"customers"'
```

- [ ] **Step 2: Add `findDuplicateCustomers` to `src/features/customers/queries.ts`**

```typescript
export async function findDuplicateCustomers(companyId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId);

  if (!data || data.length === 0) return [];

  const byEmail = new Map<string, typeof data>();
  const byPhone = new Map<string, typeof data>();

  for (const customer of data) {
    if (customer.email) {
      const key = customer.email.toLowerCase().trim();
      if (!byEmail.has(key)) byEmail.set(key, []);
      byEmail.get(key)!.push(customer);
    }
    if (customer.phone) {
      const key = customer.phone.replace(/\D/g, "");
      if (key.length >= 7) {
        if (!byPhone.has(key)) byPhone.set(key, []);
        byPhone.get(key)!.push(customer);
      }
    }
  }

  const groups: Array<{ key: string; type: "email" | "phone"; customers: typeof data }> = [];
  const seenIds = new Set<string>();

  for (const [key, customers] of byEmail.entries()) {
    if (customers.length < 2) continue;
    const ids = customers.map((c) => c.id).sort().join(",");
    if (seenIds.has(ids)) continue;
    seenIds.add(ids);
    groups.push({ key, type: "email", customers });
  }

  for (const [key, customers] of byPhone.entries()) {
    if (customers.length < 2) continue;
    const ids = customers.map((c) => c.id).sort().join(",");
    if (seenIds.has(ids)) continue;
    seenIds.add(ids);
    groups.push({ key, type: "phone", customers });
  }

  return groups;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/customers/queries.ts
git commit -m "feat: add duplicate customer detection query"
```

---

### Task 2: Merge customers Server Action

**Goal:** Create a `mergeCustomers(winnerId, loserId)` Server Action that re-parents all related records from the loser to the winner and deletes the loser.

**Files:**
- Modify: `src/features/customers/actions.ts`

**Acceptance Criteria:**
- [ ] `mergeCustomers(winnerId, loserId)` is exported from `actions.ts`
- [ ] All `leads` with `customer_id = loserId` are updated to `customer_id = winnerId`
- [ ] All `jobs` with `customer_id = loserId` are updated to `customer_id = winnerId`
- [ ] All `follow_ups` with `customer_id = loserId` are updated to `customer_id = winnerId`
- [ ] All `sales` with `customer_id = loserId` are updated to `customer_id = winnerId`
- [ ] The loser customer row is deleted after re-parenting
- [ ] Winner's `updated_at` is refreshed
- [ ] Both winner and loser must belong to the current company (security check)
- [ ] `revalidatePath("/customers")` is called

**Verify:** Create 2 duplicate customers with 1 lead and 1 job each → merge → winner has 2 leads and 2 jobs, loser is deleted.

**Steps:**

- [ ] **Step 1: Read the existing actions file and DB schema for FK columns**

```bash
cat src/features/customers/actions.ts 2>/dev/null || echo "no actions file yet"
cat src/types/db.ts | grep -E "customer_id|leads:|jobs:|follow_ups:|sales:"
```

- [ ] **Step 2: Add `mergeCustomers` to `src/features/customers/actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

export async function mergeCustomers(winnerId: string, loserId: string) {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error("Unauthorized");

  const supabase = await createClient();

  // Security: verify both customers belong to this company
  const { data: customers, error: fetchError } = await supabase
    .from("customers")
    .select("id, company_id")
    .in("id", [winnerId, loserId])
    .eq("company_id", companyId);

  if (fetchError || !customers || customers.length !== 2) {
    throw new Error("Invalid customer IDs or access denied");
  }

  // Re-parent all related records
  const tables = ["leads", "jobs", "follow_ups", "sales"] as const;
  for (const table of tables) {
    await supabase
      .from(table)
      .update({ customer_id: winnerId })
      .eq("customer_id", loserId);
  }

  // Delete the loser
  await supabase.from("customers").delete().eq("id", loserId);

  // Touch winner's updated_at
  await supabase
    .from("customers")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", winnerId);

  revalidatePath("/customers");
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/customers/actions.ts
git commit -m "feat: add mergeCustomers server action with FK re-parenting"
```

---

### Task 3: Duplicates page and merge UI

**Goal:** Create a `/customers/duplicates` page that lists duplicate groups with a "Merge" button for each pair.

**Files:**
- Create: `src/app/(app)/customers/duplicates/page.tsx`
- Create: `src/features/customers/components/DuplicatesPage.tsx`

**Acceptance Criteria:**
- [ ] `/customers/duplicates` page renders and shows duplicate groups
- [ ] Each group shows customer names, emails, phone numbers
- [ ] Each group has a "Merge" button that opens a confirmation dialog or inline choice of winner
- [ ] After merge, the group disappears from the list
- [ ] If no duplicates found, shows an empty state: "No duplicate customers found."
- [ ] Link to this page from the Customers page header (e.g., "View duplicates (3)")

**Verify:** Navigate to `/customers/duplicates` → shows duplicate groups if any exist.

**Steps:**

- [ ] **Step 1: Create `src/features/customers/components/DuplicatesPage.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { mergeCustomers } from "../actions";

interface Customer {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface DuplicateGroup {
  key: string;
  type: "email" | "phone";
  customers: Customer[];
}

interface DuplicatesPageProps {
  groups: DuplicateGroup[];
}

export function DuplicatesPage({ groups: initialGroups }: DuplicatesPageProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [isPending, startTransition] = useTransition();

  const handleMerge = (winnerId: string, loserId: string, groupKey: string) => {
    startTransition(async () => {
      await mergeCustomers(winnerId, loserId);
      setGroups((prev) =>
        prev.filter((g) => {
          const remaining = g.customers.filter((c) => c.id !== loserId);
          return remaining.length >= 2;
        }).map((g) => ({
          ...g,
          customers: g.customers.filter((c) => c.id !== loserId),
        }))
      );
    });
  };

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No duplicate customers found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={`${group.type}-${group.key}`} className="rounded-lg border border-border p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Duplicate {group.type}: <strong>{group.key}</strong>
          </p>
          <div className="space-y-2">
            {group.customers.map((customer, i) => (
              <div key={customer.id} className="flex items-center justify-between gap-4 rounded bg-muted/30 p-3">
                <div>
                  <p className="font-medium">{customer.name ?? "(no name)"}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.email ?? ""} {customer.phone ? `· ${customer.phone}` : ""}
                  </p>
                </div>
                {i > 0 && (
                  <button
                    onClick={() => handleMerge(group.customers[0].id, customer.id, group.key)}
                    disabled={isPending}
                    className="shrink-0 rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
                  >
                    Merge into first
                  </button>
                )}
                {i === 0 && (
                  <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Keep this</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/(app)/customers/duplicates/page.tsx`**

```tsx
import { getCurrentCompanyId } from "@/lib/current-company";
import { findDuplicateCustomers } from "@/features/customers/queries";
import { DuplicatesPage } from "@/features/customers/components/DuplicatesPage";
import { redirect } from "next/navigation";

export default async function CustomerDuplicatesPage() {
  const companyId = await getCurrentCompanyId();
  if (!companyId) redirect("/login");

  const groups = await findDuplicateCustomers(companyId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Duplicate Customers</h1>
        <a href="/customers" className="text-sm text-muted-foreground hover:underline">
          ← Back to Customers
        </a>
      </div>
      <DuplicatesPage groups={groups} />
    </div>
  );
}
```

- [ ] **Step 3: Add "View duplicates" link to the Customers page header**

```bash
find src/features/customers -name "*.tsx" | head -5
```

In the customers page header, add:

```tsx
<a href="/customers/duplicates" className="text-sm text-muted-foreground hover:underline">
  View duplicates
</a>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/ src/features/customers/
git commit -m "feat: add duplicate customers detection and merge UI"
```

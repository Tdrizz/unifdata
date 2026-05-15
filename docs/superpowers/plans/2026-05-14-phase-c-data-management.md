# Phase C: Data Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give users control over their data — export any list as CSV, bulk-select and delete/update records, and revert an import session by deleting all records it created.

**Architecture:** CSV export is a GET endpoint that streams a generated CSV string; bulk actions are Server Actions that batch-delete or batch-update by ID array; import revert is a Server Action that reads `import_session_rows` where `action = "create"` and `target_id IS NOT NULL`, deletes those target rows, then marks the session as "reverted".

**Tech Stack:** Next.js App Router Server Actions, Supabase, TypeScript, React state for bulk selection checkboxes

---

### Task 1: CSV export API endpoint

**Goal:** Create a generic `GET /api/export/csv?table=customers` endpoint that returns a CSV file for a given table and company.

**Files:**
- Create: `src/app/api/export/csv/route.ts`

**Acceptance Criteria:**
- [ ] `GET /api/export/csv?table=customers` returns `Content-Type: text/csv` response with all company's customers
- [ ] `GET /api/export/csv?table=leads` returns company's leads
- [ ] `GET /api/export/csv?table=jobs` returns company's jobs
- [ ] `GET /api/export/csv?table=sales` returns company's sales
- [ ] Invalid table name returns HTTP 400
- [ ] Unauthenticated request returns HTTP 401
- [ ] File is named `{table}-export-{YYYY-MM-DD}.csv` via `Content-Disposition` header

**Verify:** `curl "http://localhost:3000/api/export/csv?table=customers" -H "Cookie: ..."` → CSV text with headers row

**Steps:**

- [ ] **Step 1: Read `src/lib/current-company.ts` and `src/lib/supabase/server.ts` to understand auth pattern**

```bash
cat src/lib/current-company.ts
```

- [ ] **Step 2: Create `src/app/api/export/csv/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

const ALLOWED_TABLES = ["customers", "leads", "jobs", "sales", "follow_ups"] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

function isAllowedTable(value: string): value is AllowedTable {
  return ALLOWED_TABLES.includes(value as AllowedTable);
}

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? "");
          return val.includes(",") || val.includes('"') || val.includes("\n")
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        })
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export async function GET(request: Request) {
  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const table = url.searchParams.get("table") ?? "";

  if (!isAllowedTable(table)) {
    return NextResponse.json(
      { error: "Invalid table. Allowed: customers, leads, jobs, sales, follow_ups" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("company_id", companyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const csv = rowsToCsv((data ?? []) as Record<string, unknown>[]);
  const date = new Date().toISOString().split("T")[0];
  const filename = `${table}-export-${date}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/export/csv/route.ts
git commit -m "feat: add CSV export API endpoint for customers/leads/jobs/sales"
```

---

### Task 2: Export button on list pages

**Goal:** Add an "Export CSV" button to the Customers, Leads, Jobs, and Sales list pages that triggers a file download.

**Files:**
- Modify: `src/features/customers/components/CustomersPage.tsx` (or equivalent list component)
- Modify: `src/features/leads/components/LeadsPage.tsx`
- Modify: `src/features/jobs/components/JobsPage.tsx`
- Modify: `src/features/sales/components/SalesPage.tsx`

**Acceptance Criteria:**
- [ ] Each list page has an "Export CSV" button in the page header area
- [ ] Clicking the button triggers a browser file download of the CSV
- [ ] Button is a plain `<a>` tag pointing to `/api/export/csv?table={tableName}` with `download` attribute

**Verify:** Click "Export CSV" on Customers page → browser downloads `customers-export-{date}.csv`

**Steps:**

- [ ] **Step 1: Find the list page components**

```bash
find src/features -name "*.tsx" | xargs grep -l "CustomersPage\|LeadsPage\|JobsPage\|SalesPage" | head -20
```

- [ ] **Step 2: Add export button to each page header**

In each page component, find the page header area (usually contains the page title and an "Add New" button). Add alongside existing buttons:

```tsx
<a
  href="/api/export/csv?table=customers"
  download
  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
>
  Export CSV
</a>
```

Replace `table=customers` with the appropriate table name for each page.

- [ ] **Step 3: Commit**

```bash
git add src/features/customers/components/ src/features/leads/components/ src/features/jobs/components/ src/features/sales/components/
git commit -m "feat: add Export CSV button to list pages"
```

---

### Task 3: Bulk select and delete on Customers page

**Goal:** Add checkboxes to the Customers table that allow selecting multiple rows, then bulk-deleting them via a Server Action.

**Files:**
- Modify: `src/features/customers/components/CustomersPage.tsx` (or the table component within it)
- Create: `src/features/customers/actions.ts` (if it doesn't exist — add `bulkDeleteCustomers`)

**Acceptance Criteria:**
- [ ] Each customer row has a checkbox
- [ ] "Select all" checkbox in table header selects/deselects all visible rows
- [ ] When 1+ rows selected, a "Delete selected ({n})" button appears
- [ ] Clicking delete calls Server Action and refreshes the list
- [ ] Deleted customers are removed from the DB (soft or hard delete, matching existing pattern)

**Verify:** Select 3 customers → click "Delete selected (3)" → customers disappear from list without page reload

**Steps:**

- [ ] **Step 1: Read the existing customers feature files**

```bash
find src/features/customers -type f | sort
cat src/features/customers/actions.ts 2>/dev/null || echo "no actions file"
```

- [ ] **Step 2: Create/update `src/features/customers/actions.ts` with `bulkDeleteCustomers`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

export async function bulkDeleteCustomers(ids: string[]) {
  if (ids.length === 0) return;
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error("Unauthorized");

  const supabase = await createClient();
  await supabase
    .from("customers")
    .delete()
    .in("id", ids)
    .eq("company_id", companyId);

  revalidatePath("/customers");
}
```

- [ ] **Step 3: Add checkbox state to the customers table component**

Convert the customers list to a `"use client"` component (if it isn't already) or create a `CustomersTableClient.tsx` client wrapper:

```tsx
"use client";
import { useState, useTransition } from "react";
import { bulkDeleteCustomers } from "../actions";

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const toggleAll = () => {
    if (selected.size === customers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(customers.map((c) => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    startTransition(async () => {
      await bulkDeleteCustomers(Array.from(selected));
      setSelected(new Set());
    });
  };

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={handleBulkDelete}
            disabled={isPending}
            className="rounded bg-destructive px-3 py-1 text-sm text-destructive-foreground"
          >
            Delete selected ({selected.size})
          </button>
        </div>
      )}
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selected.size === customers.length && customers.length > 0}
                onChange={toggleAll}
              />
            </th>
            {/* ... existing headers */}
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.has(customer.id)}
                  onChange={() => toggleOne(customer.id)}
                />
              </td>
              {/* ... existing cells */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/customers/
git commit -m "feat: add bulk select and delete to Customers page"
```

---

### Task 4: Bulk status change on Leads page

**Goal:** Add bulk selection and a "Change Status" dropdown to the Leads table, allowing multiple leads to be moved to a new status at once.

**Files:**
- Modify: `src/features/leads/components/LeadsPage.tsx` (or table component)
- Create/Modify: `src/features/leads/actions.ts` (add `bulkUpdateLeadsStatus`)

**Acceptance Criteria:**
- [ ] Leads table has per-row checkboxes and a "select all" checkbox
- [ ] When 1+ rows selected, a status dropdown + "Apply to selected" button appear
- [ ] Clicking Apply calls Server Action and refreshes
- [ ] Status values in dropdown match existing lead statuses from the DB schema

**Verify:** Select 2 leads → choose "Qualified" → click Apply → both leads show "Qualified" status

**Steps:**

- [ ] **Step 1: Read leads feature files and find valid status values**

```bash
find src/features/leads -type f | sort
cat src/types/db.ts | grep -A 20 "leads:"
```

- [ ] **Step 2: Create `bulkUpdateLeadsStatus` server action**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

export async function bulkUpdateLeadsStatus(ids: string[], status: string) {
  if (ids.length === 0) return;
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error("Unauthorized");

  const supabase = await createClient();
  await supabase
    .from("leads")
    .update({ status })
    .in("id", ids)
    .eq("company_id", companyId);

  revalidatePath("/leads");
}
```

- [ ] **Step 3: Add bulk selection + status dropdown UI to Leads table**

Follow the same checkbox pattern as Task 3. Add a `<select>` for status alongside the delete button:

```tsx
const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"];

{selected.size > 0 && (
  <div className="mb-2 flex items-center gap-2">
    <select
      value={bulkStatus}
      onChange={(e) => setBulkStatus(e.target.value)}
      className="rounded border border-border px-2 py-1 text-sm"
    >
      <option value="">Change status to…</option>
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
    <button
      onClick={handleBulkStatusChange}
      disabled={isPending || !bulkStatus}
      className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
    >
      Apply to selected ({selected.size})
    </button>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/leads/
git commit -m "feat: add bulk status change to Leads page"
```

---

### Task 5: Import session revert

**Goal:** Allow users to undo an import by deleting all records that were created by that session, using `import_session_rows` to identify them.

**Files:**
- Create/Modify: `src/features/imports/actions.ts` (add `revertImportSession`)
- Modify: `src/features/imports/components/` — add "Revert" button to import session detail or list

**Acceptance Criteria:**
- [ ] `revertImportSession(sessionId)` Server Action exists
- [ ] Action reads `import_session_rows` where `session_id = sessionId`, `action = "create"`, `target_id IS NOT NULL`
- [ ] For each such row, deletes the record from `target_table` by `target_id`
- [ ] Updates `import_sessions.status` to `"reverted"` after deletion
- [ ] `revalidatePath("/imports")` is called
- [ ] "Revert" button is visible on the import session list or detail view, disabled if status is already "reverted"

**Verify:** Import a CSV of 5 customers → click Revert → all 5 customers are deleted, session shows "reverted"

**Steps:**

- [ ] **Step 1: Confirm import_session_rows schema**

```bash
cat src/types/db.ts | grep -A 30 "import_session_rows"
```

- [ ] **Step 2: Create `revertImportSession` Server Action**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

export async function revertImportSession(sessionId: string) {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error("Unauthorized");

  const supabase = await createClient();

  // Verify session belongs to this company
  const { data: session } = await supabase
    .from("import_sessions")
    .select("id, status, company_id")
    .eq("id", sessionId)
    .eq("company_id", companyId)
    .single();

  if (!session) throw new Error("Import session not found");
  if (session.status === "reverted") return;

  // Get all created records
  const { data: rows } = await supabase
    .from("import_session_rows")
    .select("target_table, target_id")
    .eq("session_id", sessionId)
    .eq("action", "create")
    .not("target_id", "is", null);

  if (rows && rows.length > 0) {
    // Group by target_table for efficient batch deletes
    const byTable = rows.reduce<Record<string, string[]>>((acc, row) => {
      const t = row.target_table as string;
      if (!acc[t]) acc[t] = [];
      acc[t].push(row.target_id as string);
      return acc;
    }, {});

    for (const [table, ids] of Object.entries(byTable)) {
      await supabase.from(table as never).delete().in("id", ids);
    }
  }

  await supabase
    .from("import_sessions")
    .update({ status: "reverted" })
    .eq("id", sessionId);

  revalidatePath("/imports");
}
```

- [ ] **Step 3: Add Revert button to import session UI**

Find the import sessions list component. Add a form/button for each session:

```tsx
import { revertImportSession } from "../actions";

// Inside session row:
<form action={revertImportSession.bind(null, session.id)}>
  <button
    type="submit"
    disabled={session.status === "reverted"}
    className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50"
  >
    {session.status === "reverted" ? "Reverted" : "Revert"}
  </button>
</form>
```

- [ ] **Step 4: Commit**

```bash
git add src/features/imports/
git commit -m "feat: add import session revert via import_session_rows target tracking"
```

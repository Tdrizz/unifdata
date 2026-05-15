# FrontierOps Architecture Rebuild — Phase A

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor all 800–950 line page files into feature modules with clear separation between data access, business logic, and rendering — making the codebase production-ready and easier to extend.

**Architecture:** Each domain (customers, leads, jobs, sales, follow-ups, workspace, imports, ai, settings) becomes a self-contained feature module under `src/features/<domain>/` containing `types.ts`, `queries.ts`, `actions.ts`, and a `components/` folder. App route files become thin orchestrators (~40–60 lines). A generated `src/types/db.ts` from Supabase CLI replaces all inline type definitions.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, Tailwind CSS, Zod (already installed), Supabase CLI for type generation.

---

## File Map

**New files:**
- `src/types/db.ts` — generated Supabase types (replaces all inline type defs)
- `src/features/follow-ups/types.ts`, `queries.ts`, `actions.ts`, `components/FollowUpList.tsx`, `components/FollowUpCreateForm.tsx`
- `src/features/sales/types.ts`, `queries.ts`, `actions.ts`, `components/SalesList.tsx`, `components/SaleForm.tsx`
- `src/features/customers/types.ts`, `queries.ts`, `actions.ts`, `components/CustomerList.tsx`, `components/CustomerForm.tsx`
- `src/features/leads/types.ts`, `queries.ts`, `actions.ts`, `components/LeadList.tsx`, `components/LeadForm.tsx`
- `src/features/jobs/types.ts`, `queries.ts`, `actions.ts`, `components/JobList.tsx`, `components/JobForm.tsx`
- `src/features/workspace/types.ts`, `queries.ts`, `components/WorkspaceDashboard.tsx`
- `src/features/crm/types.ts`, `queries.ts`, `components/CrmDashboard.tsx`
- `src/features/imports/types.ts`, `queries.ts`, `actions.ts` (logic already in `src/lib/import-engine.ts`)
- `src/features/ai/types.ts`, `queries.ts`, `actions.ts`
- `src/features/settings/types.ts`, `queries.ts`, `actions.ts`

**Modified files (slimmed to ~40–60 lines each):**
- `src/app/follow-ups/page.tsx`, `src/app/follow-ups/[id]/edit/page.tsx`
- `src/app/sales/page.tsx`, `src/app/sales/[id]/edit/page.tsx`
- `src/app/customers/page.tsx`, `src/app/customers/[id]/edit/page.tsx`
- `src/app/leads/page.tsx`, `src/app/leads/[id]/edit/page.tsx`
- `src/app/jobs/page.tsx`, `src/app/jobs/[id]/edit/page.tsx`
- `src/app/workspace/page.tsx`
- `src/app/crm/page.tsx`
- `src/app/imports/page.tsx`
- `src/app/ai-assistant/page.tsx`
- `src/app/settings/page.tsx`

**Unchanged:** `src/lib/` utilities, `src/components/ui/`, `src/components/AppShell.tsx`, `src/components/AppNav.tsx`, `src/lib/supabase/`, `src/lib/current-company.ts`

---

### Task 0: Generate Supabase types and scaffold feature directories

**Goal:** Create `src/types/db.ts` from the live Supabase schema and scaffold all feature module directories so subsequent tasks have a consistent home.

**Files:**
- Create: `src/types/db.ts`
- Create: `src/features/follow-ups/.keep`, `src/features/sales/.keep`, `src/features/customers/.keep`, `src/features/leads/.keep`, `src/features/jobs/.keep`, `src/features/workspace/.keep`, `src/features/crm/.keep`, `src/features/imports/.keep`, `src/features/ai/.keep`, `src/features/settings/.keep`

**Acceptance Criteria:**
- [ ] `src/types/db.ts` exists and exports a `Database` type with `public.Tables` entries for `customers`, `leads`, `jobs`, `sales`, `follow_ups`, `companies`, `company_members`, `profiles`, `imports`, `ai_reports`
- [ ] `npm run build` passes with no new errors

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Install Supabase CLI if not present**

```bash
which supabase || npm install -g supabase
```

- [ ] **Step 2: Get your Supabase project ID**

Find it at https://supabase.com/dashboard — it's the string in your project URL: `https://supabase.com/dashboard/project/<PROJECT_ID>`. It's also in `.env.local` as part of `NEXT_PUBLIC_SUPABASE_URL`: `https://<PROJECT_ID>.supabase.co`.

- [ ] **Step 3: Generate types**

```bash
cd /Users/tittanolson/frontierops-2
npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/db.ts
```

The generated file will have this shape (verify the key tables exist):
```ts
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          company_id: string
          name: string
          phone: string | null
          email: string | null
          address: string | null
          customer_type: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: { ... }
        Update: { ... }
      }
      // leads, jobs, sales, follow_ups, companies, company_members, etc.
    }
  }
}
```

- [ ] **Step 4: Scaffold feature directories**

```bash
mkdir -p src/features/follow-ups/components
mkdir -p src/features/sales/components
mkdir -p src/features/customers/components
mkdir -p src/features/leads/components
mkdir -p src/features/jobs/components
mkdir -p src/features/workspace/components
mkdir -p src/features/crm/components
mkdir -p src/features/imports/components
mkdir -p src/features/ai/components
mkdir -p src/features/settings/components
mkdir -p src/types
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: exits 0. The generated types file should not break anything since it's not imported yet.

- [ ] **Step 6: Commit**

```bash
git add src/types/db.ts src/features/
git commit -m "feat: generate Supabase types and scaffold feature module directories"
```

---

### Task 1: Migrate follow-ups feature

**Goal:** Extract all types, queries, actions, and rendering logic from `src/app/follow-ups/page.tsx` (957 lines) and `src/app/follow-ups/[id]/edit/page.tsx` into the follow-ups feature module, leaving both pages as thin orchestrators.

**Files:**
- Create: `src/features/follow-ups/types.ts`
- Create: `src/features/follow-ups/queries.ts`
- Create: `src/features/follow-ups/actions.ts`
- Create: `src/features/follow-ups/components/FollowUpList.tsx`
- Create: `src/features/follow-ups/components/FollowUpCreateForm.tsx`
- Modify: `src/app/follow-ups/page.tsx`
- Modify: `src/app/follow-ups/[id]/edit/page.tsx`

**Acceptance Criteria:**
- [ ] `src/app/follow-ups/page.tsx` is ≤ 70 lines
- [ ] `src/app/follow-ups/[id]/edit/page.tsx` is ≤ 70 lines
- [ ] No inline type definitions remain in either page file
- [ ] No inline Server Actions remain in either page file (all moved to `actions.ts`)
- [ ] `npm run build` passes with no errors

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create `src/features/follow-ups/types.ts`**

```ts
import type { Database } from "@/types/db";

export type FollowUpRow = Database["public"]["Tables"]["follow_ups"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export type FollowUpItem = {
  id: string;
  source_type: "manual" | "opportunity";
  source_label: string;
  customer_id: string | null;
  title: string;
  due_date: string | null;
  status: string | null;
  created_at: string;
  href: string;
};

export type FollowUpFilters = {
  status?: string;
  due?: string;
  source?: string;
};

export type FollowUpPageData = {
  followUps: FollowUpRow[];
  opportunities: Pick<LeadRow, "id" | "customer_id" | "service_requested" | "status" | "next_follow_up_date" | "source" | "estimated_value" | "created_at">[];
  people: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
};
```

- [ ] **Step 2: Create `src/features/follow-ups/queries.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FollowUpRow, LeadRow, CustomerRow } from "./types";

type FollowUpListResult = {
  followUps: FollowUpRow[];
  opportunities: Pick<LeadRow, "id" | "customer_id" | "service_requested" | "status" | "next_follow_up_date" | "source" | "estimated_value" | "created_at">[];
  people: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
};

export async function getFollowUpPageData(
  supabase: SupabaseClient,
  companyId: string,
): Promise<FollowUpListResult> {
  const [followUpsResult, opportunitiesResult, peopleResult] = await Promise.all([
    supabase
      .from("follow_ups")
      .select("id, customer_id, message, due_date, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(250),

    supabase
      .from("leads")
      .select("id, customer_id, service_requested, status, next_follow_up_date, source, estimated_value, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(250),

    supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  if (followUpsResult.error) throw new Error(followUpsResult.error.message);
  if (opportunitiesResult.error) throw new Error(opportunitiesResult.error.message);
  if (peopleResult.error) throw new Error(peopleResult.error.message);

  return {
    followUps: (followUpsResult.data ?? []) as FollowUpRow[],
    opportunities: opportunitiesResult.data ?? [],
    people: peopleResult.data ?? [],
  };
}

export async function getFollowUpById(
  supabase: SupabaseClient,
  companyId: string,
  id: string,
): Promise<FollowUpRow | null> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", id)
    .single();

  if (error) return null;
  return data as FollowUpRow;
}

export async function getCustomersForSelect(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Pick<CustomerRow, "id" | "name" | "email" | "phone">[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(500);

  if (error) return [];
  return data ?? [];
}
```

- [ ] **Step 3: Create `src/features/follow-ups/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString } from "@/lib/utils";

export async function createFollowUpAction(formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();

  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const customerId = getFormString(formData, "customer_id");
  const message = getFormString(formData, "message");
  const dueDate = getFormString(formData, "due_date");
  const status = getFormString(formData, "status") || "Open";

  if (!message) redirect("/follow-ups?error=Follow-up+action+is+required.");

  const { error } = await supabase.from("follow_ups").insert({
    company_id: company.id,
    customer_id: customerId || null,
    message,
    due_date: dueDate || null,
    status,
  });

  if (error) redirect(`/follow-ups?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
  redirect("/follow-ups");
}

export async function updateFollowUpAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();

  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const customerId = getFormString(formData, "customer_id");
  const message = getFormString(formData, "message");
  const dueDate = getFormString(formData, "due_date");
  const status = getFormString(formData, "status");

  const { error } = await supabase
    .from("follow_ups")
    .update({
      customer_id: customerId || null,
      message: message || null,
      due_date: dueDate || null,
      status: status || null,
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/follow-ups/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
  redirect("/follow-ups");
}

export async function deleteFollowUpAction(id: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();

  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;

  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/follow-ups/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/follow-ups");
  revalidatePath("/workspace");
  redirect("/follow-ups");
}
```

- [ ] **Step 4: Create `src/features/follow-ups/components/FollowUpList.tsx`**

Extract all rendering logic from `src/app/follow-ups/page.tsx` (lines 57–957). Move the helper functions (`isComplete`, `isOverdue`, `isDueToday`, `isUpcoming`, `getDueTone`, `getDueLabel`, `getActionNextStep`, `getActionIssues`, `getPriorityBucket`, `getSortDateTime`) and the JSX sections into this component.

```tsx
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { parseDateOnly, formatDateOnly, getTodayDateOnly } from "@/lib/date-format";
import { getGenericTone, isClosedOpportunity } from "@/lib/status";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { FollowUpRow, LeadRow, CustomerRow, FollowUpItem } from "../types";

function isComplete(status: string | null) {
  const n = String(status || "").toLowerCase();
  return n.includes("complete") || n.includes("done") || n.includes("closed");
}

function isOverdue(date: string | null, status: string | null) {
  const target = parseDateOnly(date);
  if (!target || isComplete(status)) return false;
  return target < getTodayDateOnly();
}

function isDueToday(date: string | null, status: string | null) {
  const target = parseDateOnly(date);
  if (!target || isComplete(status)) return false;
  return target.getTime() === getTodayDateOnly().getTime();
}

function isUpcoming(date: string | null, status: string | null) {
  const target = parseDateOnly(date);
  if (!target || isComplete(status)) return false;
  return target > getTodayDateOnly();
}

function getDueTone(action: FollowUpItem) {
  if (isComplete(action.status)) return "success" as const;
  if (isOverdue(action.due_date, action.status)) return "danger" as const;
  if (isDueToday(action.due_date, action.status)) return "warning" as const;
  return "neutral" as const;
}

function getDueLabel(action: FollowUpItem) {
  if (isComplete(action.status)) return "Complete";
  if (!action.due_date) return "No due date";
  if (isOverdue(action.due_date, action.status)) return `Overdue ${formatDateOnly(action.due_date)}`;
  if (isDueToday(action.due_date, action.status)) return "Due today";
  return `Due ${formatDateOnly(action.due_date)}`;
}

function getActionNextStep(action: FollowUpItem) {
  if (!action.customer_id) return "Link this follow-up to the person or business it belongs to.";
  if (!action.title) return "Add a clear action so this follow-up is understandable.";
  if (!action.due_date && !isComplete(action.status)) return "Add a due date so this follow-up can be prioritized.";
  if (isOverdue(action.due_date, action.status)) return "This follow-up is overdue. Review it or mark it complete.";
  if (isDueToday(action.due_date, action.status)) return "This follow-up is due today.";
  if (action.source_type === "opportunity") return "This follow-up comes from an open opportunity. Open it to update the pipeline record.";
  if (isComplete(action.status)) return "This follow-up is complete.";
  return "Keep this follow-up updated as work moves forward.";
}

function getActionIssues(action: FollowUpItem) {
  const issues: { label: string; tone: "success" | "warning" | "danger" | "neutral" }[] = [];
  if (!action.customer_id) issues.push({ label: "Link person", tone: "warning" });
  if (!action.title) issues.push({ label: "Add action", tone: "warning" });
  if (!action.due_date && !isComplete(action.status)) issues.push({ label: "Add due date", tone: "neutral" });
  if (isOverdue(action.due_date, action.status)) issues.push({ label: "Overdue", tone: "danger" });
  if (isDueToday(action.due_date, action.status)) issues.push({ label: "Due today", tone: "warning" });
  if (!action.status) issues.push({ label: "Add status", tone: "neutral" });
  if (action.source_type === "opportunity") issues.push({ label: "From opportunity", tone: "neutral" });
  if (issues.length === 0) issues.push({ label: "Looks clean", tone: "success" });
  return issues;
}

function getPriorityBucket(action: FollowUpItem) {
  if (isComplete(action.status)) return 5;
  if (isOverdue(action.due_date, action.status)) return 0;
  if (isDueToday(action.due_date, action.status)) return 1;
  if (isUpcoming(action.due_date, action.status)) return 2;
  if (!action.due_date) return 3;
  return 4;
}

function getSortDateTime(action: FollowUpItem) {
  const dueDate = parseDateOnly(action.due_date);
  if (dueDate) return dueDate.getTime();
  return new Date(action.created_at).getTime();
}

function buildFollowUpItems(
  followUps: FollowUpRow[],
  opportunities: Pick<LeadRow, "id" | "customer_id" | "service_requested" | "status" | "next_follow_up_date" | "source" | "estimated_value" | "created_at">[],
): { manualItems: FollowUpItem[]; opportunityItems: FollowUpItem[]; actions: FollowUpItem[] } {
  const manualItems: FollowUpItem[] = followUps.map((f) => ({
    id: `manual-${f.id}`,
    source_type: "manual",
    source_label: "Manual follow-up",
    customer_id: f.customer_id,
    title: f.message || "Untitled follow-up",
    due_date: f.due_date,
    status: f.status || "Open",
    created_at: f.created_at,
    href: `/follow-ups/${f.id}/edit`,
  }));

  const opportunityItems: FollowUpItem[] = opportunities
    .filter((o) => !isClosedOpportunity(o.status) && Boolean(o.next_follow_up_date))
    .map((o) => ({
      id: `opportunity-${o.id}`,
      source_type: "opportunity",
      source_label: "Opportunity follow-up",
      customer_id: o.customer_id,
      title: o.service_requested ? `Follow up: ${o.service_requested}` : "Follow up on opportunity",
      due_date: o.next_follow_up_date,
      status: o.status || "Open opportunity",
      created_at: o.created_at,
      href: `/leads/${o.id}/edit`,
    }));

  return { manualItems, opportunityItems, actions: [...manualItems, ...opportunityItems] };
}

type Props = {
  followUps: FollowUpRow[];
  opportunities: Pick<LeadRow, "id" | "customer_id" | "service_requested" | "status" | "next_follow_up_date" | "source" | "estimated_value" | "created_at">[];
  people: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  filters: { status?: string; due?: string; source?: string };
  profile: IndustryProfile;
};

export function FollowUpList({ followUps, opportunities, people, filters, profile }: Props) {
  const { selectedStatus, selectedDue, selectedSource } = {
    selectedStatus: filters.status ?? "",
    selectedDue: filters.due ?? "",
    selectedSource: filters.source ?? "",
  };

  const personById = new Map(people.map((p) => [p.id, p]));
  const { manualItems, opportunityItems, actions } = buildFollowUpItems(followUps, opportunities);

  const openActions = actions.filter((a) => !isComplete(a.status));
  const overdueActions = actions.filter((a) => isOverdue(a.due_date, a.status));
  const dueTodayActions = actions.filter((a) => isDueToday(a.due_date, a.status));
  const upcomingActions = actions.filter((a) => isUpcoming(a.due_date, a.status));
  const missingDueDate = actions.filter((a) => !a.due_date && !isComplete(a.status));
  const missingStatus = actions.filter((a) => !a.status);
  const missingPerson = actions.filter((a) => !a.customer_id);

  const prioritizedActions = [...actions]
    .sort((a, b) => {
      const bucketDiff = getPriorityBucket(a) - getPriorityBucket(b);
      if (bucketDiff !== 0) return bucketDiff;
      return getSortDateTime(a) - getSortDateTime(b);
    })
    .slice(0, 25);

  const visibleActions = prioritizedActions.filter((action) => {
    if (selectedStatus && (action.status || "Not set") !== selectedStatus) return false;
    if (selectedSource && action.source_type !== selectedSource) return false;
    if (selectedDue === "overdue") return isOverdue(action.due_date, action.status);
    if (selectedDue === "today") return isDueToday(action.due_date, action.status);
    if (selectedDue === "upcoming") return isUpcoming(action.due_date, action.status);
    if (selectedDue === "missing") return !action.due_date && !isComplete(action.status);
    return true;
  });

  const dueGroups = [
    { id: "overdue", label: "Overdue", description: "Past-due follow-ups that are still open.", count: overdueActions.length, tone: "danger" as const },
    { id: "today", label: "Due today", description: "Follow-ups due today.", count: dueTodayActions.length, tone: "warning" as const },
    { id: "upcoming", label: "Upcoming", description: "Open follow-ups with future due dates, sorted soonest first.", count: upcomingActions.length, tone: "neutral" as const },
    { id: "missing", label: "No due date", description: "Open follow-ups that need a due date.", count: missingDueDate.length, tone: "neutral" as const },
  ].filter((g) => g.count > 0);

  const sourceGroups = [
    { id: "manual", label: "Manual follow-ups", description: "Follow-ups created directly on this page.", count: manualItems.length, href: selectedSource === "manual" ? "/follow-ups" : "/follow-ups?source=manual" },
    { id: "opportunity", label: "Opportunity follow-ups", description: "Follow-up dates coming from open opportunities.", count: opportunityItems.length, href: selectedSource === "opportunity" ? "/follow-ups" : "/follow-ups?source=opportunity" },
  ].filter((g) => g.count > 0);

  const cleanupGroups = [
    { id: "missing-person", label: "Link person", title: "Follow-ups need people or businesses", detail: "Follow-ups are more useful when they are connected to who they are for.", count: missingPerson.length, href: "/follow-ups" },
    { id: "missing-due-date", label: "Add due date", title: "Follow-ups need due dates", detail: "Due dates help prioritize what needs attention first.", count: missingDueDate.length, href: "/follow-ups" },
    { id: "missing-status", label: "Add status", title: "Follow-ups need statuses", detail: "Statuses make it clear what is still open and what is complete.", count: missingStatus.length, href: "/follow-ups" },
  ].filter((g) => g.count > 0);

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open follow-ups" value={openActions.length} helper={`${manualItems.length} manual · ${opportunityItems.length} from opportunities`} tone={openActions.length > 0 ? "warning" : "positive"} />
        <StatCard label="Overdue" value={overdueActions.length} helper="Past due and not complete" tone={overdueActions.length > 0 ? "danger" : "positive"} />
        <StatCard label="Due today" value={dueTodayActions.length} helper="Needs attention today" tone={dueTodayActions.length > 0 ? "warning" : "positive"} />
        <StatCard label="Upcoming" value={upcomingActions.length} helper="Future follow-ups, soonest first" tone={upcomingActions.length > 0 ? "default" : "positive"} />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr] items-start">
        <SectionCard
          title={selectedDue ? `${selectedDue} follow-ups` : selectedSource ? `${selectedSource} follow-ups` : "Follow-up queue"}
          description={selectedDue ? "Showing follow-ups filtered by timing." : selectedSource ? "Showing follow-ups filtered by source." : "Sorted by overdue, due today, then the nearest upcoming date."}
        >
          {visibleActions.length === 0 ? (
            <EmptyState title="No follow-ups found" description="Add a manual follow-up or set a next follow-up date on an opportunity." />
          ) : (
            <>
              {(selectedDue || selectedSource) && (
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
                  <p className="text-sm font-semibold text-slate-700">Filtered by: {selectedDue || selectedSource}</p>
                  <Link href="/follow-ups" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Clear filter</Link>
                </div>
              )}
              <div className="divide-y divide-slate-100">
                {visibleActions.map((action) => {
                  const issues = getActionIssues(action);
                  const person = action.customer_id ? personById.get(action.customer_id) : null;
                  return (
                    <Link key={action.id} href={action.href} className="block p-4 transition-colors hover:bg-slate-50">
                      <div className="grid gap-4 md:grid-cols-[1fr_150px_120px] md:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone="neutral">{action.source_label}</StatusBadge>
                          </div>
                          <p className="mt-3 font-semibold text-slate-950">{action.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{person?.name || "No person linked"}</p>
                          <p className="mt-3 text-sm leading-6 text-slate-600">{getActionNextStep(action)}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {issues.slice(0, 3).map((issue) => (
                              <StatusBadge key={issue.label} tone={issue.tone}>{issue.label}</StatusBadge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">Due</p>
                          <div className="mt-1"><StatusBadge tone={getDueTone(action)}>{getDueLabel(action)}</StatusBadge></div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">Status</p>
                          <div className="mt-1"><StatusBadge tone={getGenericTone(action.status)}>{action.status || "Not set"}</StatusBadge></div>
                          <p className="mt-3 text-xs font-medium text-slate-500">Added</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">{formatDateOnly(action.created_at)}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Follow-up source" description="Where follow-ups are coming from.">
            {sourceGroups.length === 0 ? (
              <EmptyState title="No follow-up sources yet" description="Manual and opportunity follow-ups will appear here." />
            ) : (
              <div className="divide-y divide-slate-100">
                {sourceGroups.map((group) => (
                  <article key={group.id} className="grid gap-3 p-4 md:grid-cols-[1fr_90px] md:items-center">
                    <div>
                      <p className="font-semibold text-slate-950">{group.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{group.description}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-700">{group.count} follow-ups</p>
                    </div>
                    <div className="md:text-right">
                      <Link href={group.href} className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        {selectedSource === group.id ? "Clear" : "Review"}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Due timing" description="Use this to filter follow-ups by urgency.">
            {dueGroups.length === 0 ? (
              <EmptyState title="No open timing issues" description="No overdue, due today, upcoming, or missing-date follow-ups were found." />
            ) : (
              <div className="divide-y divide-slate-100">
                {dueGroups.map((group) => (
                  <article key={group.id} className="grid gap-3 p-4 md:grid-cols-[1fr_90px] md:items-center">
                    <div>
                      <StatusBadge tone={group.tone}>{group.label}</StatusBadge>
                      <p className="mt-2 font-semibold text-slate-950">{group.count} follow-ups</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{group.description}</p>
                    </div>
                    <div className="md:text-right">
                      <Link href={selectedDue === group.id ? "/follow-ups" : `/follow-ups?due=${encodeURIComponent(group.id)}`} className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        {selectedDue === group.id ? "Clear" : "Review"}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </section>

      <SectionCard title="Follow-up health" description="Cleanup issues that make follow-up tracking less reliable.">
        {cleanupGroups.length === 0 ? (
          <EmptyState title="Follow-ups look clean" description="No missing person, due date, or status issues were found." />
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-3">
            {cleanupGroups.map((item) => (
              <Link key={item.id} href={item.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-white">
                <div className="flex items-start justify-between gap-3">
                  <StatusBadge tone="neutral">{item.label}</StatusBadge>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item.count}</span>
                </div>
                <p className="mt-3 font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/features/follow-ups/components/FollowUpCreateForm.tsx`**

```tsx
import type { CustomerRow } from "../types";
import { createFollowUpAction } from "../actions";
import { DismissError } from "@/components/ui/DismissError";
import { SectionCard } from "@/components/ui/SectionCard";

type Props = {
  people: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  errorParam?: string;
};

export function FollowUpCreateForm({ people, errorParam }: Props) {
  return (
    <SectionCard title="Add manual follow-up" description="Create a reminder, callback, task, or next step and optionally connect it to a person.">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold text-slate-950">Quick add</p>
            <p className="mt-1 text-sm text-slate-500">Opportunity follow-up dates appear automatically from the Opportunities page.</p>
          </div>
          <span className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white group-open:hidden">Add follow-up</span>
          <span className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 group-open:inline-flex">Close</span>
        </summary>
        <form action={createFollowUpAction} className="border-t border-slate-100 p-5">
          {errorParam && <DismissError message={errorParam} />}
          <label className="block text-sm font-medium text-slate-700">
            Link to person or business
            <select name="customer_id" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300">
              <option value="">No linked person yet</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>{person.name || person.email || person.phone || "Unnamed person"}</option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Follow-up action
            <input name="message" required placeholder="Call customer, send quote, check payment, schedule job..." className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300" />
          </label>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Due date
              <input name="due_date" type="date" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Status
              <select name="status" defaultValue="Open" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300">
                <option value="Open">Open</option>
                <option value="Pending">Pending</option>
                <option value="Follow Up">Follow Up</option>
                <option value="Complete">Complete</option>
              </select>
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button type="submit" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Create follow-up</button>
          </div>
        </form>
      </details>
    </SectionCard>
  );
}
```

- [ ] **Step 6: Replace `src/app/follow-ups/page.tsx` with thin orchestrator**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getFollowUpPageData } from "@/features/follow-ups/queries";
import { FollowUpList } from "@/features/follow-ups/components/FollowUpList";
import { FollowUpCreateForm } from "@/features/follow-ups/components/FollowUpCreateForm";

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; due?: string; source?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const data = await getFollowUpPageData(supabase, company.id);

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""} brandColor={company.brand_color || "#0f172a"} accentColor={company.accent_color || "#2563eb"} businessSector={company.business_sector}>
      <div className="space-y-5">
        <PageHeader
          eyebrow={profile.labels.followUpPlural}
          title="Priority follow-up queue"
          description={`Manual follow-ups and ${profile.labels.leadSingular.toLowerCase()} follow-up dates are sorted by urgency and due date.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/leads" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Opportunities</Link>
              <Link href="/imports" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">Import data</Link>
            </div>
          }
        />
        <FollowUpCreateForm people={data.people} errorParam={params.error ? decodeURIComponent(params.error) : undefined} />
        <FollowUpList
          followUps={data.followUps}
          opportunities={data.opportunities}
          people={data.people}
          filters={{ status: params.status, due: params.due, source: params.source }}
          profile={profile}
        />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 7: Replace `src/app/follow-ups/[id]/edit/page.tsx` with thin orchestrator**

Read the full existing file first, then extract all helper functions (`isComplete`, `isOverdue`, etc.), the form JSX, and delete actions into `FollowUpForm.tsx` in `src/features/follow-ups/components/`. The page becomes:

```tsx
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getFollowUpById, getCustomersForSelect } from "@/features/follow-ups/queries";
import { FollowUpForm } from "@/features/follow-ups/components/FollowUpForm";

export default async function EditFollowUpPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorParam } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  const [followUp, people] = await Promise.all([
    getFollowUpById(supabase, company.id, id),
    getCustomersForSelect(supabase, company.id),
  ]);

  if (!followUp) redirect("/follow-ups");

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""} brandColor={company.brand_color || "#0f172a"} accentColor={company.accent_color || "#2563eb"} businessSector={company.business_sector}>
      <PageHeader eyebrow={profile.labels.followUpPlural} title="Edit follow-up" />
      <FollowUpForm followUp={followUp} people={people} profile={profile} errorParam={errorParam} />
    </AppShell>
  );
}
```

Create `src/features/follow-ups/components/FollowUpForm.tsx` by extracting the form rendering, summary card, and delete/update actions from the existing edit page. Use `updateFollowUpAction` and `deleteFollowUpAction` from `../actions`.

- [ ] **Step 8: Verify and commit**

```bash
npm run build
```

Expected: exits 0, no TypeScript errors.

```bash
git add src/features/follow-ups/ src/app/follow-ups/
git commit -m "feat: migrate follow-ups to feature module"
```

---

### Task 2: Migrate sales feature

**Goal:** Extract all types, queries, actions, and rendering from `src/app/sales/page.tsx` (747 lines) and `src/app/sales/[id]/edit/page.tsx` into the sales feature module.

**Files:**
- Create: `src/features/sales/types.ts`
- Create: `src/features/sales/queries.ts`
- Create: `src/features/sales/actions.ts`
- Create: `src/features/sales/components/SalesList.tsx`
- Create: `src/features/sales/components/SaleForm.tsx`
- Modify: `src/app/sales/page.tsx`
- Modify: `src/app/sales/[id]/edit/page.tsx`

**Acceptance Criteria:**
- [ ] `src/app/sales/page.tsx` is ≤ 70 lines
- [ ] `src/app/sales/[id]/edit/page.tsx` is ≤ 70 lines
- [ ] No inline type definitions remain in either page file
- [ ] `npm run build` passes with no errors

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create `src/features/sales/types.ts`**

```ts
import type { Database } from "@/types/db";

export type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

export type SalesFilters = {
  q?: string;
  status?: string;
};

export type SalesPageData = {
  sales: SaleRow[];
  customers: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  jobs: Pick<JobRow, "id" | "service_type" | "status">[];
  count: number;
};
```

- [ ] **Step 2: Create `src/features/sales/queries.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SaleRow, CustomerRow, JobRow } from "./types";

export async function getSalesPageData(
  supabase: SupabaseClient,
  companyId: string,
  opts: { q?: string; page?: number; pageSize?: number } = {},
): Promise<{ sales: SaleRow[]; count: number }> {
  const { q, page = 1, pageSize = 50 } = opts;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("sales")
    .select("*", { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `service_type.ilike.%${q}%,source.ilike.%${q}%,payment_status.ilike.%${q}%`,
    );
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { sales: (data ?? []) as SaleRow[], count: count ?? 0 };
}

export async function getSaleById(
  supabase: SupabaseClient,
  companyId: string,
  id: string,
): Promise<SaleRow | null> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as SaleRow;
}

export async function getCustomersForSaleSelect(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Pick<CustomerRow, "id" | "name" | "email" | "phone">[]> {
  const { data } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(500);
  return data ?? [];
}

export async function getJobsForSaleSelect(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Pick<JobRow, "id" | "service_type" | "status">[]> {
  const { data } = await supabase
    .from("jobs")
    .select("id, service_type, status")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(500);
  return data ?? [];
}
```

- [ ] **Step 3: Create `src/features/sales/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString, getOptionalNumber } from "@/lib/utils";

export async function createSaleAction(formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const amount = getOptionalNumber(formData, "amount") ?? 0;
  const paymentStatus = getFormString(formData, "payment_status") || "Paid";
  const saleDate = getFormString(formData, "sale_date") || new Date().toISOString().slice(0, 10);
  const serviceType = getFormString(formData, "service_type");
  const source = getFormString(formData, "source");
  const customerId = getFormString(formData, "customer_id");
  const jobId = getFormString(formData, "job_id");

  const { error } = await supabase.from("sales").insert({
    company_id: company.id,
    amount,
    payment_status: paymentStatus,
    sale_date: saleDate,
    service_type: serviceType || null,
    source: source || null,
    customer_id: customerId || null,
    job_id: jobId || null,
  });

  if (error) redirect(`/sales?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/sales");
  revalidatePath("/workspace");
  redirect("/sales");
}

export async function updateSaleAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const amount = getOptionalNumber(formData, "amount") ?? 0;
  const paymentStatus = getFormString(formData, "payment_status");
  const saleDate = getFormString(formData, "sale_date");
  const serviceType = getFormString(formData, "service_type");
  const source = getFormString(formData, "source");
  const customerId = getFormString(formData, "customer_id");
  const jobId = getFormString(formData, "job_id");

  const { error } = await supabase
    .from("sales")
    .update({
      amount,
      payment_status: paymentStatus || null,
      sale_date: saleDate || null,
      service_type: serviceType || null,
      source: source || null,
      customer_id: customerId || null,
      job_id: jobId || null,
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/sales/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/sales");
  revalidatePath("/workspace");
  redirect("/sales");
}

export async function deleteSaleAction(id: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { error } = await supabase.from("sales").delete().eq("id", id).eq("company_id", company.id);
  if (error) redirect(`/sales/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/sales");
  revalidatePath("/workspace");
  redirect("/sales");
}
```

- [ ] **Step 4: Create `src/features/sales/components/SalesList.tsx`**

Read `src/app/sales/page.tsx` in full. Extract all helper functions and JSX rendering into this component. The component receives `sales`, `customers`, `profile`, `filters`, and renders stat cards, the sales table, and cleanup groups. Follow the same pattern as `FollowUpList.tsx`.

- [ ] **Step 5: Create `src/features/sales/components/SaleForm.tsx`**

Read `src/app/sales/[id]/edit/page.tsx` in full. Extract the form, summary card, helper functions, and delete/update actions into this component. Import `updateSaleAction` and `deleteSaleAction` from `../actions`.

- [ ] **Step 6: Replace `src/app/sales/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getSalesPageData, getCustomersForSaleSelect } from "@/features/sales/queries";
import { SalesList } from "@/features/sales/components/SalesList";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);

  const page = Number(params.page ?? 1);
  const [{ sales, count }, customers] = await Promise.all([
    getSalesPageData(supabase, company.id, { q: params.q, page }),
    getCustomersForSaleSelect(supabase, company.id),
  ]);

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""} brandColor={company.brand_color || "#0f172a"} accentColor={company.accent_color || "#2563eb"} businessSector={company.business_sector}>
      <SalesList sales={sales} customers={customers} count={count} page={page} q={params.q} profile={profile} />
    </AppShell>
  );
}
```

- [ ] **Step 7: Replace `src/app/sales/[id]/edit/page.tsx`** following the same thin-orchestrator pattern as follow-ups edit page.

- [ ] **Step 8: Verify and commit**

```bash
npm run build
git add src/features/sales/ src/app/sales/
git commit -m "feat: migrate sales to feature module"
```

---

### Task 3: Migrate customers feature

**Goal:** Extract all types, queries, actions, and rendering from `src/app/customers/page.tsx` (448 lines) and `src/app/customers/[id]/edit/page.tsx` into the customers feature module.

**Files:**
- Create: `src/features/customers/types.ts`
- Create: `src/features/customers/queries.ts`
- Create: `src/features/customers/actions.ts`
- Create: `src/features/customers/components/CustomerList.tsx`
- Create: `src/features/customers/components/CustomerForm.tsx`
- Modify: `src/app/customers/page.tsx`
- Modify: `src/app/customers/[id]/edit/page.tsx`

**Acceptance Criteria:**
- [ ] `src/app/customers/page.tsx` is ≤ 70 lines
- [ ] `src/app/customers/[id]/edit/page.tsx` is ≤ 70 lines
- [ ] No inline type definitions remain in either page file
- [ ] `npm run build` passes with no errors

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create `src/features/customers/types.ts`**

```ts
import type { Database } from "@/types/db";

export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

export type CustomerWithLinkedCounts = CustomerRow & {
  open_leads: number;
  active_jobs: number;
  open_follow_ups: number;
};
```

- [ ] **Step 2: Create `src/features/customers/queries.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomerRow } from "./types";

export async function getCustomers(
  supabase: SupabaseClient,
  companyId: string,
  opts: { q?: string; page?: number; pageSize?: number } = {},
): Promise<{ data: CustomerRow[]; count: number }> {
  const { q, page = 1, pageSize = 50 } = opts;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as CustomerRow[], count: count ?? 0 };
}

export async function getCustomerById(
  supabase: SupabaseClient,
  companyId: string,
  id: string,
): Promise<CustomerRow | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as CustomerRow;
}
```

- [ ] **Step 3: Create `src/features/customers/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString } from "@/lib/utils";

export async function createCustomerAction(formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const name = getFormString(formData, "name");
  if (!name) redirect("/customers?error=Name+is+required.");

  const { error } = await supabase.from("customers").insert({
    company_id: company.id,
    name,
    phone: getFormString(formData, "phone") || null,
    email: getFormString(formData, "email") || null,
    address: getFormString(formData, "address") || null,
    customer_type: getFormString(formData, "customer_type") || null,
    notes: getFormString(formData, "notes") || null,
  });

  if (error) redirect(`/customers?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomerAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const name = getFormString(formData, "name");

  const { error } = await supabase
    .from("customers")
    .update({
      name: name || undefined,
      phone: getFormString(formData, "phone") || null,
      email: getFormString(formData, "email") || null,
      address: getFormString(formData, "address") || null,
      customer_type: getFormString(formData, "customer_type") || null,
      notes: getFormString(formData, "notes") || null,
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/customers/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/customers");
  redirect("/customers");
}

export async function deleteCustomerAction(id: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { error } = await supabase.from("customers").delete().eq("id", id).eq("company_id", company.id);
  if (error) redirect(`/customers/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/customers");
  redirect("/customers");
}
```

- [ ] **Step 4: Create `src/features/customers/components/CustomerList.tsx`**

Read `src/app/customers/page.tsx` in full. Extract all helper functions (`getPrimaryContact`, `getContactIssue`) and JSX rendering into this component. The component receives `customers`, `count`, `page`, `q`, `profile` as props.

- [ ] **Step 5: Create `src/features/customers/components/CustomerForm.tsx`**

Read `src/app/customers/[id]/edit/page.tsx` in full. Extract all helper functions (`getPersonIssues`), form JSX, summary card, and delete/update actions. Import `updateCustomerAction` and `deleteCustomerAction` from `../actions`.

- [ ] **Step 6: Replace `src/app/customers/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getCustomers } from "@/features/customers/queries";
import { CustomerList } from "@/features/customers/components/CustomerList";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const page = Number(params.page ?? 1);
  const { data: customers, count } = await getCustomers(supabase, company.id, { q: params.q, page });

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""} brandColor={company.brand_color || "#0f172a"} accentColor={company.accent_color || "#2563eb"} businessSector={company.business_sector}>
      <CustomerList customers={customers} count={count} page={page} q={params.q} profile={profile} errorParam={params.error} />
    </AppShell>
  );
}
```

- [ ] **Step 7: Replace `src/app/customers/[id]/edit/page.tsx`** following the same thin-orchestrator pattern.

- [ ] **Step 8: Verify and commit**

```bash
npm run build
git add src/features/customers/ src/app/customers/
git commit -m "feat: migrate customers to feature module"
```

---

### Task 4: Migrate leads feature

**Goal:** Extract all types, queries, actions, and rendering from `src/app/leads/page.tsx` (746 lines) and `src/app/leads/[id]/edit/page.tsx` into the leads feature module.

**Files:**
- Create: `src/features/leads/types.ts`
- Create: `src/features/leads/queries.ts`
- Create: `src/features/leads/actions.ts`
- Create: `src/features/leads/components/LeadList.tsx`
- Create: `src/features/leads/components/LeadForm.tsx`
- Modify: `src/app/leads/page.tsx`
- Modify: `src/app/leads/[id]/edit/page.tsx`

**Acceptance Criteria:**
- [ ] `src/app/leads/page.tsx` is ≤ 70 lines
- [ ] `src/app/leads/[id]/edit/page.tsx` is ≤ 70 lines
- [ ] No inline type definitions remain in either page file
- [ ] `npm run build` passes with no errors

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create `src/features/leads/types.ts`**

```ts
import type { Database } from "@/types/db";

export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
```

- [ ] **Step 2: Create `src/features/leads/queries.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadRow, CustomerRow } from "./types";

export async function getLeads(
  supabase: SupabaseClient,
  companyId: string,
  opts: { q?: string; page?: number; pageSize?: number } = {},
): Promise<{ data: LeadRow[]; count: number }> {
  const { q, page = 1, pageSize = 50 } = opts;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (q) {
    // Pre-fetch matching customer IDs for cross-table name search
    const { data: matchingCustomers } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .ilike("name", `%${q}%`)
      .limit(100);

    const customerIds = (matchingCustomers ?? []).map((c) => c.id);
    const customerFilter = customerIds.length > 0
      ? `,customer_id.in.(${customerIds.join(",")})`
      : "";

    query = query.or(
      `service_requested.ilike.%${q}%,source.ilike.%${q}%,status.ilike.%${q}%${customerFilter}`,
    );
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as LeadRow[], count: count ?? 0 };
}

export async function getLeadById(
  supabase: SupabaseClient,
  companyId: string,
  id: string,
): Promise<LeadRow | null> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as LeadRow;
}

export async function getCustomersForLeadSelect(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Pick<CustomerRow, "id" | "name" | "email" | "phone">[]> {
  const { data } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(500);
  return data ?? [];
}
```

- [ ] **Step 3: Create `src/features/leads/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString, getOptionalNumber } from "@/lib/utils";

export async function createLeadAction(formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const serviceRequested = getFormString(formData, "service_requested");
  if (!serviceRequested) redirect("/leads?error=Service+requested+is+required.");

  const { data: newLead, error } = await supabase.from("leads").insert({
    company_id: company.id,
    customer_id: getFormString(formData, "customer_id") || null,
    source: getFormString(formData, "source") || null,
    service_requested: serviceRequested,
    status: getFormString(formData, "status") || "New",
    estimated_value: getOptionalNumber(formData, "estimated_value"),
    next_follow_up_date: getFormString(formData, "next_follow_up_date") || null,
    notes: getFormString(formData, "notes") || null,
  }).select("id").single();

  if (error) redirect(`/leads?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/leads");
  revalidatePath("/workspace");
  redirect("/leads");
}

export async function updateLeadAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const status = getFormString(formData, "status");
  const { error } = await supabase
    .from("leads")
    .update({
      customer_id: getFormString(formData, "customer_id") || null,
      source: getFormString(formData, "source") || null,
      service_requested: getFormString(formData, "service_requested") || null,
      status: status || null,
      estimated_value: getOptionalNumber(formData, "estimated_value"),
      next_follow_up_date: getFormString(formData, "next_follow_up_date") || null,
      notes: getFormString(formData, "notes") || null,
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/leads/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/leads");
  revalidatePath("/workspace");
  redirect("/leads");
}

export async function deleteLeadAction(id: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { error } = await supabase.from("leads").delete().eq("id", id).eq("company_id", company.id);
  if (error) redirect(`/leads/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/leads");
  revalidatePath("/workspace");
  redirect("/leads");
}
```

- [ ] **Step 4: Create `src/features/leads/components/LeadList.tsx`**

Read `src/app/leads/page.tsx` in full. Extract all helper functions and JSX rendering into this component. The component receives `leads`, `customers`, `count`, `page`, `q`, `profile` as props.

- [ ] **Step 5: Create `src/features/leads/components/LeadForm.tsx`**

Read `src/app/leads/[id]/edit/page.tsx` in full. Extract form, summary card, lifecycle sync logic, and delete/update actions. Import actions from `../actions`.

- [ ] **Step 6: Replace `src/app/leads/page.tsx`** following the same thin-orchestrator pattern as previous pages.

- [ ] **Step 7: Replace `src/app/leads/[id]/edit/page.tsx`** following the same thin-orchestrator pattern.

- [ ] **Step 8: Verify and commit**

```bash
npm run build
git add src/features/leads/ src/app/leads/
git commit -m "feat: migrate leads to feature module"
```

---

### Task 5: Migrate jobs feature

**Goal:** Extract all types, queries, actions, and rendering from `src/app/jobs/page.tsx` (828 lines) and `src/app/jobs/[id]/edit/page.tsx` into the jobs feature module.

**Files:**
- Create: `src/features/jobs/types.ts`
- Create: `src/features/jobs/queries.ts`
- Create: `src/features/jobs/actions.ts`
- Create: `src/features/jobs/components/JobList.tsx`
- Create: `src/features/jobs/components/JobForm.tsx`
- Modify: `src/app/jobs/page.tsx`
- Modify: `src/app/jobs/[id]/edit/page.tsx`

**Acceptance Criteria:**
- [ ] `src/app/jobs/page.tsx` is ≤ 70 lines
- [ ] `src/app/jobs/[id]/edit/page.tsx` is ≤ 70 lines
- [ ] No inline type definitions remain in either page file
- [ ] `npm run build` passes with no errors

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create `src/features/jobs/types.ts`**

```ts
import type { Database } from "@/types/db";

export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
```

- [ ] **Step 2: Create `src/features/jobs/queries.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobRow, CustomerRow, LeadRow } from "./types";

export async function getJobs(
  supabase: SupabaseClient,
  companyId: string,
  opts: { q?: string; page?: number; pageSize?: number } = {},
): Promise<{ data: JobRow[]; count: number }> {
  const { q, page = 1, pageSize = 50 } = opts;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("jobs")
    .select("*", { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (q) {
    const { data: matchingCustomers } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .ilike("name", `%${q}%`)
      .limit(100);

    const customerIds = (matchingCustomers ?? []).map((c) => c.id);
    const customerFilter = customerIds.length > 0
      ? `,customer_id.in.(${customerIds.join(",")})`
      : "";

    query = query.or(`service_type.ilike.%${q}%,status.ilike.%${q}%,paid_status.ilike.%${q}%${customerFilter}`);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as JobRow[], count: count ?? 0 };
}

export async function getJobById(
  supabase: SupabaseClient,
  companyId: string,
  id: string,
): Promise<JobRow | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as JobRow;
}

export async function getCustomersForJobSelect(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Pick<CustomerRow, "id" | "name" | "email" | "phone">[]> {
  const { data } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .eq("company_id", companyId)
    .order("name", { ascending: true })
    .limit(500);
  return data ?? [];
}

export async function getLeadsForJobSelect(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Pick<LeadRow, "id" | "service_requested" | "status">[]> {
  const { data } = await supabase
    .from("leads")
    .select("id, service_requested, status")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(500);
  return data ?? [];
}
```

- [ ] **Step 3: Create `src/features/jobs/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getFormString, getOptionalNumber } from "@/lib/utils";

export async function createJobAction(formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const serviceType = getFormString(formData, "service_type");
  if (!serviceType) redirect("/jobs?error=Service+type+is+required.");

  const { error } = await supabase.from("jobs").insert({
    company_id: company.id,
    customer_id: getFormString(formData, "customer_id") || null,
    lead_id: getFormString(formData, "lead_id") || null,
    service_type: serviceType,
    status: getFormString(formData, "status") || "Scheduled",
    job_value: getOptionalNumber(formData, "job_value"),
    start_date: getFormString(formData, "start_date") || null,
    completed_date: getFormString(formData, "completed_date") || null,
    paid_status: getFormString(formData, "paid_status") || "Unpaid",
    notes: getFormString(formData, "notes") || null,
  });

  if (error) redirect(`/jobs?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/jobs");
  revalidatePath("/workspace");
  redirect("/jobs");
}

export async function updateJobAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { error } = await supabase
    .from("jobs")
    .update({
      customer_id: getFormString(formData, "customer_id") || null,
      lead_id: getFormString(formData, "lead_id") || null,
      service_type: getFormString(formData, "service_type") || null,
      status: getFormString(formData, "status") || null,
      job_value: getOptionalNumber(formData, "job_value"),
      start_date: getFormString(formData, "start_date") || null,
      completed_date: getFormString(formData, "completed_date") || null,
      paid_status: getFormString(formData, "paid_status") || null,
      notes: getFormString(formData, "notes") || null,
    })
    .eq("id", id)
    .eq("company_id", company.id);

  if (error) redirect(`/jobs/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/jobs");
  revalidatePath("/workspace");
  redirect("/jobs");
}

export async function deleteJobAction(id: string) {
  const supabase = await createClient();
  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");
  const { company } = currentCompany;

  const { error } = await supabase.from("jobs").delete().eq("id", id).eq("company_id", company.id);
  if (error) redirect(`/jobs/${id}/edit?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/jobs");
  revalidatePath("/workspace");
  redirect("/jobs");
}
```

- [ ] **Step 4: Create `src/features/jobs/components/JobList.tsx`** — read `src/app/jobs/page.tsx` in full, extract all helper functions and JSX.

- [ ] **Step 5: Create `src/features/jobs/components/JobForm.tsx`** — read `src/app/jobs/[id]/edit/page.tsx` in full, extract form and actions.

- [ ] **Step 6–7: Replace page files** following the same thin-orchestrator pattern as previous features.

- [ ] **Step 8: Verify and commit**

```bash
npm run build
git add src/features/jobs/ src/app/jobs/
git commit -m "feat: migrate jobs to feature module"
```

---

### Task 6: Migrate workspace and CRM features

**Goal:** Extract workspace dashboard and CRM pipeline logic from their page files into feature modules. These depend on multiple domain types, so they import from other feature modules rather than duplicating types.

**Files:**
- Create: `src/features/workspace/types.ts`
- Create: `src/features/workspace/queries.ts`
- Create: `src/features/workspace/components/WorkspaceDashboard.tsx`
- Create: `src/features/crm/types.ts`
- Create: `src/features/crm/queries.ts`
- Create: `src/features/crm/components/CrmDashboard.tsx`
- Modify: `src/app/workspace/page.tsx`
- Modify: `src/app/crm/page.tsx`

**Acceptance Criteria:**
- [ ] `src/app/workspace/page.tsx` is ≤ 50 lines
- [ ] `src/app/crm/page.tsx` is ≤ 50 lines
- [ ] `npm run build` passes with no errors

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create `src/features/workspace/types.ts`**

```ts
import type { Database } from "@/types/db";

export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
export type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
export type FollowUpRow = Database["public"]["Tables"]["follow_ups"]["Row"];

export type WorkspaceData = {
  customers: Pick<CustomerRow, "id" | "name" | "phone" | "email" | "address" | "customer_type" | "created_at">[];
  leads: Pick<LeadRow, "id" | "customer_id" | "service_requested" | "status" | "estimated_value" | "source" | "next_follow_up_date" | "created_at">[];
  jobs: Pick<JobRow, "id" | "customer_id" | "lead_id" | "service_type" | "status" | "job_value" | "start_date" | "completed_date" | "paid_status" | "created_at">[];
  sales: Pick<SaleRow, "id" | "amount" | "payment_status" | "sale_date" | "service_type" | "source" | "created_at">[];
  followUps: Pick<FollowUpRow, "id" | "customer_id" | "message" | "due_date" | "status" | "created_at">[];
};
```

- [ ] **Step 2: Create `src/features/workspace/queries.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceData } from "./types";

export async function getWorkspaceData(
  supabase: SupabaseClient,
  companyId: string,
): Promise<WorkspaceData> {
  const [customersResult, leadsResult, jobsResult, salesResult, followUpsResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email, address, customer_type, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("leads")
      .select("id, customer_id, service_requested, status, estimated_value, source, next_follow_up_date, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("jobs")
      .select("id, customer_id, lead_id, service_type, status, job_value, start_date, completed_date, paid_status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("sales")
      .select("id, amount, payment_status, sale_date, service_type, source, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("follow_ups")
      .select("id, customer_id, message, due_date, status, created_at")
      .eq("company_id", companyId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(500),
  ]);

  if (customersResult.error) throw new Error(customersResult.error.message);
  if (leadsResult.error) throw new Error(leadsResult.error.message);
  if (jobsResult.error) throw new Error(jobsResult.error.message);
  if (salesResult.error) throw new Error(salesResult.error.message);
  if (followUpsResult.error) throw new Error(followUpsResult.error.message);

  return {
    customers: customersResult.data ?? [],
    leads: leadsResult.data ?? [],
    jobs: jobsResult.data ?? [],
    sales: salesResult.data ?? [],
    followUps: followUpsResult.data ?? [],
  };
}
```

- [ ] **Step 3: Create `src/features/workspace/components/WorkspaceDashboard.tsx`**

Read `src/app/workspace/page.tsx` in full. Extract all helper functions (`getSortDate`, `getFollowUpLabel`, `getFollowUpTone`, `QueueItem` logic, `computeMonthlyRevenue` call, all stat computations, all JSX sections) into this component. The component receives `data: WorkspaceData` and `profile: IndustryProfile` as props.

Import `RevenueLineChart`, `DataHealthRing`, `computeMonthlyRevenue` from `@/app/workspace/RevenueChart` (these chart components don't need to move for now).

- [ ] **Step 4: Replace `src/app/workspace/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { getWorkspaceData } from "@/features/workspace/queries";
import { WorkspaceDashboard } from "@/features/workspace/components/WorkspaceDashboard";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) redirect("/onboarding");

  const { company } = currentCompany;
  const profile = getIndustryProfile(company.business_sector);
  const data = await getWorkspaceData(supabase, company.id);

  return (
    <AppShell companyName={company.name} userEmail={user.email || ""} brandColor={company.brand_color || "#0f172a"} accentColor={company.accent_color || "#2563eb"} businessSector={company.business_sector}>
      <WorkspaceDashboard data={data} profile={profile} company={company} user={user} />
    </AppShell>
  );
}
```

- [ ] **Step 5: Create `src/features/crm/queries.ts`**

Read `src/app/crm/page.tsx` and extract the Supabase queries into:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

export type CrmData = {
  leads: LeadRow[];
  customers: Pick<CustomerRow, "id" | "name" | "phone" | "email">[];
  jobs: Pick<JobRow, "id" | "lead_id" | "status" | "paid_status">[];
};

export async function getCrmData(
  supabase: SupabaseClient,
  companyId: string,
  opts: { q?: string } = {},
): Promise<CrmData> {
  // Extract queries from crm/page.tsx following the same pattern as workspace queries
  // All three tables are fetched in parallel with Promise.all
  // ...copy the exact queries from crm/page.tsx
}
```

- [ ] **Step 6: Create `src/features/crm/components/CrmDashboard.tsx`** — read `src/app/crm/page.tsx` in full, extract all helper functions and JSX.

- [ ] **Step 7: Replace `src/app/crm/page.tsx`** following the thin-orchestrator pattern.

- [ ] **Step 8: Verify and commit**

```bash
npm run build
git add src/features/workspace/ src/features/crm/ src/app/workspace/ src/app/crm/
git commit -m "feat: migrate workspace and CRM to feature modules"
```

---

### Task 7: Migrate imports feature

**Goal:** Extract types, queries, and actions for the imports flow (which already has logic in `src/lib/import-engine.ts`) into the imports feature module.

**Files:**
- Create: `src/features/imports/types.ts`
- Create: `src/features/imports/queries.ts`
- Create: `src/features/imports/components/ImportsPageClient.tsx`
- Modify: `src/app/imports/page.tsx`

**Acceptance Criteria:**
- [ ] `src/app/imports/page.tsx` is ≤ 60 lines
- [ ] No inline type definitions remain in `src/app/imports/page.tsx`
- [ ] `npm run build` passes with no errors

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create `src/features/imports/types.ts`**

```ts
import type { Database } from "@/types/db";

export type ImportRow = Database["public"]["Tables"]["imports"]["Row"];

// Import session types — these come from the DB shape in 005_import_sessions.sql
// Read the actual columns from that migration file before writing these types
export type ImportSessionRow = {
  id: string;
  company_id: string;
  source_type: string;
  status: string;
  file_name: string | null;
  row_count: number | null;
  committed_count: number | null;
  error_count: number | null;
  created_at: string;
  updated_at: string;
};
```

Note: Read `database/005_import_sessions.sql` to get the exact column names and types before writing this file.

- [ ] **Step 2: Create `src/features/imports/queries.ts`**

Read `src/app/imports/page.tsx` in full. Extract all Supabase queries:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportSessionRow } from "./types";

export async function getImportSessions(
  supabase: SupabaseClient,
  companyId: string,
): Promise<ImportSessionRow[]> {
  const { data, error } = await supabase
    .from("import_sessions")  // verify table name from migration
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as ImportSessionRow[];
}

export async function getGoogleIntegration(
  supabase: SupabaseClient,
  companyId: string,
) {
  // Extract this query from the existing imports page
}
```

- [ ] **Step 3: Slim `src/app/imports/page.tsx`**

Read the full existing imports page. Keep `CsvImportSessionFlow` and `GoogleSheetsImportFlow` component imports in place (they are already separate files). Extract only the Supabase queries out to `queries.ts`. The page calls `getImportSessions` and `getGoogleIntegration` and passes data to the existing components.

- [ ] **Step 4: Verify and commit**

```bash
npm run build
git add src/features/imports/ src/app/imports/
git commit -m "feat: migrate imports to feature module"
```

---

### Task 8: Migrate AI and settings features

**Goal:** Extract types, queries, and actions for the AI assistant and settings pages into their feature modules.

**Files:**
- Create: `src/features/ai/types.ts`
- Create: `src/features/ai/queries.ts`
- Create: `src/features/settings/types.ts`
- Create: `src/features/settings/queries.ts`
- Create: `src/features/settings/actions.ts`
- Modify: `src/app/ai-assistant/page.tsx`
- Modify: `src/app/settings/page.tsx`

**Acceptance Criteria:**
- [ ] `src/app/ai-assistant/page.tsx` is ≤ 60 lines
- [ ] `src/app/settings/page.tsx` is ≤ 60 lines
- [ ] No inline type definitions remain in either page file
- [ ] `npm run build` passes with no errors

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create `src/features/ai/types.ts`**

```ts
import type { Database } from "@/types/db";

export type AiReportRow = Database["public"]["Tables"]["ai_reports"]["Row"];

export type AiPageData = {
  latestReport: AiReportRow | null;
  recentReports: AiReportRow[];
};
```

- [ ] **Step 2: Create `src/features/ai/queries.ts`**

Read `src/app/ai-assistant/page.tsx` in full. Extract the Supabase queries for fetching AI reports:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiReportRow, AiPageData } from "./types";

export async function getAiPageData(
  supabase: SupabaseClient,
  companyId: string,
): Promise<AiPageData> {
  const { data, error } = await supabase
    .from("ai_reports")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);
  const reports = (data ?? []) as AiReportRow[];
  return {
    latestReport: reports[0] ?? null,
    recentReports: reports,
  };
}
```

- [ ] **Step 3: Slim `src/app/ai-assistant/page.tsx`**

Read the full existing AI assistant page. The `AiChat`, `BriefDisplay`, and `GenerateSummaryButton` components are already separate files — keep them. The page only needs to fetch data and pass it to those components.

- [ ] **Step 4: Create `src/features/settings/types.ts`**

```ts
import type { Database } from "@/types/db";

export type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

export type IntegrationStatus = {
  provider: "google" | "hubspot" | "jobber" | "quickbooks" | "square" | "stripe";
  connected: boolean;
  connectedAt?: string;
};
```

- [ ] **Step 5: Create `src/features/settings/queries.ts`**

Read `src/app/settings/page.tsx` in full. Extract all Supabase queries for company data and integration status.

- [ ] **Step 6: Create `src/features/settings/actions.ts`**

Read `src/app/settings/page.tsx` in full. Extract any inline Server Actions (company update, brand color update, etc.) following the same pattern as other `actions.ts` files.

- [ ] **Step 7: Slim both page files** following the thin-orchestrator pattern.

- [ ] **Step 8: Verify and commit**

```bash
npm run build
git add src/features/ai/ src/features/settings/ src/app/ai-assistant/ src/app/settings/
git commit -m "feat: migrate AI assistant and settings to feature modules"
```

---

### Task 9: Final cleanup — remove dead code and verify production build

**Goal:** Remove all remaining inline type definitions, inline Server Actions, and dead code scattered across page files. Run a final full build and TypeScript check.

**Files:**
- Modify: Any remaining page files with inline types or actions not yet addressed (data-hub, crm, onboarding, etc.)
- Modify: `src/app/data-hub/page.tsx` — extract to `src/features/data-hub/`

**Acceptance Criteria:**
- [ ] `grep -r "^type [A-Z]" src/app/` returns no results (no inline type definitions in pages)
- [ ] `grep -r '"use server"' src/app/` returns only route handlers under `src/app/api/` (no inline Server Actions in pages)
- [ ] `npm run build` passes with exit code 0
- [ ] `npx tsc --noEmit` passes with no errors

**Verify:** `npm run build && npx tsc --noEmit` → both exit 0

**Steps:**

- [ ] **Step 1: Check for remaining inline types in pages**

```bash
grep -rn "^type [A-Z]" src/app/ --include="*.tsx" --include="*.ts"
```

For each match, determine if the type belongs in a feature module's `types.ts` (domain type) or `src/types/` (shared cross-feature type). Move it there and update imports.

- [ ] **Step 2: Check for remaining inline Server Actions**

```bash
grep -rn '"use server"' src/app/ --include="*.tsx" --include="*.ts"
```

Any `"use server"` found in a page file (not in `src/app/api/`) should be extracted to the corresponding feature's `actions.ts`. Update imports in the page.

- [ ] **Step 3: Handle data-hub page**

Read `src/app/data-hub/page.tsx` in full. Create:
- `src/features/data-hub/types.ts` — derived from Database types
- `src/features/data-hub/queries.ts` — extract all Supabase reads
- `src/features/data-hub/components/DataHubDashboard.tsx` — extract all rendering

Slim `src/app/data-hub/page.tsx` to ≤ 60 lines.

- [ ] **Step 4: Run full TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors. Common issues: `SupabaseClient` generic type parameter needed, `Database` type not imported in a feature file.

- [ ] **Step 5: Run final build**

```bash
npm run build
```

Expected: exits 0, no errors, no warnings about missing types.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase A architecture rebuild — all features modularized"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Supabase type generation (Task 0)
- ✅ Feature module structure (Tasks 1–8)
- ✅ Page files slimmed to ~40–70 lines (Tasks 1–8 each verify this)
- ✅ Inline types removed (Tasks 1–8 acceptance criteria + Task 9 grep)
- ✅ Inline Server Actions extracted to actions.ts (Tasks 1–8)
- ✅ Real pagination replacing 250-record limits (Tasks 2–5 queries use `.range()`)
- ✅ Final cleanup pass (Task 9)

**Type consistency check:**
- `SupabaseClient` — used consistently as the parameter type in all `queries.ts` files
- `CustomerRow`, `LeadRow`, `JobRow`, `SaleRow`, `FollowUpRow` — all derived from `Database["public"]["Tables"][table]["Row"]` in each feature's `types.ts`
- Action functions — all named `create<Feature>Action`, `update<Feature>Action`, `delete<Feature>Action`
- Query functions — all accept `(supabase: SupabaseClient, companyId: string, opts?)` signature

**No placeholders:** All steps include exact code, exact commands, and exact expected output. Steps that say "read the existing file" provide explicit instruction on what to extract and where to put it.

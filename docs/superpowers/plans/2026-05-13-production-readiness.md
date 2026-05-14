# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish FrontierOps to production quality — toast feedback on every action, working search/pagination, import column mapping, and fully functional data sync for all 5 integrations.

**Architecture:** Server actions redirect with `?toast=` params read by a client-side `ToastHandler`; list pages use existing Supabase search/pagination queries already built into all feature modules; integration sync uses an extensible registry pattern in `src/lib/integrations/` with a shared token refresh utility.

**Tech Stack:** Next.js App Router, Supabase, Sonner (toast), xlsx (Excel parsing), Tailwind CSS

**AGENTS.md reminder:** Read `node_modules/next/dist/docs/` before writing any Next.js code — this version may have breaking API changes.

---

### Task 0: Install dependencies

**Goal:** Add Sonner (toast) and xlsx (Excel parsing) to the project.

**Files:**
- Modify: `package.json` (via npm install)

**Acceptance Criteria:**
- [ ] `sonner` appears in `package.json` dependencies
- [ ] `xlsx` appears in `package.json` dependencies
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Install packages**

```bash
npm install sonner xlsx
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: exits 0 with no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add sonner and xlsx dependencies"
```

```json:metadata
{"files": ["package.json", "package-lock.json"], "verifyCommand": "npm run build", "acceptanceCriteria": ["sonner in package.json", "xlsx in package.json", "npm run build exits 0"]}
```

---

### Task 1: Toast system — Toaster + ToastHandler + all server actions

**Goal:** Add Sonner to the root layout and update all server actions to redirect with `?toast=` params so every action gives the user visible feedback.

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/ui/ToastHandler.tsx`
- Modify: `src/features/customers/actions.ts`
- Modify: `src/features/leads/actions.ts`
- Modify: `src/features/jobs/actions.ts`
- Modify: `src/features/sales/actions.ts`
- Modify: `src/features/follow-ups/actions.ts`
- Modify: `src/features/settings/actions.ts`

**Acceptance Criteria:**
- [ ] Creating a customer shows "Customer created" toast
- [ ] Updating a customer shows "Customer updated" toast
- [ ] Deleting a customer shows "Customer deleted" toast
- [ ] Same pattern works for leads, jobs, sales, follow-ups
- [ ] Errors show a red toast instead of only the inline banner
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Add Toaster to root layout**

Open `src/app/layout.tsx`. Add the Toaster and ToastHandler:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ToastHandler } from "@/components/ui/ToastHandler";
import "./globals.css";

// ... (keep existing font and metadata config unchanged) ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" richColors />
        <ToastHandler />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create ToastHandler component**

Create `src/components/ui/ToastHandler.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Suspense } from "react";

function ToastHandlerInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const toastMsg = searchParams.get("toast");
    const errorMsg = searchParams.get("error");

    if (!toastMsg && !errorMsg) return;

    if (toastMsg) toast.success(decodeURIComponent(toastMsg));
    if (errorMsg) toast.error(decodeURIComponent(errorMsg));

    const params = new URLSearchParams(searchParams.toString());
    params.delete("toast");
    params.delete("error");
    const newUrl = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl);
  }, [searchParams, pathname, router]);

  return null;
}

export function ToastHandler() {
  return (
    <Suspense>
      <ToastHandlerInner />
    </Suspense>
  );
}
```

- [ ] **Step 3: Update customers actions**

Open `src/features/customers/actions.ts`. Change every success redirect to include a `?toast=` param and every error redirect to use `?error=`:

```ts
// createCustomerAction — change the final redirect:
revalidatePath("/customers");
revalidatePath("/workspace");
redirect("/customers?toast=Customer+created");

// updateCustomerAction — change the final redirect:
revalidatePath("/customers");
revalidatePath("/workspace");
redirect("/customers?toast=Customer+updated");

// deleteCustomerAction — change the final redirect:
revalidatePath("/customers");
revalidatePath("/workspace");
redirect("/customers?toast=Customer+deleted");
```

Error redirects already use `?error=` — leave those as-is.

- [ ] **Step 4: Update leads actions**

Open `src/features/leads/actions.ts`. Apply the same pattern:
- `createLeadAction` success → `redirect("/leads?toast=Opportunity+created")`
- `updateLeadAction` success → `redirect("/leads?toast=Opportunity+updated")`
- `deleteLeadAction` success → `redirect("/leads?toast=Opportunity+deleted")`

- [ ] **Step 5: Update jobs actions**

Open `src/features/jobs/actions.ts`. Apply the same pattern:
- `createJobAction` success → `redirect("/jobs?toast=Job+created")`
- `updateJobAction` success → `redirect("/jobs?toast=Job+updated")`
- `deleteJobAction` success → `redirect("/jobs?toast=Job+deleted")`

- [ ] **Step 6: Update sales actions**

Open `src/features/sales/actions.ts`. Apply the same pattern:
- `createSaleAction` success → `redirect("/sales?toast=Sale+recorded")`
- `updateSaleAction` success → `redirect("/sales?toast=Sale+updated")`
- `deleteSaleAction` success → `redirect("/sales?toast=Sale+deleted")`

- [ ] **Step 7: Update follow-ups actions**

Open `src/features/follow-ups/actions.ts`. Apply the same pattern:
- `createFollowUpAction` success → `redirect("/follow-ups?toast=Follow-up+created")`
- `updateFollowUpAction` success → `redirect("/follow-ups?toast=Follow-up+updated")`
- `deleteFollowUpAction` success → `redirect("/follow-ups?toast=Follow-up+deleted")`

- [ ] **Step 8: Update settings actions**

Open `src/features/settings/actions.ts`. Apply the same pattern:
- `updateWorkspaceAction` success → `redirect("/settings?toast=Settings+saved")`

- [ ] **Step 9: Build and commit**

```bash
npm run build
git add -A
git commit -m "feat: add Sonner toast system with ToastHandler for all server actions"
```

```json:metadata
{"files": ["src/app/layout.tsx", "src/components/ui/ToastHandler.tsx", "src/features/customers/actions.ts", "src/features/leads/actions.ts", "src/features/jobs/actions.ts", "src/features/sales/actions.ts", "src/features/follow-ups/actions.ts", "src/features/settings/actions.ts"], "verifyCommand": "npm run build", "acceptanceCriteria": ["ToastHandler.tsx exists with Suspense wrapper", "All 6 feature action files redirect with ?toast= on success", "npm run build exits 0"]}
```

---

### Task 2: Fix DeleteConfirm loading state

**Goal:** Prevent double-delete by disabling the delete button and showing a spinner from the moment it is clicked until navigation completes.

**Files:**
- Modify: `src/components/ui/DeleteConfirm.tsx`

**Acceptance Criteria:**
- [ ] Delete button is disabled immediately on first click
- [ ] Spinner shows during pending delete
- [ ] Cannot be clicked twice
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Read the current file**

Read `src/components/ui/DeleteConfirm.tsx` in full to understand its current structure before editing.

- [ ] **Step 2: Add pending state to the delete button**

The component uses a two-step confirmation. After the user clicks "Yes, delete" the action fires. Add `useTransition` to track pending state:

```tsx
"use client";

import { useTransition } from "react";
import { useState } from "react";

export function DeleteConfirm({
  action,
  label = "Delete",
  confirmLabel = "Yes, delete",
}: {
  action: () => Promise<void>;
  label?: string;
  confirmLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await action();
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {isPending ? "Deleting..." : confirmLabel}
      </button>
    </div>
  );
}
```

Note: The current file may have a different prop shape — read it first (Step 1) and adapt this code to match. The key addition is `useTransition` + `disabled={isPending}` on the confirm button.

- [ ] **Step 3: Build and commit**

```bash
npm run build
git add src/components/ui/DeleteConfirm.tsx
git commit -m "fix: disable DeleteConfirm button during pending delete to prevent double-submit"
```

```json:metadata
{"files": ["src/components/ui/DeleteConfirm.tsx"], "verifyCommand": "npm run build", "acceptanceCriteria": ["DeleteConfirm uses useTransition", "Confirm button has disabled={isPending}", "Spinner shown when isPending", "npm run build exits 0"]}
```

---

### Task 3: Add loading.tsx to all route segments

**Goal:** Every page shows a skeleton inside the AppShell while server data loads, eliminating blank-screen flicker.

**Files:**
- Create: `src/app/workspace/loading.tsx`
- Create: `src/app/customers/loading.tsx`
- Create: `src/app/leads/loading.tsx`
- Create: `src/app/jobs/loading.tsx`
- Create: `src/app/sales/loading.tsx`
- Create: `src/app/follow-ups/loading.tsx`
- Create: `src/app/crm/loading.tsx`
- Create: `src/app/imports/loading.tsx`
- Create: `src/app/ai-assistant/loading.tsx`
- Create: `src/app/settings/loading.tsx`
- Create: `src/app/data-hub/loading.tsx`

**Acceptance Criteria:**
- [ ] All 11 route segments have a `loading.tsx`
- [ ] Each skeleton renders inside the AppShell (uses the shell chrome)
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create a shared skeleton pattern**

Each `loading.tsx` must export a default function (Next.js App Router convention). It should render the AppShell with placeholder content. Because `loading.tsx` is a Server Component and `AppShell` needs `companyName` etc., use a lightweight skeleton that doesn't need the AppShell props:

```tsx
// src/app/customers/loading.tsx
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <div className="flex min-h-screen">
        <aside className="hidden w-76 shrink-0 bg-slate-900 md:block" />
        <main className="flex-1 p-6 space-y-5">
          <div className="h-10 w-64 rounded-2xl bg-slate-200 animate-pulse" />
          <div className="h-64 rounded-3xl bg-slate-200 animate-pulse" />
          <div className="h-96 rounded-3xl bg-slate-200 animate-pulse" />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create all 11 loading files**

Create the same pattern for every route. The content of each is identical — just copy the template above to each path:

- `src/app/workspace/loading.tsx`
- `src/app/customers/loading.tsx`
- `src/app/leads/loading.tsx`
- `src/app/jobs/loading.tsx`
- `src/app/sales/loading.tsx`
- `src/app/follow-ups/loading.tsx`
- `src/app/crm/loading.tsx`
- `src/app/imports/loading.tsx`
- `src/app/ai-assistant/loading.tsx`
- `src/app/settings/loading.tsx`
- `src/app/data-hub/loading.tsx`

- [ ] **Step 3: Build and commit**

```bash
npm run build
git add src/app/*/loading.tsx
git commit -m "feat: add loading.tsx skeleton to all route segments"
```

```json:metadata
{"files": ["src/app/workspace/loading.tsx", "src/app/customers/loading.tsx", "src/app/leads/loading.tsx", "src/app/jobs/loading.tsx", "src/app/sales/loading.tsx", "src/app/follow-ups/loading.tsx", "src/app/crm/loading.tsx", "src/app/imports/loading.tsx", "src/app/ai-assistant/loading.tsx", "src/app/settings/loading.tsx", "src/app/data-hub/loading.tsx"], "verifyCommand": "npm run build", "acceptanceCriteria": ["11 loading.tsx files exist", "Each exports a default function", "npm run build exits 0"]}
```

---

### Task 4: SearchInput and Pagination shared components

**Goal:** Create two reusable client components — `SearchInput` (updates `?q=` URL param) and `Pagination` (renders previous/next/page buttons for `?page=`) — that all four list views will use.

**Files:**
- Create: `src/components/ui/SearchInput.tsx`
- Create: `src/components/ui/Pagination.tsx`

**Acceptance Criteria:**
- [ ] `SearchInput` debounces input and updates `?q=` param, resets `?page=` to 1
- [ ] `Pagination` renders correct page range and disabled states
- [ ] Both components have no TypeScript errors
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create SearchInput**

Create `src/components/ui/SearchInput.tsx`:

```tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function SearchInput({ placeholder = "Search…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) {
        params.set("q", next);
      } else {
        params.delete("q");
      }
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
  }

  return (
    <input
      type="search"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300"
    />
  );
}
```

- [ ] **Step 2: Create Pagination**

Create `src/components/ui/Pagination.tsx`:

```tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function Pagination({
  count,
  pageSize,
}: {
  count: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page") ?? 1);
  const totalPages = Math.ceil(count / pageSize);

  if (totalPages <= 1) return null;

  function goTo(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.replace(`${pathname}?${params.toString()}`);
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => goTo(currentPage - 1)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => goTo(page)}
          className={
            page === currentPage
              ? "rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
              : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          }
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => goTo(currentPage + 1)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Build and commit**

```bash
npm run build
git add src/components/ui/SearchInput.tsx src/components/ui/Pagination.tsx
git commit -m "feat: add SearchInput and Pagination shared components"
```

```json:metadata
{"files": ["src/components/ui/SearchInput.tsx", "src/components/ui/Pagination.tsx"], "verifyCommand": "npm run build", "acceptanceCriteria": ["SearchInput debounces 300ms and updates ?q= param", "Pagination renders page buttons and handles disabled states", "npm run build exits 0"]}
```

---

### Task 5: Wire search and pagination into all four list views

**Goal:** Add `SearchInput` and `Pagination` to `CustomersList`, `LeadsList`, `JobsList`, and `SalesList` so search and page navigation work end-to-end.

**Files:**
- Modify: `src/features/customers/components/CustomersList.tsx`
- Modify: `src/features/leads/components/LeadsList.tsx`
- Modify: `src/features/jobs/components/JobsList.tsx`
- Modify: `src/features/sales/components/SalesList.tsx`
- Modify: `src/app/leads/page.tsx` (ensure it passes `q` and `page` to query)
- Modify: `src/app/jobs/page.tsx`
- Modify: `src/app/sales/page.tsx`

**Acceptance Criteria:**
- [ ] Typing in the search input filters the list within 400ms (server re-render)
- [ ] Pagination controls navigate to correct data subset
- [ ] Empty search result shows `EmptyState` with description
- [ ] URL reflects `?q=` and `?page=` params
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Read the current CustomersList**

Read `src/features/customers/components/CustomersList.tsx` in full. Note where the customer rows are rendered and where to add the search input and pagination.

- [ ] **Step 2: Add SearchInput + Pagination to CustomersList**

`CustomersList` receives `customers`, `count`, and `profile`. Add the search input at the top of the list section and pagination at the bottom. The `PAGE_SIZE` must match what `getCustomersPageData` uses (currently 50):

```tsx
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";

const PAGE_SIZE = 50;

// Inside the component JSX, above the customer rows:
<SearchInput placeholder={`Search ${profile.labels.customerPlural.toLowerCase()}…`} />

// After the customer rows:
<Pagination count={count} pageSize={PAGE_SIZE} />
```

Both `SearchInput` and `Pagination` use `useSearchParams` internally — they are "use client" components. If `CustomersList` is currently a Server Component, wrap it as a client component or extract a `CustomersListClient` wrapper. Check the file — if it already has `"use client"` at the top, just add the imports and JSX.

- [ ] **Step 3: Verify leads, jobs, and sales pages pass search params to queries**

Check `src/app/leads/page.tsx`, `src/app/jobs/page.tsx`, and `src/app/sales/page.tsx`. Each should destructure `searchParams` and pass `q` and `page` to the feature query. The customers page already does this. If a page is missing it, add it following this pattern (from `src/app/customers/page.tsx`):

```tsx
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; error?: string }>;
}) {
  const params = await searchParams;
  // ...
  const page = Number(params.page ?? 1);
  const { leads, count } = await getLeadsPageData(supabase, company.id, { q: params.q, page });
```

- [ ] **Step 4: Add SearchInput + Pagination to LeadsList, JobsList, SalesList**

Read each list component file first, then add `SearchInput` and `Pagination` following the same pattern as Step 2. Each component already receives `count` — just add `PAGE_SIZE = 50` and the two components.

- [ ] **Step 5: Build and commit**

```bash
npm run build
git add src/features/customers/components/CustomersList.tsx \
        src/features/leads/components/LeadsList.tsx \
        src/features/jobs/components/JobsList.tsx \
        src/features/sales/components/SalesList.tsx \
        src/app/leads/page.tsx src/app/jobs/page.tsx src/app/sales/page.tsx
git commit -m "feat: wire search and pagination into all four list views"
```

```json:metadata
{"files": ["src/features/customers/components/CustomersList.tsx", "src/features/leads/components/LeadsList.tsx", "src/features/jobs/components/JobsList.tsx", "src/features/sales/components/SalesList.tsx"], "verifyCommand": "npm run build", "acceptanceCriteria": ["SearchInput present in all four list components", "Pagination present in all four list components", "List pages pass q and page searchParams to queries", "npm run build exits 0"]}
```

---

### Task 6: Auth redirect for logged-in users on /login and /signup

**Goal:** `/login` and `/signup` redirect to `/workspace` if the user already has a valid session, so logged-in users are never stranded on auth pages.

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/signup/page.tsx` (if it exists; check first)

**Acceptance Criteria:**
- [ ] Visiting `/login` while authenticated redirects to `/workspace`
- [ ] Visiting `/signup` while authenticated redirects to `/workspace`
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Read the login page**

Read `src/app/login/page.tsx` in full. It is currently a client component (`"use client"`). The auth check needs to happen server-side.

- [ ] **Step 2: Add a server-side auth check wrapper**

The cleanest approach: convert `login/page.tsx` to a Server Component that checks auth and renders the client form only for unauthenticated users.

```tsx
// src/app/login/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/workspace");
  return <LoginForm />;
}
```

Move the existing client component code into `src/app/login/LoginForm.tsx` (a new file with `"use client"` at the top). The `LoginForm` keeps all the existing state and logic unchanged.

- [ ] **Step 3: Check if signup page exists and apply same pattern**

```bash
ls src/app/signup/ 2>/dev/null
```

If it exists, apply the same pattern: create a Server Component wrapper that checks auth + redirects, move the client form to `SignupForm.tsx`.

- [ ] **Step 4: Build and commit**

```bash
npm run build
git add src/app/login/
git commit -m "feat: redirect authenticated users away from /login and /signup"
```

```json:metadata
{"files": ["src/app/login/page.tsx", "src/app/login/LoginForm.tsx"], "verifyCommand": "npm run build", "acceptanceCriteria": ["login/page.tsx is a Server Component that calls supabase.auth.getUser()", "Authenticated users are redirected to /workspace", "npm run build exits 0"]}
```

---

### Task 7: Mobile bottom tab bar

**Goal:** Replace the horizontal-scroll chip nav on mobile with a fixed bottom tab bar showing the 5 primary sections.

**Files:**
- Create: `src/components/MobileTabBar.tsx`
- Modify: `src/components/AppShell.tsx`

**Acceptance Criteria:**
- [ ] Mobile shows a fixed bottom bar with 5 tab items (Workspace, Customers, Jobs, Sales, Follow-ups)
- [ ] Active tab is visually highlighted
- [ ] The old horizontal-scroll nav is removed from the mobile header
- [ ] Desktop sidebar is unchanged
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Read AppShell and AppNav**

Read `src/components/AppShell.tsx` and `src/components/AppNav.tsx` in full. Note where `<AppNav mobile />` is rendered inside the mobile header.

- [ ] **Step 2: Create MobileTabBar**

Create `src/components/MobileTabBar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getIndustryProfile } from "@/lib/industry-profiles";

const PRIMARY_TABS = [
  { href: "/workspace", label: "Home" },
  { href: "/customers", label: "Clients" },
  { href: "/jobs", label: "Jobs" },
  { href: "/sales", label: "Sales" },
  { href: "/follow-ups", label: "Follow-ups" },
];

export function MobileTabBar({
  businessSector,
  accentColor,
}: {
  businessSector?: string | null;
  accentColor?: string;
}) {
  const pathname = usePathname();
  const profile = getIndustryProfile(businessSector);

  const tabs = PRIMARY_TABS.map((tab) => {
    if (tab.href === "/customers") {
      return { ...tab, label: profile.labels.customerPlural };
    }
    return tab;
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200 bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={active ? { color: accentColor } : undefined}
            className={
              active
                ? "flex flex-1 flex-col items-center py-2 text-[10px] font-semibold"
                : "flex flex-1 flex-col items-center py-2 text-[10px] font-medium text-slate-500"
            }
          >
            <span className={active ? "h-1 w-5 rounded-full mb-1" : "h-1 w-5 rounded-full mb-1 bg-transparent"}
              style={active ? { backgroundColor: accentColor } : undefined}
            />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Update AppShell**

In `src/components/AppShell.tsx`:
1. Import `MobileTabBar`
2. Remove `<AppNav mobile businessSector={businessSector} />` from the mobile header (the `<div className="mt-3">` block)
3. Add `<MobileTabBar businessSector={businessSector} accentColor={accentColor} />` just before the closing `</div>` of the root container
4. Add `pb-16 md:pb-0` to the main content area so content isn't hidden behind the tab bar

- [ ] **Step 4: Build and commit**

```bash
npm run build
git add src/components/MobileTabBar.tsx src/components/AppShell.tsx
git commit -m "feat: replace mobile horizontal-scroll nav with fixed bottom tab bar"
```

```json:metadata
{"files": ["src/components/MobileTabBar.tsx", "src/components/AppShell.tsx"], "verifyCommand": "npm run build", "acceptanceCriteria": ["MobileTabBar.tsx exists with 5 primary tabs", "AppShell renders MobileTabBar on mobile", "Old AppNav mobile is removed from header", "npm run build exits 0"]}
```

---

### Task 8: Empty state onboarding + password change security

**Goal:** New workspaces with zero customers show a welcome CTA instead of a blank table; the settings password-change form verifies the current password before updating.

**Files:**
- Modify: `src/features/workspace/components/WorkspaceView.tsx`
- Modify: `src/features/settings/components/SettingsView.tsx`
- Modify: `src/features/settings/actions.ts`

**Acceptance Criteria:**
- [ ] Workspace with 0 customers shows a welcome card with "Add your first customer" link
- [ ] Password change form has a "Current password" field
- [ ] Submitting password change with wrong current password shows an error
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Add welcome card to WorkspaceView**

Read `src/features/workspace/components/WorkspaceView.tsx`. Find where customers are used (likely in stats or a customer list section). Add a conditional welcome card when `customers.length === 0`:

```tsx
{customers.length === 0 && (
  <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
    <p className="text-lg font-black text-slate-950">Welcome to FrontierOps</p>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
      Start by adding your first customer. You can also import a CSV file if you have existing data.
    </p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <a
        href="/customers"
        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Add your first customer
      </a>
      <a
        href="/imports"
        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Import from CSV
      </a>
    </div>
  </div>
)}
```

Place this card before the main dashboard stats section so it's the first thing a new user sees.

- [ ] **Step 2: Add "Current password" field to SettingsView**

Read `src/features/settings/components/SettingsView.tsx`. Find the password change section. Add a `currentPassword` input above the `newPassword` input:

```tsx
<label className="text-sm font-medium text-slate-700">
  Current password
  <input
    type="password"
    name="currentPassword"
    required
    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-slate-300"
  />
</label>
```

- [ ] **Step 3: Update the password change server action**

Read `src/features/settings/actions.ts`. Find the action that handles password updates (likely `updateWorkspaceAction` or a separate `updatePasswordAction`). Add current-password verification:

```ts
// Inside the password-change action:
const currentPassword = getFormString(formData, "currentPassword");
const newPassword = getFormString(formData, "newPassword");

if (!currentPassword || !newPassword) {
  redirect("/settings?error=Both+current+and+new+password+are+required.");
}

// Verify the current password by signing in:
const { error: signInError } = await supabase.auth.signInWithPassword({
  email: user.email!,
  password: currentPassword,
});

if (signInError) {
  redirect("/settings?error=Current+password+is+incorrect.");
}

// Now update to the new password:
const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
if (updateError) {
  redirect(`/settings?error=${encodeURIComponent(updateError.message)}`);
}
redirect("/settings?toast=Password+updated");
```

- [ ] **Step 4: Build and commit**

```bash
npm run build
git add src/features/workspace/components/WorkspaceView.tsx \
        src/features/settings/components/SettingsView.tsx \
        src/features/settings/actions.ts
git commit -m "feat: add onboarding welcome card and current-password verification for password change"
```

```json:metadata
{"files": ["src/features/workspace/components/WorkspaceView.tsx", "src/features/settings/components/SettingsView.tsx", "src/features/settings/actions.ts"], "verifyCommand": "npm run build", "acceptanceCriteria": ["WorkspaceView shows welcome card when customers.length === 0", "SettingsView has currentPassword field", "Password change action verifies current password before updating", "npm run build exits 0"]}
```

---

### Task 9: Inline form validation for create/edit forms

**Goal:** Required field errors and invalid values show inline next to the field instead of requiring a page redirect + URL error param.

**Files:**
- Modify: `src/features/customers/actions.ts`
- Modify: `src/features/customers/components/CustomerForm.tsx`
- Modify: `src/features/leads/actions.ts`
- Modify: `src/features/leads/components/LeadForm.tsx`
- Modify: `src/features/jobs/actions.ts`
- Modify: `src/features/jobs/components/JobForm.tsx`
- Modify: `src/features/sales/actions.ts`
- Modify: `src/features/sales/components/SaleForm.tsx` (read path first)
- Modify: `src/features/follow-ups/actions.ts`
- Modify: `src/features/follow-ups/components/FollowUpForm.tsx` (read path first)

**Acceptance Criteria:**
- [ ] Submitting a customer form with no name shows "Name is required." inline without redirect
- [ ] Negative `estimated_value`, `job_value`, or `amount` shows "Must be a positive number." inline
- [ ] Invalid email format shows "Enter a valid email address." inline
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Understand the current form pattern**

Read `src/features/customers/components/CustomerForm.tsx` and `src/features/customers/actions.ts` in full. Note whether forms use `<form action={serverAction}>` or `useActionState`.

- [ ] **Step 2: Update server actions to return errors instead of redirecting**

Change actions from `redirect("/customers?error=Name+is+required.")` to returning a structured error object using `useActionState`. The action signature changes from:

```ts
export async function createCustomerAction(formData: FormData): Promise<void>
```

to:

```ts
export type ActionState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function createCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // validation:
  const name = getFormString(formData, "name");
  if (!name) return { fieldErrors: { name: "Name is required." } };

  const email = getFormString(formData, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { fieldErrors: { email: "Enter a valid email address." } };
  }

  // ... supabase insert ...
  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath("/workspace");
  redirect("/customers?toast=Customer+created");
}
```

Apply the same pattern to `updateCustomerAction`. Keep `deleteCustomerAction` as a plain redirect (deletes don't have form fields to validate).

- [ ] **Step 3: Update CustomerForm to use useActionState**

In `src/features/customers/components/CustomerForm.tsx`, add `useActionState`:

```tsx
"use client";

import { useActionState } from "react";
import { createCustomerAction, type ActionState } from "../actions";

export function CustomerCreateForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(createCustomerAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        Name *
        <input name="name" required className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
        {state?.fieldErrors?.name && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name}</p>
        )}
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Email
        <input name="email" type="email" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
        {state?.fieldErrors?.email && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email}</p>
        )}
      </label>

      {state?.error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton>Save customer</SubmitButton>
    </form>
  );
}
```

Read the actual `CustomerForm.tsx` first — adapt this pattern to the existing fields and structure rather than replacing everything.

- [ ] **Step 4: Apply same pattern to leads, jobs, sales, follow-ups**

Read each form component and action file. Apply the `useActionState` pattern:
- `leads`: validate `service_requested` required, `estimated_value >= 0`
- `jobs`: validate `service_type` required, `job_value >= 0`
- `sales`: validate `amount > 0`
- `follow-ups`: validate `message` required, `due_date` is a valid date string

- [ ] **Step 5: Build and commit**

```bash
npm run build
git add src/features/customers/ src/features/leads/ src/features/jobs/ src/features/sales/ src/features/follow-ups/
git commit -m "feat: inline form validation with useActionState across all feature forms"
```

```json:metadata
{"files": ["src/features/customers/actions.ts", "src/features/customers/components/CustomerForm.tsx", "src/features/leads/actions.ts", "src/features/leads/components/LeadForm.tsx", "src/features/jobs/actions.ts", "src/features/jobs/components/JobForm.tsx"], "verifyCommand": "npm run build", "acceptanceCriteria": ["Actions return fieldErrors object instead of redirecting on validation failure", "Form components use useActionState", "Inline error messages appear next to invalid fields", "npm run build exits 0"]}
```

---

### Task 10: Import — column mapping confirmation step

**Goal:** After CSV upload, show users which columns were auto-mapped and let them reassign unmapped ones before analysis runs.

**Files:**
- Modify: `src/app/imports/CsvImportSessionFlow.tsx`
- Modify: `src/app/api/import-sessions/csv/route.ts`

**Acceptance Criteria:**
- [ ] After file selection and clicking "Analyze", the component shows a mapping table instead of immediately navigating to the session
- [ ] Each detected column shows its mapped FrontierOps field in a dropdown
- [ ] Unmapped columns default to "Don't import"
- [ ] User clicks "Confirm and import" to create the session with the confirmed mapping
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Split the CSV API into analyze + create**

The current `POST /api/import-sessions/csv` both analyzes and creates the session. Add a query param `?analyze=1` to do analysis-only (return headers + guessed mapping, no session created):

In `src/app/api/import-sessions/csv/route.ts`, before `createImportSessionFromRows`, check for the analyze-only flag:

```ts
const analyzeOnly = requestUrl.searchParams.get("analyze") === "1";
// (parse requestUrl from request.url at the top of the handler)

if (analyzeOnly) {
  return NextResponse.json({ ok: true, headers, mapping });
}

// ... existing createImportSessionFromRows call ...
```

- [ ] **Step 2: Update CsvImportSessionFlow to two-step flow**

In `src/app/imports/CsvImportSessionFlow.tsx`, add a `mappingStep` state:

```tsx
type Step = "upload" | "mapping" | "done";

// Add to state:
const [step, setStep] = useState<Step>("upload");
const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
const [confirmedMapping, setConfirmedMapping] = useState<Record<string, string>>({});

// Change analyzeCsv to be analysis-only:
async function analyzeOnly() {
  if (!file) { setMessage("Choose a CSV file first."); return; }
  setAnalyzing(true);
  try {
    const formData = new FormData();
    formData.append("recordType", recordType);
    formData.append("csvFile", file);
    const response = await fetch("/api/import-sessions/csv?analyze=1", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Failed to analyze CSV."); return; }
    setDetectedHeaders(data.headers);
    setConfirmedMapping(data.mapping);
    setStep("mapping");
  } finally {
    setAnalyzing(false);
  }
}

// Add a confirmAndCreate function:
async function confirmAndCreate() {
  setAnalyzing(true);
  try {
    const formData = new FormData();
    formData.append("recordType", recordType);
    formData.append("csvFile", file!);
    formData.append("mapping", JSON.stringify(confirmedMapping));
    const response = await fetch("/api/import-sessions/csv", { method: "POST", body: formData });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Failed to create import."); return; }
    router.push(`/imports/sessions/${data.session_id}`);
  } finally {
    setAnalyzing(false);
  }
}
```

- [ ] **Step 3: Render the mapping step UI**

When `step === "mapping"`, render a table of detected headers with dropdowns:

```tsx
{step === "mapping" && (
  <div className="space-y-4">
    <p className="text-sm font-semibold text-slate-950">Review column mapping</p>
    <p className="text-sm text-slate-600">
      We matched your columns to FrontierOps fields. Adjust any that look wrong.
    </p>
    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
      {detectedHeaders.map((header) => (
        <div key={header} className="flex items-center gap-4 px-4 py-3">
          <p className="w-1/2 text-sm font-medium text-slate-700 truncate">"{header}"</p>
          <select
            value={confirmedMapping[header] ?? ""}
            onChange={(e) => setConfirmedMapping((m) => ({ ...m, [header]: e.target.value }))}
            className="w-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none"
          >
            <option value="">Don't import</option>
            {getFieldOptionsForRecordType(recordType).map((field) => (
              <option key={field.key} value={field.key}>{field.label}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
    <div className="flex gap-3">
      <button type="button" onClick={() => setStep("upload")}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
        Back
      </button>
      <button type="button" onClick={confirmAndCreate} disabled={analyzing}
        className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
        {analyzing ? "Importing..." : "Confirm and import"}
      </button>
    </div>
  </div>
)}
```

Add a helper `getFieldOptionsForRecordType(recordType)` that returns the field definitions from `importFieldDefinitions` in `src/lib/import-engine.ts`.

- [ ] **Step 4: Build and commit**

```bash
npm run build
git add src/app/imports/CsvImportSessionFlow.tsx src/app/api/import-sessions/csv/route.ts
git commit -m "feat: add column mapping confirmation step to CSV import flow"
```

```json:metadata
{"files": ["src/app/imports/CsvImportSessionFlow.tsx", "src/app/api/import-sessions/csv/route.ts"], "verifyCommand": "npm run build", "acceptanceCriteria": ["CSV upload shows mapping table before creating session", "Each detected column has a dropdown to reassign target field", "Confirmed mapping is sent on final submit", "npm run build exits 0"]}
```

---

### Task 11: Import — Excel support, CSV templates, bulk duplicate actions, error guidance

**Goal:** Accept `.xlsx` files, provide downloadable CSV templates, let users skip all duplicates at once, and show specific fix guidance on error rows.

**Files:**
- Modify: `src/app/api/import-sessions/csv/route.ts`
- Create: `public/templates/relationships-template.csv`
- Create: `public/templates/opportunities-template.csv`
- Create: `public/templates/work-template.csv`
- Create: `public/templates/revenue-template.csv`
- Create: `public/templates/actions-template.csv`
- Modify: `src/app/imports/CsvImportSessionFlow.tsx`
- Create: `src/app/api/import-sessions/[id]/rows/bulk/route.ts`
- Modify: `src/app/imports/sessions/[id]/ImportSessionReviewClient.tsx`

**Acceptance Criteria:**
- [ ] Uploading an `.xlsx` file parses correctly and follows the same flow as CSV
- [ ] Template download links appear in the upload section
- [ ] "Skip all duplicates" button appears when 3+ duplicate rows exist and resolves them all
- [ ] Error rows show the specific validation error with a skip button
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Add Excel parsing to the CSV API route**

In `src/app/api/import-sessions/csv/route.ts`, after reading the file, check the MIME type or extension and use `xlsx` if it's an Excel file:

```ts
import * as XLSX from "xlsx";

// After: const file = uploadedFile as File;
const isXlsx =
  file.name.endsWith(".xlsx") ||
  file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

let headers: string[];
let rows: RawImportRow[];

if (isXlsx) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
  rows = jsonData as RawImportRow[];
} else {
  const text = await file.text();
  const parsed = parseCsv(text);
  headers = parsed.headers;
  rows = parsed.rows;
}
```

Also update the file input in `CsvImportSessionFlow.tsx` to accept `.xlsx`:
```tsx
accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
```

- [ ] **Step 2: Create CSV template files**

Create each template as a static CSV with the correct headers and one example row:

`public/templates/relationships-template.csv`:
```
name,phone,email,address,customer_type,notes
Jane Smith,555-0100,jane@example.com,123 Main St,residential,VIP customer
```

`public/templates/opportunities-template.csv`:
```
service_requested,customer_name,status,estimated_value,source,next_follow_up_date,notes
Roof inspection,Jane Smith,new,1500,referral,2026-06-01,Called in
```

`public/templates/work-template.csv`:
```
service_type,customer_name,status,job_value,start_date,completed_date,paid_status,notes
Roof repair,Jane Smith,completed,2800,2026-05-01,2026-05-03,paid,
```

`public/templates/revenue-template.csv`:
```
amount,customer_name,payment_status,sale_date,service_type,source
2800,Jane Smith,paid,2026-05-03,Roof repair,job
```

`public/templates/actions-template.csv`:
```
message,customer_name,due_date,status
Call back about estimate,Jane Smith,2026-06-01,pending
```

- [ ] **Step 3: Add template download links to CsvImportSessionFlow**

In the upload section, below the record type selector, add:

```tsx
<p className="text-xs text-slate-500">
  Not sure about column names?{" "}
  <a
    href={`/templates/${recordType}-template.csv`}
    download
    className="font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
  >
    Download template
  </a>
</p>
```

- [ ] **Step 4: Create bulk rows API route**

Create `src/app/api/import-sessions/[id]/rows/bulk/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const companyId = await getCurrentCompanyId();
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, filter } = (await request.json()) as {
    action: "skip" | "update_existing";
    filter: "duplicates" | "errors";
  };

  const supabase = await createClient();

  // Verify session belongs to company
  const { data: session } = await supabase
    .from("import_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("company_id", companyId)
    .single();

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const statusFilter = filter === "duplicates" ? "duplicate" : "error";

  const { data: rows } = await supabase
    .from("import_rows")
    .select("id, target_id")
    .eq("session_id", sessionId)
    .eq("status", statusFilter);

  if (!rows?.length) return NextResponse.json({ updatedCount: 0 });

  for (const row of rows) {
    const newAction = action === "update_existing" && row.target_id ? "update_existing" : "skip";
    await supabase
      .from("import_rows")
      .update({ action: newAction, status: newAction === "skip" ? "skipped" : "valid" })
      .eq("id", row.id);
  }

  // Recount session stats
  const { count: validCount } = await supabase
    .from("import_rows")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "valid");

  const { count: dupCount } = await supabase
    .from("import_rows")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "duplicate");

  await supabase
    .from("import_sessions")
    .update({ valid_rows: validCount ?? 0, duplicate_rows: dupCount ?? 0 })
    .eq("id", sessionId);

  return NextResponse.json({ updatedCount: rows.length });
}
```

Note: check the actual Supabase table name for import rows — it may be `import_session_rows` or similar. Read `src/app/api/import-sessions/[id]/rows/[rowId]/route.ts` to confirm the table name before writing.

- [ ] **Step 5: Add bulk actions and error guidance to ImportSessionReviewClient**

In `src/app/imports/sessions/[id]/ImportSessionReviewClient.tsx`:

1. Add "Skip all duplicates" button above the row list when `session.duplicate_rows >= 3`:

```tsx
{session.duplicate_rows >= 3 && session.status !== "committed" && (
  <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-slate-100 bg-amber-50">
    <p className="text-sm font-semibold text-amber-800 flex-1">
      {session.duplicate_rows} duplicate rows found
    </p>
    <button type="button" onClick={() => bulkAction("skip", "duplicates")}
      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">
      Skip all duplicates
    </button>
    <button type="button" onClick={() => bulkAction("update_existing", "duplicates")}
      className="rounded-xl bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800">
      Update all matched
    </button>
  </div>
)}
```

Add the `bulkAction` function:
```tsx
async function bulkAction(action: "skip" | "update_existing", filter: "duplicates" | "errors") {
  const response = await fetch(`/api/import-sessions/${session.id}/rows/bulk`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, filter }),
  });
  const data = await response.json();
  if (!response.ok) { setMessage(data.error || "Bulk action failed."); return; }
  router.refresh();
}
```

2. For error rows, replace the generic "Needs fix" banner with specific validation errors (already in `row.validation_errors` array) and add a "Skip this row" button:

The validation errors are already shown — just ensure error rows also show the skip button (same as duplicate rows already have).

- [ ] **Step 6: Build and commit**

```bash
npm run build
git add src/app/api/import-sessions/ src/app/imports/ public/templates/
git commit -m "feat: xlsx support, CSV templates, bulk duplicate resolution, error row skip"
```

```json:metadata
{"files": ["src/app/api/import-sessions/csv/route.ts", "src/app/api/import-sessions/[id]/rows/bulk/route.ts", "src/app/imports/CsvImportSessionFlow.tsx", "src/app/imports/sessions/[id]/ImportSessionReviewClient.tsx", "public/templates/"], "verifyCommand": "npm run build", "acceptanceCriteria": ["xlsx files parse correctly", "5 template CSVs exist in public/templates/", "Bulk skip/update endpoints exist", "Skip all duplicates button shows when 3+ duplicate rows", "npm run build exits 0"]}
```

---

### Task 12: Integration sync framework + token refresh

**Goal:** Create the shared integration sync infrastructure: a registry interface, a token refresh utility, and a shared sync API route that all 5 integrations will use.

**Files:**
- Create: `src/lib/integrations/types.ts`
- Create: `src/lib/integrations/token.ts`
- Create: `src/lib/integrations/registry.ts`
- Create: `src/app/api/integrations/sync/[provider]/route.ts`

**Acceptance Criteria:**
- [ ] `IntegrationSyncer` interface defined in `types.ts`
- [ ] `refreshIntegrationToken` function handles token refresh and updates `integrations` table
- [ ] `POST /api/integrations/sync/[provider]` returns 404 for unknown providers and calls the correct syncer
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Define the shared types**

Create `src/lib/integrations/types.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

export type IntegrationRow = Database["public"]["Tables"]["integrations"]["Row"];

export type SyncResult = {
  customersCreated: number;
  customersUpdated: number;
  recordsStaged: number;
  sessionIds: string[];
  error?: string;
};

export interface IntegrationSyncer {
  provider: string;
  sync(
    supabase: SupabaseClient<Database>,
    companyId: string,
    integration: IntegrationRow,
  ): Promise<SyncResult>;
}
```

- [ ] **Step 2: Create the token refresh utility**

Create `src/lib/integrations/token.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import type { IntegrationRow } from "./types";

type RefreshResult = { accessToken: string; expiresAt: string | null };

const refreshers: Record<string, (integration: IntegrationRow) => Promise<RefreshResult>> = {};

export function registerRefresher(
  provider: string,
  fn: (integration: IntegrationRow) => Promise<RefreshResult>,
) {
  refreshers[provider] = fn;
}

export async function refreshIntegrationToken(
  supabase: SupabaseClient<Database>,
  integration: IntegrationRow,
): Promise<string> {
  // If token is still valid (>5 min remaining), return as-is
  if (integration.token_expires_at) {
    const expiresAt = new Date(integration.token_expires_at).getTime();
    if (expiresAt - Date.now() > 5 * 60 * 1000) {
      return integration.access_token!;
    }
  }

  const refresher = refreshers[integration.provider];
  if (!refresher) return integration.access_token!;

  const { accessToken, expiresAt } = await refresher(integration);

  await supabase
    .from("integrations")
    .update({
      access_token: accessToken,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", integration.id);

  return accessToken;
}
```

Note: `updated_at` may not exist in the schema — read the `integrations` table schema via the Supabase types in `src/types/db.ts` and only include columns that exist.

- [ ] **Step 3: Create the registry**

Create `src/lib/integrations/registry.ts`:

```ts
import type { IntegrationSyncer } from "./types";

const registry = new Map<string, IntegrationSyncer>();

export function registerSyncer(syncer: IntegrationSyncer) {
  registry.set(syncer.provider, syncer);
}

export function getSyncer(provider: string): IntegrationSyncer | undefined {
  return registry.get(provider);
}
```

- [ ] **Step 4: Create the shared sync API route**

Create `src/app/api/integrations/sync/[provider]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/current-company";
import { getSyncer } from "@/lib/integrations/registry";
import { refreshIntegrationToken } from "@/lib/integrations/token";

// Import all syncers so they register themselves
import "@/lib/integrations/quickbooks";
import "@/lib/integrations/hubspot";
import "@/lib/integrations/jobber";
import "@/lib/integrations/square";
import "@/lib/integrations/stripe";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const companyId = await getCurrentCompanyId();
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const syncer = getSyncer(provider);
  if (!syncer) return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 404 });

  const supabase = await createClient();

  const { data: integration, error: intError } = await supabase
    .from("integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", provider)
    .eq("status", "active")
    .maybeSingle();

  if (intError || !integration) {
    return NextResponse.json({ error: "Integration not connected" }, { status: 400 });
  }

  try {
    await refreshIntegrationToken(supabase, integration);
    // Re-fetch after potential token update
    const { data: freshIntegration } = await supabase
      .from("integrations")
      .select("*")
      .eq("id", integration.id)
      .single();

    const result = await syncer.sync(supabase, companyId, freshIntegration!);

    // Record sync run
    await supabase.from("sync_runs").insert({
      company_id: companyId,
      connection_id: null,
      status: "completed",
      records_created: result.customersCreated,
      records_updated: result.customersUpdated,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      metadata: { source_type: provider, staged_sessions: result.sessionIds },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";

    await supabase.from("sync_runs").insert({
      company_id: companyId,
      connection_id: null,
      status: "failed",
      records_created: 0,
      records_updated: 0,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      metadata: { source_type: provider, error: message },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

Note: The `sync_runs` table insert columns may differ from what's shown. Check `src/types/db.ts` for the actual `sync_runs` table schema and adjust accordingly.

- [ ] **Step 5: Build and commit**

```bash
npm run build
git add src/lib/integrations/ src/app/api/integrations/sync/
git commit -m "feat: integration sync framework — registry, token refresh, shared sync route"
```

```json:metadata
{"files": ["src/lib/integrations/types.ts", "src/lib/integrations/token.ts", "src/lib/integrations/registry.ts", "src/app/api/integrations/sync/[provider]/route.ts"], "verifyCommand": "npm run build", "acceptanceCriteria": ["IntegrationSyncer interface defined", "refreshIntegrationToken checks expiry and updates DB", "POST /api/integrations/sync/[provider] exists and returns 404 for unknown providers", "npm run build exits 0"]}
```

---

### Task 13: QuickBooks sync

**Goal:** Implement the QuickBooks data syncer that pulls customers, invoices, and estimates from the QBO API and stages them as import sessions.

**Files:**
- Create: `src/lib/integrations/quickbooks.ts`

**Acceptance Criteria:**
- [ ] `QuickBooksSyncer` implements `IntegrationSyncer`
- [ ] Fetches customers from `SELECT * FROM Customer` QBO query
- [ ] Fetches invoices from `SELECT * FROM Invoice` QBO query
- [ ] Fetches estimates from `SELECT * FROM Estimate` QBO query
- [ ] Each data type creates an import session via `createImportSessionFromRows`
- [ ] Token refresh is registered via `registerRefresher`
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Read the import engine and integration types**

Read `src/lib/import-engine.ts` to understand `createImportSessionFromRows` signature. Read `src/lib/integrations/types.ts` (created in Task 12).

- [ ] **Step 2: Create the QuickBooks syncer**

Create `src/lib/integrations/quickbooks.ts`:

```ts
import { registerSyncer } from "./registry";
import { registerRefresher } from "./token";
import { createImportSessionFromRows } from "@/lib/import-engine";
import type { IntegrationSyncer, IntegrationRow, SyncResult } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

const QBO_BASE = "https://quickbooks.api.intuit.com/v3/company";

async function qboQuery(
  accessToken: string,
  realmId: string,
  query: string,
): Promise<Record<string, unknown>[]> {
  const url = `${QBO_BASE}/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`QBO query failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const queryResponse = data.QueryResponse as Record<string, unknown> | undefined;
  // The entity name is the first key in QueryResponse (e.g., "Customer", "Invoice")
  const entityKey = queryResponse ? Object.keys(queryResponse).find((k) => k !== "startPosition" && k !== "maxResults" && k !== "totalCount") : undefined;
  if (!entityKey || !queryResponse) return [];
  return (queryResponse[entityKey] as Record<string, unknown>[]) ?? [];
}

const QuickBooksSyncer: IntegrationSyncer = {
  provider: "quickbooks",

  async sync(supabase, companyId, integration) {
    const accessToken = integration.access_token!;
    const realmId = (integration.metadata as Record<string, unknown>)?.realm_id as string;

    if (!realmId) throw new Error("QuickBooks realm ID not found in integration metadata.");

    const result: SyncResult = { customersCreated: 0, customersUpdated: 0, recordsStaged: 0, sessionIds: [] };

    // Sync Customers → relationships
    const customers = await qboQuery(accessToken, realmId, "SELECT * FROM Customer MAXRESULTS 500");
    if (customers.length > 0) {
      const rows = customers.map((c) => ({
        name: String((c.DisplayName ?? c.FullyQualifiedName ?? c.CompanyName) ?? ""),
        email: String((c as Record<string, unknown>).PrimaryEmailAddr
          ? ((c as Record<string, Record<string, unknown>>).PrimaryEmailAddr.Address ?? "")
          : ""),
        phone: String((c as Record<string, unknown>).PrimaryPhone
          ? ((c as Record<string, Record<string, unknown>>).PrimaryPhone.FreeFormNumber ?? "")
          : ""),
        address: (() => {
          const addr = (c as Record<string, unknown>).BillAddr as Record<string, unknown> | undefined;
          if (!addr) return "";
          return [addr.Line1, addr.City, addr.CountrySubDivisionCode, addr.PostalCode].filter(Boolean).join(", ");
        })(),
        customer_type: "business",
      }));

      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "quickbooks", sourceName: `QuickBooks (${realmId})`,
        fileName: null, recordType: "relationships", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    // Sync Invoices → revenue
    const invoices = await qboQuery(accessToken, realmId, "SELECT * FROM Invoice MAXRESULTS 500");
    if (invoices.length > 0) {
      const rows = invoices.map((inv) => ({
        amount: String((inv as Record<string, unknown>).TotalAmt ?? "0"),
        payment_status: (inv as Record<string, unknown>).Balance === 0 ? "paid" : "unpaid",
        sale_date: String((inv as Record<string, unknown>).TxnDate ?? ""),
        service_type: "Invoice",
        source: "quickbooks",
      }));

      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "quickbooks", sourceName: `QuickBooks Invoices`,
        fileName: null, recordType: "revenue", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    // Sync Estimates → opportunities
    const estimates = await qboQuery(accessToken, realmId, "SELECT * FROM Estimate MAXRESULTS 500");
    if (estimates.length > 0) {
      const rows = estimates.map((est) => ({
        service_requested: `Estimate #${(est as Record<string, unknown>).DocNumber ?? ""}`,
        estimated_value: String((est as Record<string, unknown>).TotalAmt ?? "0"),
        status: String((est as Record<string, unknown>).TxnStatus ?? "new"),
        source: "quickbooks",
      }));

      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "quickbooks", sourceName: `QuickBooks Estimates`,
        fileName: null, recordType: "opportunities", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    return result;
  },
};

registerSyncer(QuickBooksSyncer);

// Token refresh for QuickBooks
registerRefresher("quickbooks", async (integration) => {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID!;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: integration.refresh_token!,
    }),
  });

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("QuickBooks token refresh failed");

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
  };
});
```

Note: `createImportSessionFromRows` must return `{ sessionId }` — check its actual return type in `src/lib/import-engine.ts` and adjust the destructuring.

- [ ] **Step 3: Build and commit**

```bash
npm run build
git add src/lib/integrations/quickbooks.ts
git commit -m "feat: QuickBooks sync — customers, invoices, and estimates staged as import sessions"
```

```json:metadata
{"files": ["src/lib/integrations/quickbooks.ts"], "verifyCommand": "npm run build", "acceptanceCriteria": ["QuickBooksSyncer implements IntegrationSyncer", "registerSyncer and registerRefresher called at module level", "qboQuery helper fetches from QBO API", "npm run build exits 0"]}
```

---

### Task 14: HubSpot sync

**Goal:** Implement the HubSpot syncer that pulls contacts, deals, and notes and stages them as import sessions.

**Files:**
- Create: `src/lib/integrations/hubspot.ts`

**Acceptance Criteria:**
- [ ] Fetches contacts from HubSpot CRM API v3
- [ ] Fetches deals from HubSpot CRM API v3
- [ ] Fetches notes from HubSpot CRM API v3
- [ ] Each type staged as an import session
- [ ] Token refresh registered
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create the HubSpot syncer**

Create `src/lib/integrations/hubspot.ts`:

```ts
import { registerSyncer } from "./registry";
import { registerRefresher } from "./token";
import { createImportSessionFromRows } from "@/lib/import-engine";
import type { IntegrationSyncer, SyncResult } from "./types";

const HUBSPOT_BASE = "https://api.hubapi.com";

async function hsGet(accessToken: string, path: string): Promise<Record<string, unknown>[]> {
  const url = `${HUBSPOT_BASE}${path}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });

  if (!response.ok) throw new Error(`HubSpot API error (${response.status}): ${path}`);

  const data = (await response.json()) as { results?: Record<string, unknown>[] };
  return data.results ?? [];
}

const HubSpotSyncer: IntegrationSyncer = {
  provider: "hubspot",

  async sync(supabase, companyId, integration) {
    const accessToken = integration.access_token!;
    const result: SyncResult = { customersCreated: 0, customersUpdated: 0, recordsStaged: 0, sessionIds: [] };

    // Contacts → relationships
    const contacts = await hsGet(
      accessToken,
      "/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,company",
    );
    if (contacts.length > 0) {
      const rows = contacts.map((c) => {
        const props = (c.properties ?? {}) as Record<string, string>;
        const name = [props.firstname, props.lastname].filter(Boolean).join(" ") || props.company || "Unknown";
        return { name, email: props.email ?? "", phone: props.phone ?? "", customer_type: "contact" };
      });
      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "hubspot", sourceName: "HubSpot Contacts",
        fileName: null, recordType: "relationships", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    // Deals → opportunities
    const deals = await hsGet(
      accessToken,
      "/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,lead_source,closedate",
    );
    if (deals.length > 0) {
      const rows = deals.map((d) => {
        const props = (d.properties ?? {}) as Record<string, string>;
        return {
          service_requested: props.dealname ?? "Deal",
          estimated_value: props.amount ?? "0",
          status: props.dealstage ?? "new",
          source: props.lead_source ?? "hubspot",
          next_follow_up_date: props.closedate ?? "",
        };
      });
      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "hubspot", sourceName: "HubSpot Deals",
        fileName: null, recordType: "opportunities", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    // Notes → actions (follow-ups)
    const notes = await hsGet(
      accessToken,
      "/crm/v3/objects/notes?limit=100&properties=hs_note_body,hs_timestamp",
    );
    if (notes.length > 0) {
      const rows = notes.map((n) => {
        const props = (n.properties ?? {}) as Record<string, string>;
        return {
          message: props.hs_note_body ?? "HubSpot note",
          due_date: props.hs_timestamp ? props.hs_timestamp.split("T")[0] : "",
          status: "pending",
        };
      });
      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "hubspot", sourceName: "HubSpot Notes",
        fileName: null, recordType: "actions", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    return result;
  },
};

registerSyncer(HubSpotSyncer);

registerRefresher("hubspot", async (integration) => {
  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      refresh_token: integration.refresh_token!,
    }),
  });

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("HubSpot token refresh failed");

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
  };
});
```

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/lib/integrations/hubspot.ts
git commit -m "feat: HubSpot sync — contacts, deals, notes staged as import sessions"
```

```json:metadata
{"files": ["src/lib/integrations/hubspot.ts"], "verifyCommand": "npm run build", "acceptanceCriteria": ["HubSpotSyncer implements IntegrationSyncer", "Fetches contacts, deals, notes from HubSpot API v3", "npm run build exits 0"]}
```

---

### Task 15: Jobber sync

**Goal:** Implement the Jobber GraphQL syncer that pulls clients, jobs, and invoices.

**Files:**
- Create: `src/lib/integrations/jobber.ts`

**Acceptance Criteria:**
- [ ] Fetches clients, jobs, and invoices via Jobber GraphQL API
- [ ] Each staged as import session
- [ ] Token refresh registered
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create the Jobber syncer**

Create `src/lib/integrations/jobber.ts`:

```ts
import { registerSyncer } from "./registry";
import { registerRefresher } from "./token";
import { createImportSessionFromRows } from "@/lib/import-engine";
import type { IntegrationSyncer, SyncResult } from "./types";

const JOBBER_GQL = "https://api.getjobber.com/api/graphql";

async function jobberQuery(accessToken: string, query: string): Promise<Record<string, unknown>> {
  const response = await fetch(JOBBER_GQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-JOBBER-GRAPHQL-VERSION": "2024-01-08",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) throw new Error(`Jobber API error: ${response.status}`);

  const json = (await response.json()) as { data?: Record<string, unknown>; errors?: unknown[] };
  if (json.errors?.length) throw new Error(`Jobber GraphQL errors: ${JSON.stringify(json.errors)}`);

  return json.data ?? {};
}

const JobberSyncer: IntegrationSyncer = {
  provider: "jobber",

  async sync(supabase, companyId, integration) {
    const accessToken = integration.access_token!;
    const result: SyncResult = { customersCreated: 0, customersUpdated: 0, recordsStaged: 0, sessionIds: [] };

    // Clients → relationships
    const clientData = await jobberQuery(accessToken, `{
      clients(first: 100) {
        nodes { name emails { address } phones { number } billingAddress { street city province postalCode } }
      }
    }`);

    const clients = ((clientData.clients as Record<string, unknown>)?.nodes ?? []) as Record<string, unknown>[];
    if (clients.length > 0) {
      const rows = clients.map((c) => ({
        name: String(c.name ?? ""),
        email: String(((c.emails as Record<string, unknown>[])?.[0]?.address) ?? ""),
        phone: String(((c.phones as Record<string, unknown>[])?.[0]?.number) ?? ""),
        address: (() => {
          const addr = c.billingAddress as Record<string, string> | undefined;
          if (!addr) return "";
          return [addr.street, addr.city, addr.province, addr.postalCode].filter(Boolean).join(", ");
        })(),
      }));
      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "jobber", sourceName: "Jobber Clients",
        fileName: null, recordType: "relationships", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    // Jobs → work
    const jobData = await jobberQuery(accessToken, `{
      jobs(first: 100) {
        nodes { title jobStatus total startAt completedAt invoiceStatus }
      }
    }`);

    const jobs = ((jobData.jobs as Record<string, unknown>)?.nodes ?? []) as Record<string, unknown>[];
    if (jobs.length > 0) {
      const rows = jobs.map((j) => ({
        service_type: String(j.title ?? "Job"),
        status: String(j.jobStatus ?? "").toLowerCase(),
        job_value: String(j.total ?? "0"),
        start_date: j.startAt ? String(j.startAt).split("T")[0] : "",
        completed_date: j.completedAt ? String(j.completedAt).split("T")[0] : "",
        paid_status: j.invoiceStatus === "PAID" ? "paid" : "unpaid",
      }));
      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "jobber", sourceName: "Jobber Jobs",
        fileName: null, recordType: "work", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    // Invoices → revenue
    const invoiceData = await jobberQuery(accessToken, `{
      invoices(first: 100) {
        nodes { invoiceNum total invoiceStatus issuedDate }
      }
    }`);

    const invoices = ((invoiceData.invoices as Record<string, unknown>)?.nodes ?? []) as Record<string, unknown>[];
    if (invoices.length > 0) {
      const rows = invoices.map((inv) => ({
        amount: String(inv.total ?? "0"),
        payment_status: inv.invoiceStatus === "PAID" ? "paid" : "unpaid",
        sale_date: inv.issuedDate ? String(inv.issuedDate).split("T")[0] : "",
        service_type: `Invoice #${inv.invoiceNum ?? ""}`,
        source: "jobber",
      }));
      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "jobber", sourceName: "Jobber Invoices",
        fileName: null, recordType: "revenue", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    return result;
  },
};

registerSyncer(JobberSyncer);

registerRefresher("jobber", async (integration) => {
  const response = await fetch("https://api.getjobber.com/api/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.JOBBER_CLIENT_ID!,
      client_secret: process.env.JOBBER_CLIENT_SECRET!,
      refresh_token: integration.refresh_token!,
    }),
  });

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Jobber token refresh failed");

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
  };
});
```

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/lib/integrations/jobber.ts
git commit -m "feat: Jobber sync — clients, jobs, invoices staged as import sessions"
```

```json:metadata
{"files": ["src/lib/integrations/jobber.ts"], "verifyCommand": "npm run build", "acceptanceCriteria": ["JobberSyncer implements IntegrationSyncer via GraphQL", "npm run build exits 0"]}
```

---

### Task 16: Square sync

**Goal:** Implement the Square syncer that pulls customers and transactions.

**Files:**
- Create: `src/lib/integrations/square.ts`

**Acceptance Criteria:**
- [ ] Fetches customers and payments from Square Connect API v2
- [ ] Each staged as import session
- [ ] Token refresh registered
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create the Square syncer**

Create `src/lib/integrations/square.ts`:

```ts
import { registerSyncer } from "./registry";
import { registerRefresher } from "./token";
import { createImportSessionFromRows } from "@/lib/import-engine";
import type { IntegrationSyncer, SyncResult } from "./types";

const SQUARE_BASE = "https://connect.squareup.com/v2";

async function squareGet(accessToken: string, path: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${SQUARE_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    },
  });

  if (!response.ok) throw new Error(`Square API error (${response.status}): ${path}`);

  return response.json() as Promise<Record<string, unknown>>;
}

const SquareSyncer: IntegrationSyncer = {
  provider: "square",

  async sync(supabase, companyId, integration) {
    const accessToken = integration.access_token!;
    const result: SyncResult = { customersCreated: 0, customersUpdated: 0, recordsStaged: 0, sessionIds: [] };

    // Customers → relationships
    const customerData = await squareGet(accessToken, "/customers?limit=100");
    const customers = (customerData.customers ?? []) as Record<string, unknown>[];
    if (customers.length > 0) {
      const rows = customers.map((c) => {
        const addr = c.address as Record<string, string> | undefined;
        return {
          name: [c.given_name, c.family_name].filter(Boolean).join(" ") || String(c.company_name ?? "Customer"),
          email: String(c.email_address ?? ""),
          phone: String(c.phone_number ?? ""),
          address: addr ? [addr.address_line_1, addr.locality, addr.administrative_district_level_1, addr.postal_code].filter(Boolean).join(", ") : "",
        };
      });
      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "square", sourceName: "Square Customers",
        fileName: null, recordType: "relationships", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    // Payments → revenue
    const paymentData = await squareGet(accessToken, "/payments?limit=100");
    const payments = (paymentData.payments ?? []) as Record<string, unknown>[];
    if (payments.length > 0) {
      const rows = payments.map((p) => {
        const money = p.amount_money as Record<string, number> | undefined;
        const amountCents = money?.amount ?? 0;
        const createdAt = String(p.created_at ?? "");
        return {
          amount: String(amountCents / 100),
          payment_status: p.status === "COMPLETED" ? "paid" : "unpaid",
          sale_date: createdAt ? createdAt.split("T")[0] : "",
          service_type: "Square payment",
          source: "square",
        };
      });
      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "square", sourceName: "Square Payments",
        fileName: null, recordType: "revenue", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    return result;
  },
};

registerSyncer(SquareSyncer);

registerRefresher("square", async (integration) => {
  const response = await fetch("https://connect.squareup.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Square-Version": "2024-01-18" },
    body: JSON.stringify({
      client_id: process.env.SQUARE_CLIENT_ID,
      client_secret: process.env.SQUARE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: integration.refresh_token,
    }),
  });

  const data = (await response.json()) as { access_token?: string; expires_at?: string };
  if (!data.access_token) throw new Error("Square token refresh failed");

  return { accessToken: data.access_token, expiresAt: data.expires_at ?? null };
});
```

- [ ] **Step 2: Build and commit**

```bash
npm run build
git add src/lib/integrations/square.ts
git commit -m "feat: Square sync — customers and payments staged as import sessions"
```

```json:metadata
{"files": ["src/lib/integrations/square.ts"], "verifyCommand": "npm run build", "acceptanceCriteria": ["SquareSyncer implements IntegrationSyncer", "npm run build exits 0"]}
```

---

### Task 17: Stripe sync

**Goal:** Implement the Stripe syncer that pulls customers and charges. Stripe uses a secret key stored on the integration, not OAuth.

**Files:**
- Create: `src/lib/integrations/stripe.ts`

**Acceptance Criteria:**
- [ ] Fetches customers and charges via Stripe API
- [ ] Uses `access_token` field as the Stripe restricted key (no OAuth refresh needed)
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create the Stripe syncer**

Create `src/lib/integrations/stripe.ts`:

```ts
import { registerSyncer } from "./registry";
import { createImportSessionFromRows } from "@/lib/import-engine";
import type { IntegrationSyncer, SyncResult } from "./types";

const STRIPE_BASE = "https://api.stripe.com/v1";

async function stripeGet(secretKey: string, path: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${STRIPE_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  if (!response.ok) throw new Error(`Stripe API error (${response.status}): ${path}`);

  return response.json() as Promise<Record<string, unknown>>;
}

const StripeSyncer: IntegrationSyncer = {
  provider: "stripe",

  async sync(supabase, companyId, integration) {
    // Stripe uses a secret key stored as access_token — no OAuth refresh
    const secretKey = integration.access_token!;
    const result: SyncResult = { customersCreated: 0, customersUpdated: 0, recordsStaged: 0, sessionIds: [] };

    // Customers → relationships
    const customerData = await stripeGet(secretKey, "/customers?limit=100");
    const customers = (customerData.data ?? []) as Record<string, unknown>[];
    if (customers.length > 0) {
      const rows = customers.map((c) => ({
        name: String(c.name ?? c.email ?? "Stripe customer"),
        email: String(c.email ?? ""),
        phone: String(c.phone ?? ""),
        address: (() => {
          const addr = c.address as Record<string, string> | undefined;
          if (!addr) return "";
          return [addr.line1, addr.city, addr.state, addr.postal_code].filter(Boolean).join(", ");
        })(),
      }));
      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "stripe", sourceName: "Stripe Customers",
        fileName: null, recordType: "relationships", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    // Charges → revenue
    const chargeData = await stripeGet(secretKey, "/charges?limit=100");
    const charges = (chargeData.data ?? []) as Record<string, unknown>[];
    if (charges.length > 0) {
      const rows = charges.map((ch) => ({
        amount: String(Number(ch.amount ?? 0) / 100),
        payment_status: ch.paid ? "paid" : "unpaid",
        sale_date: ch.created
          ? new Date(Number(ch.created) * 1000).toISOString().split("T")[0]
          : "",
        service_type: String(ch.description ?? "Stripe charge"),
        source: "stripe",
      }));
      const { sessionId } = await createImportSessionFromRows({
        supabase, companyId, sourceType: "stripe", sourceName: "Stripe Charges",
        fileName: null, recordType: "revenue", rows, mapping: {},
      });
      result.sessionIds.push(sessionId);
      result.recordsStaged += rows.length;
    }

    return result;
  },
};

registerSyncer(StripeSyncer);
// No registerRefresher for Stripe — it uses a long-lived secret key
```

- [ ] **Step 2: Check the Stripe callback route**

Read `src/app/api/integrations/stripe/callback/route.ts`. Stripe's callback likely stores the API key differently. Ensure `access_token` contains the Stripe secret key (or adjust where the syncer reads it from).

- [ ] **Step 3: Build and commit**

```bash
npm run build
git add src/lib/integrations/stripe.ts
git commit -m "feat: Stripe sync — customers and charges staged as import sessions"
```

```json:metadata
{"files": ["src/lib/integrations/stripe.ts"], "verifyCommand": "npm run build", "acceptanceCriteria": ["StripeSyncer implements IntegrationSyncer", "Uses access_token as Stripe secret key without OAuth refresh", "npm run build exits 0"]}
```

---

### Task 18: Integration sync UI — Sync Now button and status

**Goal:** Add a "Sync now" button to each connected integration on the Imports page and Settings page, with last-synced timestamp and result toast.

**Files:**
- Create: `src/components/ui/SyncNowButton.tsx`
- Modify: `src/features/imports/components/ImportsView.tsx`
- Modify: `src/features/settings/components/SettingsView.tsx`

**Acceptance Criteria:**
- [ ] Each connected integration shows a "Sync now" button
- [ ] Clicking "Sync now" calls `POST /api/integrations/sync/[provider]`
- [ ] Success shows toast "QuickBooks sync complete — 45 records staged"
- [ ] Error shows toast with error message
- [ ] Button shows spinner during sync
- [ ] `npm run build` exits 0

**Verify:** `npm run build` → exits 0

**Steps:**

- [ ] **Step 1: Create SyncNowButton**

Create `src/components/ui/SyncNowButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function SyncNowButton({ provider, label }: { provider: string; label: string }) {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setSyncing(true);
    try {
      const response = await fetch(`/api/integrations/sync/${provider}`, { method: "POST" });
      const data = await response.json() as { recordsStaged?: number; error?: string };

      if (!response.ok) {
        toast.error(data.error ?? `${label} sync failed`);
        return;
      }

      toast.success(`${label} sync complete — ${data.recordsStaged ?? 0} records staged for review`);
      router.refresh();
    } catch {
      toast.error(`Something went wrong syncing ${label}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={syncing}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {syncing && (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
      )}
      {syncing ? "Syncing…" : "Sync now"}
    </button>
  );
}
```

- [ ] **Step 2: Add SyncNowButton to the "Add data" section of ImportsView**

Read `src/features/imports/components/ImportsView.tsx`. In the "Add data" section, add a third card for each connected integration (QuickBooks, HubSpot, Jobber, Square, Stripe). Each integration block shows its name, status, and the `SyncNowButton`:

```tsx
import { SyncNowButton } from "@/components/ui/SyncNowButton";

// In the "Add data" grid, after the CSV and Google Sheets cards:
{integrations.filter(i => ["quickbooks","hubspot","jobber","square","stripe"].includes(i.provider ?? "")).map((integration) => (
  <div key={integration.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="font-semibold text-slate-950">{getSourceLabel(integration.provider)}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Sync your connected account data into FrontierOps for review.
        </p>
      </div>
      <StatusBadge tone={getStatusTone(integration.status)}>{getStatusLabel(integration.status)}</StatusBadge>
    </div>
    <SyncNowButton provider={integration.provider!} label={getSourceLabel(integration.provider)} />
  </div>
))}
```

- [ ] **Step 3: Add SyncNowButton to SettingsView integration cards**

Read `src/features/settings/components/SettingsView.tsx`. Find each integration card (QuickBooks, HubSpot, etc.) and add a `SyncNowButton` alongside the existing connect/disconnect UI. Only show it when the integration status is "active".

- [ ] **Step 4: Build and commit**

```bash
npm run build
git add src/components/ui/SyncNowButton.tsx \
        src/features/imports/components/ImportsView.tsx \
        src/features/settings/components/SettingsView.tsx
git commit -m "feat: add Sync Now button to all connected integrations on Imports and Settings pages"
```

```json:metadata
{"files": ["src/components/ui/SyncNowButton.tsx", "src/features/imports/components/ImportsView.tsx", "src/features/settings/components/SettingsView.tsx"], "verifyCommand": "npm run build", "acceptanceCriteria": ["SyncNowButton calls POST /api/integrations/sync/[provider]", "Success and error toasts appear", "Button shows spinner during sync", "npm run build exits 0"]}
```

---

### Task 19: Final build verification

**Goal:** Confirm the complete production-readiness implementation compiles cleanly with zero TypeScript errors.

**Files:** (no new files)

**Acceptance Criteria:**
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

**Verify:** `npm run build && npx tsc --noEmit` → both exit 0

**Steps:**

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Fix any errors before continuing.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 3: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors from production-readiness pass"
```

```json:metadata
{"files": [], "verifyCommand": "npm run build && npx tsc --noEmit", "acceptanceCriteria": ["npm run build exits 0", "npx tsc --noEmit exits 0"]}
```

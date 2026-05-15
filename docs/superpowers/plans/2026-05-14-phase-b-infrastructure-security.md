# Phase B: Infrastructure & Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the platform's server infrastructure — lock down the cron endpoint, unify sync routing through the registry, add rate limiting on high-value endpoints, and cut redundant DB queries in the workspace dashboard.

**Architecture:** The cron route gets a mandatory `CRON_SECRET` gate and is refactored to loop over `integrations` rows using `getSyncer()` from the registry (replaces per-provider helpers, adds Stripe automatically). Rate limiting uses an in-memory sliding-window Map (no external deps). Workspace queries add server-side filters to skip irrelevant rows before they reach the client.

**Tech Stack:** Next.js App Router, Supabase (service role), TypeScript, existing `src/lib/integrations/registry.ts` and `src/lib/integrations/token.ts`

---

### Task 1: Make CRON_SECRET mandatory and fail loudly at startup

**Goal:** Prevent the cron sync endpoint from running unauthenticated by requiring `CRON_SECRET` to be non-empty at call time and returning a clear 500 if it is missing.

**Files:**
- Modify: `src/app/api/cron/sync/route.ts`

**Acceptance Criteria:**
- [ ] `GET /api/cron/sync` with no `Authorization` header returns HTTP 401
- [ ] `GET /api/cron/sync` with wrong secret returns HTTP 401
- [ ] `GET /api/cron/sync` with correct secret proceeds normally
- [ ] If `CRON_SECRET` env var is missing/empty, endpoint returns HTTP 500 with message `"CRON_SECRET is not configured"`

**Verify:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/cron/sync` → `401`

**Steps:**

- [ ] **Step 1: Read the current file**

```bash
cat src/app/api/cron/sync/route.ts
```

- [ ] **Step 2: Replace the auth check at the top of the GET handler**

Replace the existing optional secret check with:

```typescript
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... rest of handler
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/sync/route.ts
git commit -m "security: require CRON_SECRET on cron sync endpoint"
```

---

### Task 2: Consolidate cron sync to use the integration registry

**Goal:** Replace the hand-rolled per-provider sync logic in the cron route with a loop over all active `integrations` rows that calls `getSyncer()`, so Stripe (and any future provider) is included automatically.

**Files:**
- Modify: `src/app/api/cron/sync/route.ts`
- Read: `src/lib/integrations/registry.ts`
- Read: `src/lib/integrations/token.ts`
- Read: `src/lib/supabase/service.ts`

**Acceptance Criteria:**
- [ ] Cron route no longer references provider-specific helper functions
- [ ] Cron route calls `getSyncer(integration.provider)` for each active integration row
- [ ] Providers without a registered syncer are skipped (not thrown)
- [ ] Stripe syncs are included in the cron run
- [ ] Each sync result is logged to `sync_runs` table

**Verify:** Read resulting file and confirm no per-provider imports remain.

**Steps:**

- [ ] **Step 1: Read the existing cron route to understand its structure**

```bash
cat src/app/api/cron/sync/route.ts
```

- [ ] **Step 2: Read registry and token utilities**

```bash
cat src/lib/integrations/registry.ts
cat src/lib/integrations/token.ts
cat src/lib/supabase/service.ts
```

- [ ] **Step 3: Rewrite the cron route body**

After the auth guard (Task 1), replace the sync logic with:

```typescript
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSyncer } from "@/lib/integrations/registry";
import { refreshIntegrationToken } from "@/lib/integrations/token";

// ensure all syncers are registered
import "@/app/api/integrations/sync/[provider]/route";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: integrations } = await supabase
    .from("integrations")
    .select("*")
    .eq("status", "active");

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ ok: true, results: [] });
  }

  const results: Array<{ provider: string; companyId: string; ok: boolean; error?: string }> = [];

  for (const integration of integrations) {
    const syncer = getSyncer(integration.provider);
    if (!syncer) {
      results.push({ provider: integration.provider, companyId: integration.company_id, ok: false, error: "no syncer registered" });
      continue;
    }

    try {
      const freshIntegration = await refreshIntegrationToken(supabase, integration);
      const result = await syncer.sync(supabase, integration.company_id, freshIntegration);

      await supabase.from("sync_runs").insert({
        integration_id: integration.id,
        company_id: integration.company_id,
        provider: integration.provider,
        status: result.error ? "error" : "success",
        records_staged: result.recordsStaged ?? 0,
        error_message: result.error ?? null,
        triggered_by: "cron",
      });

      results.push({ provider: integration.provider, companyId: integration.company_id, ok: !result.error });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ provider: integration.provider, companyId: integration.company_id, ok: false, error: message });
    }
  }

  return NextResponse.json({ ok: true, results });
}
```

Note: The import of the sync route registers all syncers as a side effect. If that import is too indirect, instead import the five syncers directly:
```typescript
import "@/lib/integrations/quickbooks";
import "@/lib/integrations/square";
import "@/lib/integrations/hubspot";
import "@/lib/integrations/jobber";
import "@/lib/integrations/stripe";
```
Check which pattern the existing codebase actually uses.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/sync/route.ts
git commit -m "refactor: consolidate cron sync through integration registry"
```

---

### Task 3: Add in-memory rate limiting to sync, AI, and import endpoints

**Goal:** Prevent abuse on the three most expensive server endpoints by applying a sliding-window rate limiter that allows 10 requests per minute per company ID.

**Files:**
- Create: `src/lib/rate-limit.ts`
- Modify: `src/app/api/integrations/sync/[provider]/route.ts`
- Modify: `src/app/api/ai/route.ts` (or wherever the AI generation handler lives)
- Modify: `src/app/api/import-sessions/csv/route.ts`

**Acceptance Criteria:**
- [ ] `src/lib/rate-limit.ts` exports a `rateLimit(key: string, limit?: number, windowMs?: number): boolean` function
- [ ] Exceeding the limit returns HTTP 429 with `{ error: "Too many requests. Try again in a moment." }`
- [ ] Under the limit: requests pass through normally
- [ ] Limit resets after the window expires (in-memory, server restart clears it)

**Verify:** Manual curl loop — 11th request within 60 seconds to `/api/integrations/sync/quickbooks` should return 429.

**Steps:**

- [ ] **Step 1: Create `src/lib/rate-limit.ts`**

```typescript
const requests = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const timestamps = (requests.get(key) ?? []).filter(
    (t) => now - t < windowMs,
  );
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  requests.set(key, timestamps);
  return true;
}
```

- [ ] **Step 2: Add rate limit check to sync route**

In `src/app/api/integrations/sync/[provider]/route.ts`, after resolving `companyId`:

```typescript
import { rateLimit } from "@/lib/rate-limit";

// inside POST handler, after companyId is resolved:
if (!rateLimit(`sync:${companyId}`)) {
  return NextResponse.json(
    { error: "Too many requests. Try again in a moment." },
    { status: 429 },
  );
}
```

- [ ] **Step 3: Add rate limit check to AI route**

Find the AI endpoint handler file, add after `companyId` resolution:

```typescript
import { rateLimit } from "@/lib/rate-limit";

if (!rateLimit(`ai:${companyId}`, 5)) {
  return NextResponse.json(
    { error: "Too many requests. Try again in a moment." },
    { status: 429 },
  );
}
```

- [ ] **Step 4: Add rate limit check to CSV import route**

In `src/app/api/import-sessions/csv/route.ts`, after `companyId` resolution:

```typescript
import { rateLimit } from "@/lib/rate-limit";

if (!rateLimit(`import:${companyId}`, 20)) {
  return NextResponse.json(
    { error: "Too many requests. Try again in a moment." },
    { status: 429 },
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit.ts 'src/app/api/integrations/sync/[provider]/route.ts' src/app/api/import-sessions/csv/route.ts
git commit -m "feat: add in-memory rate limiting to sync, AI, and import routes"
```

---

### Task 4: Optimize workspace dashboard queries

**Goal:** Cut the volume of rows loaded by the workspace dashboard by filtering sales to the last 6 months and follow-ups to open status server-side.

**Files:**
- Modify: `src/features/workspace/queries.ts`

**Acceptance Criteria:**
- [ ] `getSales()` call in workspace query adds `.gte("sale_date", sixMonthsAgo)` filter
- [ ] `getFollowUps()` call in workspace query adds `.in("status", openStatuses)` filter
- [ ] Health score computation still works (still fetches all customers, leads, jobs)
- [ ] Revenue chart still works (it already only needed last 6 months)

**Verify:** Read the resulting `queries.ts` and confirm the filters are present.

**Steps:**

- [ ] **Step 1: Read the current workspace queries file**

```bash
cat src/features/workspace/queries.ts
```

- [ ] **Step 2: Add date filter to sales query**

Find the sales query inside the workspace data fetch. Add a date filter:

```typescript
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];

// Then on the sales query:
.gte("sale_date", sixMonthsAgoStr)
```

- [ ] **Step 3: Add status filter to follow-ups query**

The open follow-up statuses (from `src/lib/status.ts` — `isOpenFollowUp`) are those not in `["completed", "cancelled"]`. Add:

```typescript
.not("status", "in", '("completed","cancelled")')
```

Or equivalently:

```typescript
.in("status", ["pending", "scheduled", "in_progress", "overdue"])
```

Read `src/lib/status.ts` first to confirm which statuses `isOpenFollowUp` checks against.

- [ ] **Step 4: Commit**

```bash
git add src/features/workspace/queries.ts
git commit -m "perf: filter workspace sales and follow-ups server-side to cut row volume"
```

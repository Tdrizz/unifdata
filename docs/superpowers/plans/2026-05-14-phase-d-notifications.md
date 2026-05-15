# Phase D: Notifications & Real-time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app notification system with a bell icon in the app shell that shows unread counts in real-time, surfacing sync completion events and overdue follow-up alerts.

**Architecture:** A `notifications` Supabase table stores per-company notifications. A `NotificationBell` client component subscribes to Supabase Realtime for the company's rows and shows an unread badge. Server Actions insert notifications on sync completion and on a scheduled overdue-follow-up check. Mark-as-read is a Server Action with `revalidatePath`.

**Tech Stack:** Supabase Realtime, Next.js App Router Server Actions, Supabase MCP for migration, React client component for the bell

---

### Task 1: Create notifications table migration

**Goal:** Add a `notifications` table to the database with Supabase MCP.

**Files:**
- Migration via Supabase MCP (no local file needed — migration runs via MCP tool)

**Acceptance Criteria:**
- [ ] `notifications` table exists in production DB with columns: `id uuid PK`, `company_id uuid FK companies`, `type text`, `title text`, `body text nullable`, `read boolean default false`, `created_at timestamptz default now()`
- [ ] RLS policy: company members can select/update their own company's notifications
- [ ] Index on `(company_id, read, created_at DESC)` for bell query performance

**Verify:** Supabase MCP `list_tables` shows `notifications` in the table list.

**Steps:**

- [ ] **Step 1: Run migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with this SQL:

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_company_unread_idx
  ON notifications (company_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company members can manage notifications"
  ON notifications
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Verify table was created**

Use `mcp__claude_ai_Supabase__list_tables` to confirm `notifications` appears.

- [ ] **Step 3: Regenerate TypeScript types**

Use `mcp__claude_ai_Supabase__generate_typescript_types` and update `src/types/db.ts` with the new `notifications` table definition.

---

### Task 2: NotificationBell component with real-time badge

**Goal:** Create a `NotificationBell` client component that shows an unread count badge and subscribes to Supabase Realtime for live updates.

**Files:**
- Create: `src/components/NotificationBell.tsx`
- Modify: `src/components/AppShell.tsx` (or wherever the top nav is) to include `NotificationBell`

**Acceptance Criteria:**
- [ ] Bell icon is visible in the app top nav
- [ ] Unread badge shows count when there are unread notifications
- [ ] Badge disappears when count is 0
- [ ] Clicking the bell opens a dropdown showing the 10 most recent notifications
- [ ] Realtime subscription increments the badge when a new notification arrives without page reload

**Verify:** Insert a notification row in Supabase dashboard → badge count increases in the UI within 2 seconds.

**Steps:**

- [ ] **Step 1: Find the app shell / nav component**

```bash
find src -name "AppShell*" -o -name "Sidebar*" -o -name "TopNav*" | head -10
```

- [ ] **Step 2: Create `src/components/NotificationBell.tsx`**

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { markNotificationsRead } from "@/lib/notifications";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  companyId: string;
  initialNotifications: Notification[];
}

export function NotificationBell({ companyId, initialNotifications }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = async () => {
    setOpen((prev) => !prev);
    if (!open && unreadCount > 0) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      await markNotificationsRead(unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative rounded-full p-2 hover:bg-muted"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-background shadow-lg">
          <div className="border-b border-border px-4 py-2 text-sm font-medium">Notifications</div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div key={n.id} className="border-b border-border px-4 py-3 last:border-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/lib/notifications.ts` for server-side helpers**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationsRead(ids: string[]) {
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).in("id", ids);
}

export async function insertNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  type: string,
  title: string,
  body?: string,
) {
  await supabase.from("notifications").insert({ company_id: companyId, type, title, body: body ?? null });
}
```

- [ ] **Step 4: Add `NotificationBell` to the app shell**

Find the top nav Server Component. Fetch the initial 10 notifications for the current company and pass them as props:

```tsx
// In the Server Component (app shell):
const supabase = await createClient();
const companyId = await getCurrentCompanyId();
const { data: notifications } = companyId
  ? await supabase
      .from("notifications")
      .select("id, type, title, body, read, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(10)
  : { data: [] };

// In JSX:
{companyId && (
  <NotificationBell
    companyId={companyId}
    initialNotifications={notifications ?? []}
  />
)}
```

- [ ] **Step 5: Create `src/lib/supabase/client.ts` if it doesn't exist**

```bash
cat src/lib/supabase/client.ts 2>/dev/null || echo "need to create"
```

If it doesn't exist:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/NotificationBell.tsx src/lib/notifications.ts src/lib/supabase/client.ts
git commit -m "feat: add NotificationBell with realtime badge and dropdown"
```

---

### Task 3: Insert sync completion notifications

**Goal:** Insert a notification after each successful manual sync so the user gets confirmation in the bell.

**Files:**
- Modify: `src/app/api/integrations/sync/[provider]/route.ts`

**Acceptance Criteria:**
- [ ] After a successful sync, a notification row is inserted with `type = "sync_complete"`
- [ ] Notification title includes the provider name and record type synced
- [ ] Failed syncs do not insert a notification (or insert with type `"sync_error"`)

**Verify:** Trigger a sync → bell badge increments → dropdown shows "Sync complete" message.

**Steps:**

- [ ] **Step 1: Read the sync route**

```bash
cat 'src/app/api/integrations/sync/[provider]/route.ts'
```

- [ ] **Step 2: Add notification insert after successful sync result**

```typescript
import { insertNotification } from "@/lib/notifications";

// After syncer.sync() succeeds and result is available:
if (!result.error) {
  await insertNotification(
    supabase,
    companyId,
    "sync_complete",
    `${provider} sync complete`,
    `${result.recordsStaged ?? 0} records staged`,
  );
}
```

Note: `insertNotification` from `src/lib/notifications.ts` is marked `"use server"` — import it only from server-side code (route handlers are server-side, so this is fine).

- [ ] **Step 3: Commit**

```bash
git add 'src/app/api/integrations/sync/[provider]/route.ts'
git commit -m "feat: insert sync completion notification after successful sync"
```

---

### Task 4: Overdue follow-up notifications via cron

**Goal:** Insert notifications for overdue follow-ups by extending the cron route to check for any follow-ups past their due date that haven't been completed.

**Files:**
- Modify: `src/app/api/cron/sync/route.ts`

**Acceptance Criteria:**
- [ ] After sync loop, cron queries `follow_ups` where `due_date < now()` and `status NOT IN ('completed', 'cancelled')`
- [ ] For each matching follow-up, inserts a `"follow_up_overdue"` notification for that company
- [ ] Avoids duplicate notifications: only inserts if no unread `"follow_up_overdue"` notification exists for that follow-up in the last 24 hours

**Verify:** Set a follow-up due date to yesterday → trigger cron → notification appears in bell.

**Steps:**

- [ ] **Step 1: Read the cron route (after Task 2 above has been applied)**

```bash
cat src/app/api/cron/sync/route.ts
```

- [ ] **Step 2: Add overdue follow-up check after sync loop**

```typescript
// After the sync loop:
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const nowStr = new Date().toISOString();
const oneDayAgoStr = yesterday.toISOString();

const { data: overdueFollowUps } = await supabase
  .from("follow_ups")
  .select("id, company_id, title")
  .lt("due_date", nowStr)
  .not("status", "in", '("completed","cancelled")')
  .limit(100);

if (overdueFollowUps && overdueFollowUps.length > 0) {
  for (const followUp of overdueFollowUps) {
    // Check if we already notified in the last 24 hours
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("company_id", followUp.company_id)
      .eq("type", "follow_up_overdue")
      .like("body", `%${followUp.id}%`)
      .gte("created_at", oneDayAgoStr);

    if ((count ?? 0) === 0) {
      await supabase.from("notifications").insert({
        company_id: followUp.company_id,
        type: "follow_up_overdue",
        title: "Overdue follow-up",
        body: `"${followUp.title}" is past its due date. Follow-up ID: ${followUp.id}`,
      });
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/sync/route.ts
git commit -m "feat: insert overdue follow-up notifications in cron job"
```

# Phase H: Multi-user & Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow company owners to invite teammates by email, assign roles (owner/member), and remove members — unlocking collaborative use of FrontierOps by field service teams.

**Architecture:** Supabase's magic-link email invite flow. The owner enters an email → a Server Action calls `supabase.auth.admin.inviteUserByEmail()` (service role) with metadata `{company_id, role}` → the invited user receives an email, clicks the link, Supabase creates their account and fires a webhook or the acceptance route reads the metadata and inserts a `company_members` row. Role checks use a `getCurrentUserRole()` helper that reads `company_members.role`. Remove member is a Server Action that deletes the row.

**Tech Stack:** Next.js App Router, Supabase Auth (admin invite), Supabase service role client, TypeScript, Supabase MCP for any needed migrations

---

### Task 1: Add role column to company_members if missing

**Goal:** Ensure `company_members` has a `role` column with values `"owner"` or `"member"`.

**Files:**
- Migration via Supabase MCP (if role column doesn't exist)

**Acceptance Criteria:**
- [ ] `company_members` table has a `role` column of type `text` with a check constraint `role IN ('owner', 'member')`
- [ ] Existing rows have `role = 'owner'` (default for existing users)
- [ ] `src/types/db.ts` reflects the new column

**Verify:** Supabase MCP `execute_sql` → `SELECT role FROM company_members LIMIT 1` returns a row.

**Steps:**

- [ ] **Step 1: Check current schema**

```bash
cat src/types/db.ts | grep -A 20 '"company_members"'
```

- [ ] **Step 2: Apply migration if role column is missing**

Use `mcp__claude_ai_Supabase__apply_migration`:

```sql
ALTER TABLE company_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'member'));

-- Make existing members (before invites) owners
UPDATE company_members SET role = 'owner' WHERE role = 'member';
```

- [ ] **Step 3: Regenerate TypeScript types and update `src/types/db.ts`**

Use `mcp__claude_ai_Supabase__generate_typescript_types`.

- [ ] **Step 4: Commit**

```bash
git add src/types/db.ts
git commit -m "feat: add role column to company_members (owner | member)"
```

---

### Task 2: Invite member Server Action

**Goal:** Create an `inviteMember(email, role)` Server Action that sends a Supabase magic-link invite with company and role metadata.

**Files:**
- Create: `src/features/settings/actions.ts` (or add to existing)
- Read: `src/lib/supabase/service.ts`

**Acceptance Criteria:**
- [ ] `inviteMember(email, role)` is exported from `src/features/settings/actions.ts`
- [ ] Only company owners can invite (throws if current user's role is not "owner")
- [ ] Calls `supabase.auth.admin.inviteUserByEmail(email, { data: { company_id, role } })`
- [ ] Returns `{ ok: true }` on success, `{ error: string }` on failure
- [ ] `revalidatePath("/settings")` is called after successful invite

**Verify:** Call the action from the Settings page → invited user receives an email.

**Steps:**

- [ ] **Step 1: Create `getCurrentUserRole` helper in `src/lib/current-company.ts`**

```typescript
export async function getCurrentUserRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const { data } = await supabase
    .from("company_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .single();

  return data?.role ?? null;
}
```

- [ ] **Step 2: Create invite action**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentCompanyId } from "@/lib/current-company";
import { getCurrentUserRole } from "@/lib/current-company";

export async function inviteMember(email: string, role: "owner" | "member" = "member") {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error("Unauthorized");

  const currentRole = await getCurrentUserRole();
  if (currentRole !== "owner") throw new Error("Only owners can invite members");

  const supabase = createServiceClient();

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { company_id: companyId, invited_role: role },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept`,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}
```

Note: `process.env.NEXT_PUBLIC_APP_URL` should be set to `https://frontierops.business` in Vercel env vars.

- [ ] **Step 3: Commit**

```bash
git add src/features/settings/actions.ts src/lib/current-company.ts
git commit -m "feat: add inviteMember server action via Supabase admin invite"
```

---

### Task 3: Invite acceptance route

**Goal:** Create a `/invite/accept` route that reads the invite metadata from the session and inserts a `company_members` row for the newly authenticated user.

**Files:**
- Create: `src/app/invite/accept/route.ts`

**Acceptance Criteria:**
- [ ] `GET /invite/accept` reads the Supabase session (Supabase auth sets it after magic link click)
- [ ] Reads `user.user_metadata.company_id` and `user.user_metadata.invited_role`
- [ ] Inserts a `company_members` row if one doesn't already exist
- [ ] Redirects to `/workspace` on success
- [ ] Redirects to `/login?error=invite_failed` on failure

**Verify:** Accept an invite email → lands on `/workspace` with correct company loaded.

**Steps:**

- [ ] **Step 1: Read how existing callback routes handle Supabase auth**

```bash
cat src/app/api/integrations/stripe/callback/route.ts
ls src/app/auth/
```

- [ ] **Step 2: Create `src/app/invite/accept/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.redirect(new URL("/login?error=invite_failed", request.url));
  }

  const companyId = user.user_metadata?.company_id as string | undefined;
  const role = (user.user_metadata?.invited_role as string) ?? "member";

  if (!companyId) {
    return NextResponse.redirect(new URL("/login?error=invite_missing_company", request.url));
  }

  // Insert company_members row (upsert to be safe on retry)
  const { error: memberError } = await supabase
    .from("company_members")
    .upsert(
      { user_id: user.id, company_id: companyId, role },
      { onConflict: "user_id,company_id" },
    );

  if (memberError) {
    return NextResponse.redirect(new URL("/login?error=invite_failed", request.url));
  }

  return NextResponse.redirect(new URL("/workspace", request.url));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/invite/
git commit -m "feat: add invite acceptance route that inserts company_members row"
```

---

### Task 4: Member list and invite UI in Settings

**Goal:** Add a "Team" section to the Settings page showing current members with their roles, an "Invite" form, and a "Remove" button for owners.

**Files:**
- Modify: `src/features/settings/components/SettingsPage.tsx` (or equivalent)
- Modify: `src/features/settings/queries.ts` to fetch team members
- Modify: `src/features/settings/actions.ts` to add `removeMember`

**Acceptance Criteria:**
- [ ] Settings page has a "Team Members" section
- [ ] Section lists all `company_members` with name (from `profiles` table), email, and role
- [ ] Owners see an "Invite Member" form (email input + role select + Submit)
- [ ] Owners see a "Remove" button next to each non-self member
- [ ] Members (non-owner) see the list but no invite form and no remove buttons
- [ ] Successful invite shows a success toast or message

**Verify:** Log in as owner → Settings → Team section shows members and invite form.

**Steps:**

- [ ] **Step 1: Read current settings components and queries**

```bash
find src/features/settings -type f | sort
cat src/features/settings/queries.ts
```

- [ ] **Step 2: Add `getTeamMembers` to `src/features/settings/queries.ts`**

```typescript
export async function getTeamMembers(companyId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("company_members")
    .select("user_id, role, profiles(full_name, email)")
    .eq("company_id", companyId);

  return (data ?? []) as Array<{
    user_id: string;
    role: string;
    profiles: { full_name: string | null; email: string | null } | null;
  }>;
}
```

- [ ] **Step 3: Add `removeMember` to `src/features/settings/actions.ts`**

```typescript
export async function removeMember(targetUserId: string) {
  const companyId = await getCurrentCompanyId();
  if (!companyId) throw new Error("Unauthorized");

  const role = await getCurrentUserRole();
  if (role !== "owner") throw new Error("Only owners can remove members");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === targetUserId) throw new Error("Cannot remove yourself");

  await supabase
    .from("company_members")
    .delete()
    .eq("user_id", targetUserId)
    .eq("company_id", companyId);

  revalidatePath("/settings");
}
```

- [ ] **Step 4: Add Team section to Settings page**

```tsx
// In the settings page server component, fetch members:
const members = await getTeamMembers(companyId);
const currentUserRole = await getCurrentUserRole();

// Pass to client component or render inline:
<section className="mt-8">
  <h2 className="mb-4 text-lg font-semibold">Team Members</h2>
  <div className="space-y-2">
    {members.map((member) => (
      <div key={member.user_id} className="flex items-center justify-between rounded border border-border p-3">
        <div>
          <p className="font-medium">{member.profiles?.full_name ?? "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{member.profiles?.email} · {member.role}</p>
        </div>
        {currentUserRole === "owner" && (
          <form action={removeMember.bind(null, member.user_id)}>
            <button type="submit" className="text-xs text-destructive hover:underline">Remove</button>
          </form>
        )}
      </div>
    ))}
  </div>

  {currentUserRole === "owner" && (
    <InviteMemberForm />
  )}
</section>
```

- [ ] **Step 5: Create `InviteMemberForm` client component**

```tsx
"use client";
import { useState, useTransition } from "react";
import { inviteMember } from "../actions";

export function InviteMemberForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "owner">("member");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await inviteMember(email, role);
      if ("error" in result) {
        setMessage(`Error: ${result.error}`);
      } else {
        setMessage(`Invite sent to ${email}`);
        setEmail("");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex items-end gap-2">
      <div className="flex-1">
        <label className="mb-1 block text-xs text-muted-foreground">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          className="w-full rounded border border-border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "member" | "owner")}
          className="rounded border border-border px-2 py-2 text-sm"
        >
          <option value="member">Member</option>
          <option value="owner">Owner</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Send Invite"}
      </button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </form>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/settings/
git commit -m "feat: add Team Members section with invite form and remove action"
```

---

### Task 5: Role-based action guards

**Goal:** Prevent members (non-owners) from accessing destructive actions like delete customer, merge duplicates, and remove member — by checking role on the server before executing.

**Files:**
- Modify: `src/features/customers/actions.ts`
- Modify: any other Server Actions that should be owner-only

**Acceptance Criteria:**
- [ ] `bulkDeleteCustomers` checks role — throws `"Only owners can delete customers"` if role is not "owner"
- [ ] `mergeCustomers` checks role — throws if not owner
- [ ] `revertImportSession` checks role — throws if not owner
- [ ] Member-level users can still read data — only write/delete actions are gated

**Verify:** Log in as a "member" role user → attempt bulk delete via API → receives 403-equivalent error.

**Steps:**

- [ ] **Step 1: Read each destructive action file**

```bash
cat src/features/customers/actions.ts
cat src/features/imports/actions.ts
```

- [ ] **Step 2: Add role check to each destructive action**

At the top of each action body, after getting `companyId`:

```typescript
const role = await getCurrentUserRole();
if (role !== "owner") throw new Error("Only owners can perform this action");
```

Apply to: `bulkDeleteCustomers`, `mergeCustomers`, `revertImportSession`.

- [ ] **Step 3: Commit**

```bash
git add src/features/customers/actions.ts src/features/imports/actions.ts
git commit -m "security: gate destructive server actions to owner role"
```

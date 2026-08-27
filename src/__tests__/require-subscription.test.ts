/**
 * Access-control logic for requireSubscription: owners gated on their own flag,
 * invited members gated on the COMPANY's live subscription_active, non-members
 * blocked. This is the guard that stops an invited seat keeping access after the
 * owner cancels — verified here so it can't silently regress.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { authMock, currentUserMock, redirectMock, getUserBillingSubscriptionMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  currentUserMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  getUserBillingSubscriptionMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
  clerkClient: async () => ({
    billing: { getUserBillingSubscription: getUserBillingSubscriptionMock },
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

// Per-table canned results for the mocked admin client.
let tables: Record<string, { data: unknown; error: unknown }>;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const result = tables[table] ?? { data: null, error: null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        insert: () => builder,
        update: () => builder,
        eq: () => builder,
        limit: () => builder,
        maybeSingle: async () => result,
        single: async () => result,
      };
      return builder;
    },
  }),
}));

import { requireSubscription } from "@/lib/auth/session";

const PROFILE = { data: { id: "p1", clerk_user_id: "u1", email: "m@x.com", full_name: "M" }, error: null };

function setUser({ subscribed = false }: { subscribed?: boolean } = {}) {
  authMock.mockResolvedValue({ userId: "u1", has: () => subscribed });
  currentUserMock.mockResolvedValue({
    primaryEmailAddress: { emailAddress: "m@x.com" },
    fullName: "M",
    username: null,
    publicMetadata: {},
    privateMetadata: {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PILOT_EMAILS = "";
  tables = { profiles: PROFILE };
  getUserBillingSubscriptionMock.mockResolvedValue({ subscriptionItems: [] });
});

describe("requireSubscription", () => {
  it("passes a subscribed user through", async () => {
    setUser({ subscribed: true });
    const user = await requireSubscription();
    expect(user.profileId).toBe("p1");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects an unsubscribed owner to /subscribe", async () => {
    setUser({ subscribed: false });
    tables.company_members = { data: { company_id: "c1", role: "owner" }, error: null };
    await expect(requireSubscription()).rejects.toThrow("REDIRECT:/subscribe");
  });

  it("redirects an unsubscribed non-member to /subscribe", async () => {
    setUser({ subscribed: false });
    tables.company_members = { data: null, error: null };
    await expect(requireSubscription()).rejects.toThrow("REDIRECT:/subscribe");
  });

  it("grants an invited member when the company subscription is active", async () => {
    setUser({ subscribed: false });
    tables.company_members = { data: { company_id: "c1", role: "member" }, error: null };
    tables.companies = { data: { subscription_active: true }, error: null };
    const user = await requireSubscription();
    expect(user.profileId).toBe("p1");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("locks out an invited member when the company subscription is inactive", async () => {
    setUser({ subscribed: false });
    tables.company_members = { data: { company_id: "c1", role: "member" }, error: null };
    tables.companies = { data: { subscription_active: false }, error: null };
    await expect(requireSubscription()).rejects.toThrow("REDIRECT:/subscribe");
  });

  it("grants an owner whose session claims are stale but whose live billing subscription is active", async () => {
    setUser({ subscribed: false });
    tables.company_members = { data: { company_id: "c1", role: "owner" }, error: null };
    getUserBillingSubscriptionMock.mockResolvedValue({
      subscriptionItems: [{ status: "active", plan: { slug: "unifdata_monthly_plan" } }],
    });
    const user = await requireSubscription();
    expect(user.profileId).toBe("p1");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

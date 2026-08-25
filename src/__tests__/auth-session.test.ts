import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { authMock, currentUserMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  currentUserMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

type QueryResult = { data: unknown; error: { code?: string; message: string } | null };

let profileLookupResult: QueryResult;
let insertResult: QueryResult;
let conflictLookupResult: QueryResult;
const updateCalls: Array<{ values: Record<string, unknown>; id: string | null }> = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      let operation: "select" | "insert" | "update" | null = null;
      let writeOperation: "insert" | "update" | null = null;
      let matchedId: string | null = null;
      let updateValues: Record<string, unknown> | null = null;
      let usedIlike = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => {
          operation = "select";
          return builder;
        },
        insert: (values: Record<string, unknown>) => {
          operation = "insert";
          writeOperation = "insert";
          updateValues = values;
          return builder;
        },
        update: (values: Record<string, unknown>) => {
          operation = "update";
          writeOperation = "update";
          updateValues = values;
          return builder;
        },
        eq: (column: string, value: string) => {
          if (operation === "update" && column === "id") {
            matchedId = value;
            if (updateValues) {
              updateCalls.push({ values: updateValues, id: matchedId });
            }
          }
          return builder;
        },
        ilike: () => {
          usedIlike = true;
          return builder;
        },
        maybeSingle: async () => {
          if (table !== "profiles" || operation !== "select") {
            return { data: null, error: null };
          }

          return usedIlike ? conflictLookupResult : profileLookupResult;
        },
        single: async () => {
          if (table === "profiles" && writeOperation === "insert") {
            return insertResult;
          }

          return { data: null, error: null };
        },
      };

      return builder;
    },
  }),
}));

import { getCurrentAppUser } from "@/lib/auth/session";

beforeEach(() => {
  vi.clearAllMocks();
  profileLookupResult = { data: null, error: null };
  insertResult = {
    data: null,
    error: { code: "23505", message: "duplicate key value violates unique constraint" },
  };
  conflictLookupResult = { data: { id: "p-existing" }, error: null };
  updateCalls.length = 0;

  authMock.mockResolvedValue({ userId: "clerk_123" });
  currentUserMock.mockResolvedValue({
    primaryEmailAddress: { emailAddress: "User@Example.com" },
    fullName: "Example User",
    username: null,
    publicMetadata: {},
    privateMetadata: {},
  });
});

describe("getCurrentAppUser", () => {
  it("re-links an existing profile when the email only differs by case", async () => {
    const user = await getCurrentAppUser();

    expect(user).toMatchObject({
      clerkUserId: "clerk_123",
      profileId: "p-existing",
      email: "User@Example.com",
      fullName: "Example User",
    });
    expect(updateCalls).toEqual([
      {
        values: { clerk_user_id: "clerk_123", full_name: "Example User" },
        id: "p-existing",
      },
    ]);
  });
});

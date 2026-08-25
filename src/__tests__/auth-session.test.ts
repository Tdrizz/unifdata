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
let emailLookupPattern: string | null;
const updateCalls: Array<{ values: Record<string, unknown>; id: string | null }> = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      let writeOperation: "insert" | "update" | null = null;
      let matchedId: string | null = null;
      let updateValues: Record<string, unknown> | null = null;
      let lookupKind: "clerk" | "email" | null = null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        insert: (values: Record<string, unknown>) => {
          writeOperation = "insert";
          updateValues = values;
          return builder;
        },
        update: (values: Record<string, unknown>) => {
          writeOperation = "update";
          updateValues = values;
          return builder;
        },
        eq: (column: string, value: string) => {
          if (column === "clerk_user_id") {
            lookupKind = "clerk";
          }
          if (writeOperation === "update" && column === "id") {
            matchedId = value;
            if (updateValues) {
              updateCalls.push({ values: updateValues, id: matchedId });
            }
          }
          return builder;
        },
        ilike: (_column: string, pattern: string) => {
          lookupKind = "email";
          emailLookupPattern = pattern;
          return builder;
        },
        maybeSingle: async () => {
          if (table !== "profiles") {
            return { data: null, error: null };
          }

          return lookupKind === "email" ? conflictLookupResult : profileLookupResult;
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
  emailLookupPattern = null;
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

  it("escapes wildcard characters before the case-insensitive email lookup", async () => {
    currentUserMock.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "user_%@example.com" },
      fullName: "Example User",
      username: null,
      publicMetadata: {},
      privateMetadata: {},
    });

    await getCurrentAppUser();

    expect(emailLookupPattern).toBe("user\\_\\%@example.com");
  });
});

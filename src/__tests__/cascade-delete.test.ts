/**
 * Deleting a contact or lead only ever unlinked related records (ON DELETE
 * SET NULL) with no way to actually remove any of it -- buildContact/
 * LeadDeleteCategories turn real related-record counts into the checkbox
 * rows shown on the delete confirmation panel; tested here as pure
 * functions, same as related-counts.test.ts, since the actual delete
 * queries themselves are simple Supabase delete() calls with nothing to get
 * wrong beyond table/column names already covered by tsc.
 */
import { describe, it, expect } from "vitest";
import { buildContactDeleteCategories, buildLeadDeleteCategories } from "@/lib/crm/cascade-delete";

describe("buildContactDeleteCategories", () => {
  it("returns an empty array when nothing is attached", () => {
    expect(
      buildContactDeleteCategories({ leads: 0, jobs: 0, sales: 0, followUps: 0, communications: 0, notes: 0, activity: 0 }),
    ).toEqual([]);
  });

  it("includes only non-zero categories, with correct keys/labels/counts and pluralization", () => {
    const result = buildContactDeleteCategories({
      leads: 2,
      jobs: 1,
      sales: 0,
      followUps: 3,
      communications: 0,
      notes: 5,
      activity: 5,
    });
    expect(result).toEqual([
      { key: "leads", label: "2 opportunities", count: 2 },
      { key: "jobs", label: "1 job", count: 1 },
      { key: "followUps", label: "3 follow-ups", count: 3 },
    ]);
    // notes/activity aren't selectable -- they're already ON DELETE CASCADE,
    // always deleted regardless of what's checked.
    expect(result.some((c) => c.key === "notes" || c.key === "activity")).toBe(false);
  });
});

describe("buildLeadDeleteCategories", () => {
  it("returns an empty array when nothing is attached", () => {
    expect(buildLeadDeleteCategories({ jobs: 0, followUps: 0 })).toEqual([]);
  });

  it("includes only non-zero categories with correct pluralization", () => {
    expect(buildLeadDeleteCategories({ jobs: 1, followUps: 2 })).toEqual([
      { key: "jobs", label: "1 job", count: 1 },
      { key: "followUps", label: "2 follow-ups", count: 2 },
    ]);
  });
});

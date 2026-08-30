/**
 * Deleting a contact or lead doesn't cascade-delete most of what points at
 * it -- related leads/jobs/sales/follow-ups/message threads just lose the
 * link (ON DELETE SET NULL) with no warning ever shown. describeContact/
 * LeadRelatedCounts turn real counts into the sentence shown on the delete
 * confirmation panel; tested here as pure functions since the counting
 * queries themselves are simple Supabase count() calls with nothing to get
 * wrong beyond column names already covered by tsc.
 */
import { describe, it, expect } from "vitest";
import { describeContactRelatedCounts, describeLeadRelatedCounts } from "@/lib/crm/related-counts";

describe("describeContactRelatedCounts", () => {
  it("returns null when nothing is attached", () => {
    expect(
      describeContactRelatedCounts({ leads: 0, jobs: 0, sales: 0, followUps: 0, communications: 0, notes: 0, activity: 0 }),
    ).toBeNull();
  });

  it("singular vs plural wording for one of each", () => {
    const result = describeContactRelatedCounts({
      leads: 1,
      jobs: 1,
      sales: 1,
      followUps: 1,
      communications: 1,
      notes: 1,
      activity: 1,
    });
    expect(result).toContain("1 opportunity");
    expect(result).toContain("1 job");
    expect(result).toContain("1 sale");
    expect(result).toContain("1 follow-up");
    expect(result).toContain("1 message thread");
    expect(result).toContain("1 note");
    expect(result).toContain("1 activity log entry");
    expect(result).not.toContain("opportunities"); // singular, not plural
  });

  it("pluralizes and distinguishes what's unlinked (kept) from what's deleted", () => {
    const result = describeContactRelatedCounts({
      leads: 2,
      jobs: 3,
      sales: 0,
      followUps: 0,
      communications: 0,
      notes: 4,
      activity: 0,
    });
    expect(result).toBe("2 opportunities and 3 jobs will lose this connection but won't be deleted. 4 notes will be permanently deleted.");
  });

  it("only mentions the deleted-records sentence when notes/activity exist, and vice versa", () => {
    const onlyUnlinked = describeContactRelatedCounts({
      leads: 1,
      jobs: 0,
      sales: 0,
      followUps: 0,
      communications: 0,
      notes: 0,
      activity: 0,
    });
    expect(onlyUnlinked).not.toContain("permanently deleted");

    const onlyDeleted = describeContactRelatedCounts({
      leads: 0,
      jobs: 0,
      sales: 0,
      followUps: 0,
      communications: 0,
      notes: 0,
      activity: 2,
    });
    expect(onlyDeleted).not.toContain("lose this connection");
    expect(onlyDeleted).toContain("2 activity log entries will be permanently deleted.");
  });
});

describe("describeLeadRelatedCounts", () => {
  it("returns null when nothing is attached", () => {
    expect(describeLeadRelatedCounts({ jobs: 0, followUps: 0 })).toBeNull();
  });

  it("lists jobs and follow-ups with correct pluralization", () => {
    expect(describeLeadRelatedCounts({ jobs: 1, followUps: 2 })).toBe(
      "1 job and 2 follow-ups will lose this connection but won't be deleted.",
    );
  });
});

/**
 * leads.next_follow_up_date is a standalone column nothing keeps in sync --
 * creating, completing, or deleting a follow-up never writes back to it, so
 * a lead with a real, currently-open follow-up could still show
 * "Next follow-up: --". mergeNextFollowUpDates (src/features/leads/queries.ts)
 * is the pure logic that derives the correct value live from follow_ups
 * instead; tested here directly so it doesn't depend on faking Supabase's
 * .or()/.order() query behavior.
 */
import { describe, it, expect } from "vitest";
import { mergeNextFollowUpDates } from "@/features/leads/queries";

const LEAD_ID = "lead-1";
const CONTACT_ID = "contact-1";

describe("mergeNextFollowUpDates", () => {
  it("surfaces an open follow-up linked directly to the lead", () => {
    const result = mergeNextFollowUpDates(
      [{ id: LEAD_ID, contact_id: null, next_follow_up_date: null }],
      [{ lead_id: LEAD_ID, contact_id: null, due_date: "2026-09-15", status: "open" }],
    );
    expect(result.get(LEAD_ID)).toBe("2026-09-15");
  });

  it("surfaces a follow-up linked only to the lead's contact -- how Vera's create_followup tool always links, since it has no lead_id parameter", () => {
    const result = mergeNextFollowUpDates(
      [{ id: LEAD_ID, contact_id: CONTACT_ID, next_follow_up_date: null }],
      [{ lead_id: null, contact_id: CONTACT_ID, due_date: "2026-09-20", status: "open" }],
    );
    expect(result.get(LEAD_ID)).toBe("2026-09-20");
  });

  it("ignores a completed follow-up", () => {
    const result = mergeNextFollowUpDates(
      [{ id: LEAD_ID, contact_id: null, next_follow_up_date: null }],
      [{ lead_id: LEAD_ID, contact_id: null, due_date: "2026-09-15", status: "Complete" }],
    );
    expect(result.get(LEAD_ID)).toBeNull();
  });

  it("picks the soonest of several open follow-ups across both link types", () => {
    const result = mergeNextFollowUpDates(
      [{ id: LEAD_ID, contact_id: CONTACT_ID, next_follow_up_date: null }],
      [
        { lead_id: LEAD_ID, contact_id: null, due_date: "2026-10-01", status: "open" },
        { lead_id: null, contact_id: CONTACT_ID, due_date: "2026-09-10", status: "open" },
      ],
    );
    expect(result.get(LEAD_ID)).toBe("2026-09-10");
  });

  it("keeps a manually stored date when no follow_ups row exists at all", () => {
    const result = mergeNextFollowUpDates(
      [{ id: LEAD_ID, contact_id: null, next_follow_up_date: "2026-11-01" }],
      [],
    );
    expect(result.get(LEAD_ID)).toBe("2026-11-01");
  });

  it("prefers a real open follow-up over a later manually stored date", () => {
    const result = mergeNextFollowUpDates(
      [{ id: LEAD_ID, contact_id: null, next_follow_up_date: "2026-12-01" }],
      [{ lead_id: LEAD_ID, contact_id: null, due_date: "2026-09-05", status: "open" }],
    );
    expect(result.get(LEAD_ID)).toBe("2026-09-05");
  });
});

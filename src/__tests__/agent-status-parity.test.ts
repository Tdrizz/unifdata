import { describe, it, expect } from "vitest";
import {
  isCompleteWork,
  isCancelledWork,
  isOpenFollowUp,
  isUnpaid,
} from "@/lib/status";

// These lock in the fix for the defect that made the whole agent layer
// untrustworthy: the app writes free-text statuses with arbitrary casing
// ("Completed", "complete", "Done"), but the agent queries compared them
// exactly and case-sensitively. Every finished job therefore looked unfinished
// to Vera, so completed work was reported as stale forever and escalated to
// the owner every single night.
//
// If any of these fail, Vera and the dashboard have started disagreeing about
// what "done" means again.

describe("status predicates are case-insensitive", () => {
  // The exact values observed in the production database.
  const PRODUCTION_JOB_STATUSES = ["Completed", "Cancelled"];
  const PRODUCTION_FOLLOW_UP_STATUSES = ["Complete", "open"];
  const PRODUCTION_PAYMENT_STATUSES = ["Paid", "Unpaid"];

  it("treats every capitalization of a finished job as finished", () => {
    for (const s of ["completed", "Completed", "COMPLETE", "Done", "done", "Finished"]) {
      expect(isCompleteWork(s), `${s} should count as complete`).toBe(true);
    }
  });

  it("recognizes the job statuses actually present in production", () => {
    expect(isCompleteWork("Completed")).toBe(true);
    expect(isCancelledWork("Cancelled")).toBe(true);
    // Neither should ever be counted as an open/stale job.
    for (const s of PRODUCTION_JOB_STATUSES) {
      const isStale = !isCompleteWork(s) && !isCancelledWork(s);
      expect(isStale, `${s} must not count as a stale open job`).toBe(false);
    }
  });

  it("recognizes the follow-up statuses actually present in production", () => {
    expect(isOpenFollowUp("Complete")).toBe(false);
    expect(isOpenFollowUp("open")).toBe(true);
    const openCount = PRODUCTION_FOLLOW_UP_STATUSES.filter(isOpenFollowUp).length;
    expect(openCount, "exactly one of the production follow-ups is open").toBe(1);
  });

  it("treats an in-progress job as still open", () => {
    for (const s of ["Scheduled", "In Progress", "active", null, undefined, ""]) {
      expect(isCompleteWork(s), `${s} is not complete`).toBe(false);
      expect(isCancelledWork(s), `${s} is not cancelled`).toBe(false);
    }
  });

  it("counts only genuinely outstanding invoices as unpaid", () => {
    for (const s of PRODUCTION_PAYMENT_STATUSES) {
      expect(isUnpaid(s)).toBe(s === "Unpaid");
    }
    for (const s of ["Unpaid", "UNPAID", "partial", "Overdue", "past due"]) {
      expect(isUnpaid(s), `${s} is money still owed`).toBe(true);
    }
    // The old query was "anything not literally 'paid'", which swept these in
    // and reported them to the owner as money owed.
    for (const s of ["Paid", "paid", "Refunded", "Void", "voided", "draft", "", null]) {
      expect(isUnpaid(s), `${s} is not money owed`).toBe(false);
    }
  });

  it("never reports a completed follow-up as open, whatever the casing", () => {
    for (const s of ["complete", "Complete", "Completed", "DONE", "closed", "Closed"]) {
      expect(isOpenFollowUp(s), `${s} should be closed`).toBe(false);
    }
  });
});

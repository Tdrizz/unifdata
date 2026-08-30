/**
 * The merged Pipeline board must render one card per opportunity, not one per
 * table row -- a lead that already has a job, or a job that already has a sale,
 * must disappear as its own card in favor of the more-advanced record. This is
 * the single trickiest part of the unified view, so it's covered against every
 * chain-length fixture rather than just the happy path.
 */
import { describe, it, expect } from "vitest";
import { mapRecordsToCards, groupCardsByStage, getStageDisplayLabel } from "@/features/pipeline/stages";
import { industryProfiles } from "@/lib/industry-profiles";
import type { RawFollowUp, RawJob, RawLead, RawSale } from "@/features/pipeline/types";

function lead(overrides: Partial<RawLead> = {}): RawLead {
  return {
    id: "lead-1",
    contact_id: "contact-1",
    service_requested: "Kitchen remodel",
    status: "New",
    estimated_value: 5000,
    next_follow_up_date: null,
    source: "Referral",
    contact: { id: "contact-1", first_name: "Jamie", last_name: "Lee" },
    ...overrides,
  };
}

function job(overrides: Partial<RawJob> = {}): RawJob {
  return {
    id: "job-1",
    contact_id: "contact-1",
    lead_id: "lead-1",
    service_type: "Kitchen remodel",
    status: "Scheduled",
    job_value: 5000,
    paid_status: "Unpaid",
    start_date: null,
    contact: { id: "contact-1", first_name: "Jamie", last_name: "Lee" },
    ...overrides,
  };
}

function sale(overrides: Partial<RawSale> = {}): RawSale {
  return {
    id: "sale-1",
    contact_id: "contact-1",
    job_id: "job-1",
    service_type: "Kitchen remodel",
    amount: 5000,
    payment_status: "Paid",
    sale_date: null,
    contact: { id: "contact-1", first_name: "Jamie", last_name: "Lee" },
    ...overrides,
  };
}

describe("mapRecordsToCards", () => {
  it("renders a lead with no job as a single Lead-stage card", () => {
    const cards = mapRecordsToCards([lead()], [], []);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ sourceType: "lead", stage: "Lead" });
  });

  it("suppresses the lead card once it has a job (renders the job instead)", () => {
    const cards = mapRecordsToCards([lead()], [job()], []);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ sourceType: "job", stage: "Active", chain: { leadId: "lead-1" } });
  });

  it("suppresses the job card once it has a sale (renders the sale instead)", () => {
    const cards = mapRecordsToCards([lead()], [job()], [sale()]);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      sourceType: "sale",
      stage: "Paid",
      chain: { leadId: "lead-1", jobId: "job-1", saleId: "sale-1" },
    });
  });

  it("renders an orphan job (no lead_id) as its own card", () => {
    const cards = mapRecordsToCards([], [job({ lead_id: null })], []);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ sourceType: "job", chain: { leadId: null } });
  });

  it("renders an orphan sale (no job_id) as its own card", () => {
    const cards = mapRecordsToCards([], [], [sale({ job_id: null })]);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ sourceType: "sale", chain: { jobId: null, leadId: null } });
  });

  it("maps a lost lead to the Lost bucket", () => {
    const cards = mapRecordsToCards([lead({ status: "Lost" })], [], []);
    expect(cards[0].stage).toBe("Lost");
  });

  it("maps a cancelled job (no sale) to the Lost bucket", () => {
    const cards = mapRecordsToCards([], [job({ status: "Cancelled" })], []);
    expect(cards[0].stage).toBe("Lost");
  });

  it("maps a completed-but-unpaid job to the Complete stage", () => {
    const cards = mapRecordsToCards([], [job({ status: "Complete", paid_status: "Unpaid" })], []);
    expect(cards[0].stage).toBe("Complete");
  });

  it("does not duplicate or drop cards across a mixed batch", () => {
    const cards = mapRecordsToCards(
      [lead({ id: "lead-a" }), lead({ id: "lead-b", contact_id: "contact-2" })],
      [job({ id: "job-b", lead_id: "lead-b" })],
      [],
    );
    expect(cards).toHaveLength(2);
    const ids = cards.map((c) => c.id).sort();
    expect(ids).toEqual(["job-job-b", "lead-lead-a"]);
  });
});

describe("groupCardsByStage", () => {
  it("buckets every card under its stage, including empty stages", () => {
    const cards = mapRecordsToCards([lead()], [], []);
    const grouped = groupCardsByStage(cards);
    expect(grouped.get("Lead")).toHaveLength(1);
    expect(grouped.get("Paid")).toHaveLength(0);
    expect(grouped.has("Lost")).toBe(true);
  });
});

describe("leadPipelineStage (via mapRecordsToCards)", () => {
  // Regression test: the old fuzzy keyword matcher (mapToStage) silently fell
  // through to "Lead" for these two exact statuses, since neither contains
  // "quoted"/"proposal"/etc -- meaning the Quoted column's own quick-add
  // default status never actually landed a new card in that column.
  it("maps 'Estimate Sent' to the Quoted stage", () => {
    const cards = mapRecordsToCards([lead({ status: "Estimate Sent" })], [], []);
    expect(cards[0].stage).toBe("Quoted");
  });

  it("maps 'Follow Up' to the Quoted stage", () => {
    const cards = mapRecordsToCards([lead({ status: "Follow Up" })], [], []);
    expect(cards[0].stage).toBe("Quoted");
  });

  it("maps 'Contacted' to the Lead stage", () => {
    const cards = mapRecordsToCards([lead({ status: "Contacted" })], [], []);
    expect(cards[0].stage).toBe("Lead");
  });

  it("falls back to Lead for an unrecognized legacy status", () => {
    const cards = mapRecordsToCards([lead({ status: "Some CSV garbage" })], [], []);
    expect(cards[0].stage).toBe("Lead");
  });
});

describe("openFollowUp badge", () => {
  function followUp(overrides: Partial<RawFollowUp> = {}): RawFollowUp {
    return {
      id: "fu-1",
      lead_id: "lead-1",
      contact_id: "contact-1",
      due_date: "2026-01-01",
      status: "Open",
      ...overrides,
    };
  }

  it("attaches an open follow-up matched by lead_id", () => {
    const cards = mapRecordsToCards([lead()], [], [], [followUp()]);
    expect(cards[0].openFollowUp).toEqual({ id: "fu-1", dueDate: "2026-01-01" });
  });

  it("falls back to matching by contact_id for a job card (no direct job link)", () => {
    const cards = mapRecordsToCards(
      [],
      [job({ lead_id: null })],
      [],
      [followUp({ lead_id: null, contact_id: "contact-1" })],
    );
    expect(cards[0].openFollowUp).toEqual({ id: "fu-1", dueDate: "2026-01-01" });
  });

  it("excludes a completed follow-up", () => {
    const cards = mapRecordsToCards([lead()], [], [], [followUp({ status: "Complete" })]);
    expect(cards[0].openFollowUp).toBeNull();
  });

  it("picks the earliest due date when more than one is open", () => {
    const cards = mapRecordsToCards(
      [lead()],
      [],
      [],
      [followUp({ id: "fu-later", due_date: "2026-03-01" }), followUp({ id: "fu-earlier", due_date: "2026-01-15" })],
    );
    expect(cards[0].openFollowUp?.id).toBe("fu-earlier");
  });

  it("is null when there's no open follow-up at all", () => {
    const cards = mapRecordsToCards([lead()], [], []);
    expect(cards[0].openFollowUp).toBeNull();
  });

  // Regression for the "deleted record's follow-up reappears on a different
  // card" bug: a follow-up only linked by contact_id (no lead_id) used to
  // survive a lead's deletion (ON DELETE SET NULL) and then get silently
  // reattached to a sibling job/lead for the same contact via the
  // contact_id fallback below. Cascade-deleting the follow-up along with
  // its parent (see cascade-delete.ts) removes it from this array entirely
  // instead of leaving an orphaned row to misattach -- this proves a job
  // card for the same contact picks up nothing once it's simply gone.
  it("does not misattach a follow-up to a sibling card once it's actually removed", () => {
    const cards = mapRecordsToCards(
      [],
      [job({ id: "job-sibling", lead_id: null, contact_id: "contact-1" })],
      [],
      [], // the contact-1 follow-up that used to exist has been cascade-deleted
    );
    expect(cards[0].openFollowUp).toBeNull();
  });
});

describe("getStageDisplayLabel", () => {
  it("renders the Quoted column using the industry profile's lead word", () => {
    expect(getStageDisplayLabel("Quoted", industryProfiles.construction)).toBe("Estimate");
    expect(getStageDisplayLabel("Quoted", industryProfiles.general)).toBe("Opportunity");
  });

  it("leaves the other stage names static across profiles", () => {
    expect(getStageDisplayLabel("Lead", industryProfiles.construction)).toBe("Lead");
    expect(getStageDisplayLabel("Active", industryProfiles.general)).toBe("Active");
    expect(getStageDisplayLabel("Paid", industryProfiles.construction)).toBe("Paid");
  });
});

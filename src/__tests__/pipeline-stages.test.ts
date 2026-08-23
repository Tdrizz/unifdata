/**
 * The merged Pipeline board must render one card per opportunity, not one per
 * table row -- a lead that already has a job, or a job that already has a sale,
 * must disappear as its own card in favor of the more-advanced record. This is
 * the single trickiest part of the unified view, so it's covered against every
 * chain-length fixture rather than just the happy path.
 */
import { describe, it, expect } from "vitest";
import { mapRecordsToCards, groupCardsByStage } from "@/features/pipeline/stages";
import type { RawJob, RawLead, RawSale } from "@/features/pipeline/types";

function lead(overrides: Partial<RawLead> = {}): RawLead {
  return {
    id: "lead-1",
    contact_id: "contact-1",
    service_requested: "Kitchen remodel",
    status: "New",
    estimated_value: 5000,
    next_follow_up_date: null,
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

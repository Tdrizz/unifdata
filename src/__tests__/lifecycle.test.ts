/**
 * Auto-conversion engine: Lead marked Won -> find-or-create its Job; Job marked
 * complete+paid -> find-or-create its Sale. Both are idempotent (keyed on the FK),
 * so toggling status back and forth must never create duplicate rows, and both
 * must write the live `contact_id` column, never the deprecated `customer_id`.
 */
import { describe, it, expect } from "vitest";
import {
  isAcceptedOpportunityStatus,
  isCompletedPaidJob,
  syncAcceptedOpportunity,
  syncSaleForJob,
} from "@/lib/lifecycle";

function makeFakeSupabase() {
  const store: Record<string, Record<string, unknown>[]> = { jobs: [], sales: [] };
  let counter = 0;

  function makeBuilder(table: "jobs" | "sales") {
    const filters: [string, unknown][] = [];
    let mode: "insert" | "update" | "select" = "select";
    let payload: Record<string, unknown> | null = null;

    function exec() {
      if (mode === "insert") {
        const row = { id: `${table}-${++counter}`, ...payload };
        store[table].push(row);
        return { data: row, error: null };
      }
      if (mode === "update") {
        const idx = store[table].findIndex((r) => filters.every(([k, v]) => r[k] === v));
        if (idx === -1) return { data: null, error: null };
        store[table][idx] = { ...store[table][idx], ...payload };
        return { data: store[table][idx], error: null };
      }
      const row = store[table].find((r) => filters.every(([k, v]) => r[k] === v));
      return { data: row ?? null, error: null };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      insert: (p: Record<string, unknown>) => {
        mode = "insert";
        payload = p;
        return builder;
      },
      update: (p: Record<string, unknown>) => {
        mode = "update";
        payload = p;
        return builder;
      },
      eq: (col: string, val: unknown) => {
        filters.push([col, val]);
        return builder;
      },
      maybeSingle: async () => exec(),
      then: (resolve: (v: unknown) => void) => resolve(exec()),
    };
    return builder;
  }

  return {
    store,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: { from: (table: "jobs" | "sales") => makeBuilder(table) } as any,
  };
}

describe("isAcceptedOpportunityStatus", () => {
  it("is true only for exactly 'Won'", () => {
    expect(isAcceptedOpportunityStatus("Won")).toBe(true);
    expect(isAcceptedOpportunityStatus("won")).toBe(false);
    expect(isAcceptedOpportunityStatus("Lost")).toBe(false);
    expect(isAcceptedOpportunityStatus(null)).toBe(false);
  });
});

describe("isCompletedPaidJob", () => {
  it("requires both a completed status and Paid payment status", () => {
    expect(isCompletedPaidJob("Complete", "Paid")).toBe(true);
    expect(isCompletedPaidJob("Completed", "paid")).toBe(true);
    expect(isCompletedPaidJob("Complete", "Unpaid")).toBe(false);
    expect(isCompletedPaidJob("Scheduled", "Paid")).toBe(false);
    expect(isCompletedPaidJob(null, null)).toBe(false);
  });
});

describe("syncAcceptedOpportunity", () => {
  it("creates a job keyed on contact_id, not the deprecated customer_id", async () => {
    const { store, client } = makeFakeSupabase();
    await syncAcceptedOpportunity({
      supabase: client,
      companyId: "c1",
      opportunityId: "lead-1",
      contactId: "contact-1",
      opportunityName: "Kitchen remodel",
      amount: 5000,
    });

    expect(store.jobs).toHaveLength(1);
    expect(store.jobs[0]).toMatchObject({
      company_id: "c1",
      lead_id: "lead-1",
      contact_id: "contact-1",
      status: "Scheduled",
      job_value: 5000,
    });
    expect(store.jobs[0]).not.toHaveProperty("customer_id");
    expect(store.sales).toHaveLength(0);
  });

  it("is idempotent across Won -> Lost -> Won (no duplicate job)", async () => {
    const { store, client } = makeFakeSupabase();
    const args = {
      supabase: client,
      companyId: "c1",
      opportunityId: "lead-1",
      contactId: "contact-1",
      opportunityName: "Kitchen remodel",
      amount: 5000,
    };
    await syncAcceptedOpportunity(args);
    await syncAcceptedOpportunity({ ...args, amount: 6000 });
    await syncAcceptedOpportunity(args);

    expect(store.jobs).toHaveLength(1);
    expect(store.jobs[0].job_value).toBe(5000);
  });
});

describe("syncSaleForJob", () => {
  it("creates a Paid sale keyed on contact_id, not customer_id", async () => {
    const { store, client } = makeFakeSupabase();
    await syncSaleForJob({
      supabase: client,
      companyId: "c1",
      jobId: "job-1",
      contactId: "contact-1",
      serviceType: "Kitchen remodel",
      amount: 5000,
      source: null,
    });

    expect(store.sales).toHaveLength(1);
    expect(store.sales[0]).toMatchObject({
      company_id: "c1",
      job_id: "job-1",
      contact_id: "contact-1",
      payment_status: "Paid",
      amount: 5000,
    });
    expect(store.sales[0]).not.toHaveProperty("customer_id");
  });

  it("is idempotent across repeated complete+paid saves (no duplicate sale)", async () => {
    const { store, client } = makeFakeSupabase();
    const args = {
      supabase: client,
      companyId: "c1",
      jobId: "job-1",
      contactId: "contact-1",
      serviceType: "Kitchen remodel",
      amount: 5000,
      source: null,
    };
    await syncSaleForJob(args);
    await syncSaleForJob(args);

    expect(store.sales).toHaveLength(1);
  });

  it("does not create a sale for a null or zero amount", async () => {
    const { store, client } = makeFakeSupabase();
    await syncSaleForJob({
      supabase: client,
      companyId: "c1",
      jobId: "job-1",
      contactId: "contact-1",
      serviceType: "Kitchen remodel",
      amount: null,
      source: null,
    });
    await syncSaleForJob({
      supabase: client,
      companyId: "c1",
      jobId: "job-1",
      contactId: "contact-1",
      serviceType: "Kitchen remodel",
      amount: 0,
      source: null,
    });

    expect(store.sales).toHaveLength(0);
  });
});

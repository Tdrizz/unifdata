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
  resolveOpenFollowUps,
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
      single: async () => exec(),
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
  it("creates a job keyed on contact_id, not the deprecated customer_id, and returns its id", async () => {
    const { store, client } = makeFakeSupabase();
    const jobId = await syncAcceptedOpportunity({
      supabase: client,
      companyId: "c1",
      opportunityId: "lead-1",
      contactId: "contact-1",
      opportunityName: "Kitchen remodel",
      amount: 5000,
    });

    expect(jobId).toBe(store.jobs[0]?.id);
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
    const firstId = await syncAcceptedOpportunity(args);
    await syncAcceptedOpportunity({ ...args, amount: 6000 });
    const thirdId = await syncAcceptedOpportunity(args);

    expect(store.jobs).toHaveLength(1);
    expect(store.jobs[0].job_value).toBe(5000);
    expect(thirdId).toBe(firstId);
  });
});

describe("syncSaleForJob", () => {
  it("creates a Paid sale keyed on contact_id, not customer_id, and returns its id", async () => {
    const { store, client } = makeFakeSupabase();
    const saleId = await syncSaleForJob({
      supabase: client,
      companyId: "c1",
      jobId: "job-1",
      contactId: "contact-1",
      serviceType: "Kitchen remodel",
      amount: 5000,
      source: null,
    });

    expect(saleId).toBe(store.sales[0]?.id);
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

  it("does not create a sale for a null or zero amount, and returns null", async () => {
    const { store, client } = makeFakeSupabase();
    const nullResult = await syncSaleForJob({
      supabase: client,
      companyId: "c1",
      jobId: "job-1",
      contactId: "contact-1",
      serviceType: "Kitchen remodel",
      amount: null,
      source: null,
    });
    expect(nullResult).toBeNull();
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

// Minimal fake supporting exactly what resolveOpenFollowUps needs:
// select().eq().or() to find candidates, update().in() to resolve them.
// Not a general Postgrest emulator -- .or() only parses the
// "col.eq.val,col.eq.val" shape resolveOpenFollowUps itself produces.
function makeFakeFollowUpsSupabase(seedFollowUps: Record<string, unknown>[]) {
  const store: { follow_ups: Record<string, unknown>[] } = { follow_ups: [...seedFollowUps] };

  function makeBuilder() {
    let mode: "select" | "update" = "select";
    let payload: Record<string, unknown> | null = null;
    const eqFilters: [string, unknown][] = [];
    let orFilter: { col: string; val: string }[] | null = null;
    let inFilter: { col: string; vals: unknown[] } | null = null;

    function matches(row: Record<string, unknown>) {
      if (!eqFilters.every(([k, v]) => row[k] === v)) return false;
      if (orFilter && !orFilter.some(({ col, val }) => row[col] === val)) return false;
      if (inFilter && !inFilter.vals.includes(row[inFilter.col])) return false;
      return true;
    }

    function exec() {
      if (mode === "update") {
        store.follow_ups = store.follow_ups.map((r) => (matches(r) ? { ...r, ...payload } : r));
        return { data: null, error: null };
      }
      return { data: store.follow_ups.filter(matches), error: null };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      update: (p: Record<string, unknown>) => {
        mode = "update";
        payload = p;
        return builder;
      },
      eq: (col: string, val: unknown) => {
        eqFilters.push([col, val]);
        return builder;
      },
      or: (expr: string) => {
        orFilter = expr.split(",").map((part) => {
          const [col, , ...rest] = part.split(".");
          return { col, val: rest.join(".") };
        });
        return builder;
      },
      in: (col: string, vals: unknown[]) => {
        inFilter = { col, vals };
        return builder;
      },
      then: (resolve: (v: unknown) => void) => resolve(exec()),
    };
    return builder;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { store, client: { from: () => makeBuilder() } as any };
}

describe("resolveOpenFollowUps", () => {
  it("marks an open follow-up linked by lead_id complete and reports the count", async () => {
    const { store, client } = makeFakeFollowUpsSupabase([
      { id: "fu-1", company_id: "c1", lead_id: "lead-1", contact_id: null, status: "Open" },
    ]);
    const count = await resolveOpenFollowUps({ supabase: client, companyId: "c1", leadId: "lead-1", contactId: null });
    expect(count).toBe(1);
    expect(store.follow_ups[0].status).toBe("Complete");
    expect(store.follow_ups[0].completed_at).toBeTruthy();
  });

  it("marks an open follow-up linked only by contact_id complete -- how Vera's create_followup tool always links, since it has no lead_id parameter", async () => {
    const { store, client } = makeFakeFollowUpsSupabase([
      { id: "fu-1", company_id: "c1", lead_id: null, contact_id: "contact-1", status: "open" },
    ]);
    const count = await resolveOpenFollowUps({ supabase: client, companyId: "c1", leadId: "lead-1", contactId: "contact-1" });
    expect(count).toBe(1);
    expect(store.follow_ups[0].status).toBe("Complete");
  });

  it("leaves an already-complete follow-up alone and reports 0", async () => {
    const { store, client } = makeFakeFollowUpsSupabase([
      { id: "fu-1", company_id: "c1", lead_id: "lead-1", contact_id: null, status: "Complete" },
    ]);
    const count = await resolveOpenFollowUps({ supabase: client, companyId: "c1", leadId: "lead-1", contactId: null });
    expect(count).toBe(0);
    expect(store.follow_ups[0].status).toBe("Complete");
  });

  it("does nothing and reports 0 when neither leadId nor contactId is given", async () => {
    const { store, client } = makeFakeFollowUpsSupabase([
      { id: "fu-1", company_id: "c1", lead_id: "lead-1", contact_id: null, status: "Open" },
    ]);
    const count = await resolveOpenFollowUps({ supabase: client, companyId: "c1", leadId: null, contactId: null });
    expect(count).toBe(0);
    expect(store.follow_ups[0].status).toBe("Open");
  });

  it("never touches a follow-up belonging to a different company", async () => {
    const { store, client } = makeFakeFollowUpsSupabase([
      { id: "fu-1", company_id: "other-co", lead_id: "lead-1", contact_id: null, status: "Open" },
    ]);
    const count = await resolveOpenFollowUps({ supabase: client, companyId: "c1", leadId: "lead-1", contactId: null });
    expect(count).toBe(0);
    expect(store.follow_ups[0].status).toBe("Open");
  });
});

/**
 * Vera's chat-tool execution layer: ownership gating (cross-tenant ids must be
 * rejected before any write), correct table/column writes per tool, and —
 * since these tools are the AI's only path to writes a human would otherwise
 * make through a form that also triggers lifecycle.ts's auto-conversion —
 * confirms the tools call syncAcceptedOpportunity/syncSaleForJob the same way
 * the human-facing actions do, so an AI-driven "mark this Won" or "mark this
 * Completed and Paid" produces the same downstream job/sale as a human doing
 * it in the UI. lifecycle.ts's own sync logic is tested separately in
 * lifecycle.test.ts; this file exercises the tool layer that calls it.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { executeTool } from "@/lib/ai/tool-executor";

type Row = Record<string, unknown>;

function makeFakeSupabase(seed: Record<string, Row[]>) {
  const store: Record<string, Row[]> = seed;
  let counter = 0;

  function makeBuilder(table: string) {
    const filters: [string, unknown][] = [];
    let mode: "insert" | "update" | "delete" | "select" = "select";
    let payload: Row | null = null;

    function rows() {
      return store[table] ?? (store[table] = []);
    }

    function matches(row: Row) {
      return filters.every(([k, v]) => row[k] === v);
    }

    function exec() {
      if (mode === "insert") {
        const row: Row = { id: `${table}-${++counter}`, ...payload };
        rows().push(row);
        return { data: row, error: null };
      }
      if (mode === "update") {
        const idx = rows().findIndex(matches);
        if (idx === -1) return { data: null, error: null };
        rows()[idx] = { ...rows()[idx], ...payload };
        return { data: rows()[idx], error: null };
      }
      if (mode === "delete") {
        const before = rows().length;
        store[table] = rows().filter((r) => !matches(r));
        return { data: null, error: null, count: before - store[table].length };
      }
      const found = rows().filter(matches);
      return { data: found, error: null };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      insert: (p: Row) => {
        mode = "insert";
        payload = p;
        return builder;
      },
      update: (p: Row) => {
        mode = "update";
        payload = p;
        return builder;
      },
      delete: () => {
        mode = "delete";
        return builder;
      },
      eq: (col: string, val: unknown) => {
        filters.push([col, val]);
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => {
        const r = exec();
        if (mode === "select") return { data: (r.data as Row[])[0] ?? null, error: null };
        return r;
      },
      single: async () => {
        const r = exec();
        if (mode === "select") {
          const first = (r.data as Row[])[0];
          return first ? { data: first, error: null } : { data: null, error: { message: "not found" } };
        }
        return r;
      },
      then: (resolve: (v: unknown) => void) => resolve(exec()),
    };
    return builder;
  }

  return { from: (table: string) => makeBuilder(table) } as unknown as Parameters<typeof executeTool>[2];
}

// Tool schemas validate id fields with z.string().uuid(), so fixtures must be
// real UUID-shaped strings — a readable fake like "cust-1" fails validation
// before the logic under test ever runs, which silently masqueraded every
// "success" case here as a rejection until this was caught.
const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
const CUSTOMER_ID = "33333333-3333-4333-8333-333333333333";
const LEAD_ID = "44444444-4444-4444-8444-444444444444";
const JOB_ID = "55555555-5555-4555-8555-555555555555";
const SALE_ID = "66666666-6666-4666-8666-666666666666";
const FOLLOWUP_ID = "77777777-7777-4777-8777-777777777777";

let db: Record<string, Row[]>;

beforeEach(() => {
  db = {
    master_customers: [{ id: CUSTOMER_ID, organization_id: ORG, first_name: "Marcus", last_name: "Webb", primary_email: "old@x.com", primary_phone: "555" }],
    leads: [{ id: LEAD_ID, company_id: ORG, service_requested: "Roof repair", estimated_value: 500, status: "New", contact_id: CUSTOMER_ID, customer_id: null }],
    jobs: [],
    sales: [],
    follow_ups: [{ id: FOLLOWUP_ID, company_id: ORG, status: "Open" }],
  };
});

describe("delete_contact", () => {
  it("deletes an owned contact", async () => {
    const supabase = makeFakeSupabase(db);
    const result = await executeTool("delete_contact", { customer_id: CUSTOMER_ID }, supabase, ORG);
    expect(result.success).toBe(true);
    expect(db.master_customers).toHaveLength(0);
  });

  it("refuses to delete a contact belonging to a different org", async () => {
    const supabase = makeFakeSupabase(db);
    const result = await executeTool("delete_contact", { customer_id: CUSTOMER_ID }, supabase, OTHER_ORG);
    expect(result.success).toBe(false);
    expect(db.master_customers).toHaveLength(1);
  });
});

describe("update_contact", () => {
  it("updates only the provided fields", async () => {
    const supabase = makeFakeSupabase(db);
    const result = await executeTool("update_contact", { customer_id: CUSTOMER_ID, phone: "999" }, supabase, ORG);
    expect(result.success).toBe(true);
    expect(db.master_customers[0].primary_phone).toBe("999");
    expect(db.master_customers[0].primary_email).toBe("old@x.com");
  });

  it("rejects cross-tenant updates", async () => {
    const supabase = makeFakeSupabase(db);
    const result = await executeTool("update_contact", { customer_id: CUSTOMER_ID, phone: "999" }, supabase, OTHER_ORG);
    expect(result.success).toBe(false);
    expect(db.master_customers[0].primary_phone).toBe("555");
  });
});

describe("update_lead_status", () => {
  it("marking a lead Won creates a linked job via the same lifecycle sync a human update triggers", async () => {
    const supabase = makeFakeSupabase(db);
    const result = await executeTool("update_lead_status", { lead_id: LEAD_ID, status: "Won" }, supabase, ORG);
    expect(result.success).toBe(true);
    expect(db.leads[0].status).toBe("Won");
    expect(db.jobs).toHaveLength(1);
    expect(db.jobs[0]).toMatchObject({ lead_id: LEAD_ID, contact_id: CUSTOMER_ID, service_type: "Roof repair", job_value: 500, status: "Scheduled" });
  });

  it("marking a lead Lost does not create a job", async () => {
    const supabase = makeFakeSupabase(db);
    await executeTool("update_lead_status", { lead_id: LEAD_ID, status: "Lost" }, supabase, ORG);
    expect(db.jobs).toHaveLength(0);
  });

  it("rejects a lead id from another org", async () => {
    const supabase = makeFakeSupabase(db);
    const result = await executeTool("update_lead_status", { lead_id: LEAD_ID, status: "Won" }, supabase, OTHER_ORG);
    expect(result.success).toBe(false);
    expect(db.jobs).toHaveLength(0);
  });
});

describe("create_lead", () => {
  it("creating a lead already Won creates a linked job", async () => {
    const supabase = makeFakeSupabase(db);
    const result = await executeTool(
      "create_lead",
      { customer_id: CUSTOMER_ID, service_requested: "New deck", estimated_value: 3000, status: "Won" },
      supabase,
      ORG,
    );
    expect(result.success).toBe(true);
    expect(db.jobs).toHaveLength(1);
    expect(db.jobs[0]).toMatchObject({ contact_id: CUSTOMER_ID, service_type: "New deck", job_value: 3000 });
  });

  it("creating a lead with default status does not create a job", async () => {
    const supabase = makeFakeSupabase(db);
    await executeTool("create_lead", { service_requested: "New deck" }, supabase, ORG);
    expect(db.jobs).toHaveLength(0);
  });
});

describe("create_job", () => {
  it("creating a job already Completed and Paid creates a linked sale", async () => {
    const supabase = makeFakeSupabase(db);
    const result = await executeTool(
      "create_job",
      { customer_id: CUSTOMER_ID, service_type: "Gutter cleaning", job_value: 250, status: "Completed", paid_status: "Paid" },
      supabase,
      ORG,
    );
    expect(result.success).toBe(true);
    expect(db.jobs).toHaveLength(1);
    expect(db.sales).toHaveLength(1);
    expect(db.sales[0]).toMatchObject({ job_id: db.jobs[0].id, amount: 250, payment_status: "Paid" });
  });

  it("creating a Scheduled job does not create a sale", async () => {
    const supabase = makeFakeSupabase(db);
    await executeTool("create_job", { service_type: "Gutter cleaning" }, supabase, ORG);
    expect(db.sales).toHaveLength(0);
  });
});

describe("update_job", () => {
  it("moving an existing job to Completed while already Paid creates a sale", async () => {
    db.jobs.push({ id: JOB_ID, company_id: ORG, status: "Active", paid_status: "Paid", contact_id: CUSTOMER_ID, service_type: "Fence repair", job_value: 800 });
    const supabase = makeFakeSupabase(db);
    const result = await executeTool("update_job", { job_id: JOB_ID, status: "Completed" }, supabase, ORG);
    expect(result.success).toBe(true);
    expect(db.sales).toHaveLength(1);
    expect(db.sales[0]).toMatchObject({ job_id: JOB_ID, amount: 800 });
  });

  it("leaves paid_status untouched when only status is provided", async () => {
    db.jobs.push({ id: JOB_ID, company_id: ORG, status: "Active", paid_status: "Unpaid", contact_id: CUSTOMER_ID, service_type: "Fence repair", job_value: 800 });
    const supabase = makeFakeSupabase(db);
    await executeTool("update_job", { job_id: JOB_ID, status: "Cancelled" }, supabase, ORG);
    expect(db.jobs[0].paid_status).toBe("Unpaid");
    expect(db.sales).toHaveLength(0);
  });
});

describe("update_sale_payment_status", () => {
  it("updates payment status on an owned sale", async () => {
    db.sales.push({ id: SALE_ID, company_id: ORG, payment_status: "Unpaid" });
    const supabase = makeFakeSupabase(db);
    const result = await executeTool("update_sale_payment_status", { sale_id: SALE_ID, payment_status: "Paid" }, supabase, ORG);
    expect(result.success).toBe(true);
    expect(db.sales[0].payment_status).toBe("Paid");
  });

  it("rejects a sale id from another org", async () => {
    db.sales.push({ id: SALE_ID, company_id: ORG, payment_status: "Unpaid" });
    const supabase = makeFakeSupabase(db);
    const result = await executeTool("update_sale_payment_status", { sale_id: SALE_ID, payment_status: "Paid" }, supabase, OTHER_ORG);
    expect(result.success).toBe(false);
    expect(db.sales[0].payment_status).toBe("Unpaid");
  });
});

describe("mark_followup_complete", () => {
  it("marks an owned follow-up Complete", async () => {
    const supabase = makeFakeSupabase(db);
    const result = await executeTool("mark_followup_complete", { followup_id: FOLLOWUP_ID }, supabase, ORG);
    expect(result.success).toBe(true);
    expect(db.follow_ups[0].status).toBe("Complete");
  });

  it("rejects a follow-up id from another org", async () => {
    const supabase = makeFakeSupabase(db);
    const result = await executeTool("mark_followup_complete", { followup_id: FOLLOWUP_ID }, supabase, OTHER_ORG);
    expect(result.success).toBe(false);
    expect(db.follow_ups[0].status).toBe("Open");
  });
});

describe("invalid input", () => {
  it("rejects a malformed uuid instead of writing anything", async () => {
    const supabase = makeFakeSupabase(db);
    const result = await executeTool("delete_contact", { customer_id: "not-a-uuid" }, supabase, ORG);
    expect(result.success).toBe(false);
    expect(db.master_customers).toHaveLength(1);
  });
});

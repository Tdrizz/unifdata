import type { ChatCompletionTool } from "openai/resources/chat/completions";

// Status enums below match the actual values the human-facing forms write
// (title case, exact vocabulary) — not a guessed/simplified version. Getting
// these wrong means AI-written data looks inconsistent with human-written
// data for the same field, or silently fails to match downstream logic that
// keys off exact status strings (e.g. lifecycle.ts's "Won" check).
const LEAD_STATUSES = ["New", "Contacted", "Estimate Sent", "Follow Up", "Won", "Lost"] as const;
const JOB_STATUSES = ["Scheduled", "Active", "In Progress", "Completed", "Cancelled"] as const;
const JOB_PAID_STATUSES = ["Unpaid", "Partial", "Paid"] as const;
const SALE_PAYMENT_STATUSES = ["Paid", "Unpaid", "Partial", "Pending"] as const;

export const CHAT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_customer",
      description: "Creates a new customer or contact record.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string", description: "Email address (optional)" },
          phone: { type: "string", description: "Phone number (optional)" },
        },
        required: ["first_name", "last_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_contact",
      description: "Updates a customer/contact's name, email, or phone number. Only include the fields being changed.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID of the customer/contact record" },
          first_name: { type: "string" },
          last_name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
        },
        required: ["customer_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_contact",
      description:
        "Permanently deletes a customer/contact record. Use this when the user explicitly asks to remove, delete, or get rid of a contact — for example clearing out test or junk entries. This is immediate and cannot be undone, so only call it for records the user has clearly identified (e.g. by name or ID), never as a guess.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID of the customer/contact record to delete" },
        },
        required: ["customer_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "Logs a new opportunity/lead, optionally linked to an existing customer.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID of the customer this opportunity is for (optional)" },
          service_requested: { type: "string", description: "What the customer is asking about" },
          estimated_value: { type: "number", description: "Estimated dollar value (optional)" },
          status: { type: "string", enum: [...LEAD_STATUSES], description: "Initial status — defaults to New" },
        },
        required: ["service_requested"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_lead_status",
      description:
        "Moves a lead/opportunity to a new stage. Marking it Won automatically creates a linked job, the same as when a human does this in the app.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string", description: "UUID of the lead" },
          status: { type: "string", enum: [...LEAD_STATUSES], description: "New status" },
        },
        required: ["lead_id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_job",
      description: "Schedules a new job/work order, optionally linked to a customer and/or an existing lead.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID of the customer this job is for (optional)" },
          lead_id: { type: "string", description: "UUID of the lead this job originated from (optional)" },
          service_type: { type: "string", description: "What the job is for" },
          job_value: { type: "number", description: "Dollar value of the job (optional)" },
          status: { type: "string", enum: [...JOB_STATUSES], description: "Initial status — defaults to Scheduled" },
          paid_status: { type: "string", enum: [...JOB_PAID_STATUSES], description: "Initial payment status — defaults to Unpaid" },
          start_date: { type: "string", description: "ISO 8601 date string (YYYY-MM-DD), optional" },
        },
        required: ["service_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_job",
      description:
        "Updates a job's status and/or payment status. Marking it both Completed and Paid (in this call or because the other was already set) automatically creates a linked sale, the same as when a human does this in the app. Only include the fields being changed.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string", description: "UUID of the job record" },
          status: { type: "string", enum: [...JOB_STATUSES], description: "New job status" },
          paid_status: { type: "string", enum: [...JOB_PAID_STATUSES], description: "New payment status for the job" },
        },
        required: ["job_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_sale",
      description: "Logs a new sale or invoice linked to a customer.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID of the customer record" },
          amount: { type: "number", description: "Sale amount in dollars" },
          service_type: { type: "string", description: "Type of service or product" },
          payment_status: { type: "string", enum: [...SALE_PAYMENT_STATUSES], description: "Payment status" },
        },
        required: ["customer_id", "amount", "service_type", "payment_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_sale_payment_status",
      description: "Updates the payment status of an existing sale/invoice — for example marking one paid.",
      parameters: {
        type: "object",
        properties: {
          sale_id: { type: "string", description: "UUID of the sale record" },
          payment_status: { type: "string", enum: [...SALE_PAYMENT_STATUSES], description: "New payment status" },
        },
        required: ["sale_id", "payment_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_followup",
      description: "Creates a follow-up task linked to a customer with a due date and note.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID of the customer record" },
          due_date: { type: "string", description: "ISO 8601 date string (YYYY-MM-DD)" },
          note: { type: "string", description: "Follow-up note or message" },
          type: {
            type: "string",
            enum: ["call", "email", "visit", "other"],
            description: "Type of follow-up",
          },
        },
        required: ["customer_id", "due_date", "note"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_followup_complete",
      description: "Marks a follow-up/reminder as complete.",
      parameters: {
        type: "object",
        properties: {
          followup_id: { type: "string", description: "UUID of the follow-up record" },
        },
        required: ["followup_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scan_workspace",
      description:
        "Scans the workspace for duplicate contacts and other data quality issues right now, instead of waiting for the nightly run. Automatically merges obvious duplicates and clears junk records if auto-fix is enabled in Settings; anything ambiguous is left for manual review in Data Hub. Use this when the user asks to clean up, dedupe, or check their data.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "flag_for_review",
      description:
        "Marks a record with a review flag and reason, for cases that need a human's judgment rather than a direct change — not a substitute for actually making a change the user asked for.",
      parameters: {
        type: "object",
        properties: {
          record_type: {
            type: "string",
            enum: ["customer", "job", "sale", "lead", "follow_up"],
            description: "Type of record to flag",
          },
          record_id: { type: "string", description: "UUID of the record" },
          reason: { type: "string", description: "Reason for flagging" },
        },
        required: ["record_type", "record_id", "reason"],
      },
    },
  },
];

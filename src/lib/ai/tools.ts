import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const CHAT_TOOLS: ChatCompletionTool[] = [
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
      name: "update_job_status",
      description: "Updates the status of a job record.",
      parameters: {
        type: "object",
        properties: {
          job_id: { type: "string", description: "UUID of the job record" },
          status: {
            type: "string",
            enum: ["scheduled", "in_progress", "completed", "cancelled", "on_hold"],
            description: "New job status",
          },
        },
        required: ["job_id", "status"],
      },
    },
  },
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
      name: "log_sale",
      description: "Logs a new sale or invoice linked to a customer.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string", description: "UUID of the customer record" },
          amount: { type: "number", description: "Sale amount in dollars" },
          service_type: { type: "string", description: "Type of service or product" },
          payment_status: {
            type: "string",
            enum: ["paid", "unpaid", "partial"],
            description: "Payment status",
          },
        },
        required: ["customer_id", "amount", "service_type", "payment_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "flag_for_review",
      description: "Marks a record with a review flag and reason.",
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

export type ImportRecordType =
  | "relationships"
  | "opportunities"
  | "work"
  | "revenue"
  | "actions";

export type ImportFieldDefinition = {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "number" | "date";
};

export const importFieldDefinitions: Record<
  ImportRecordType,
  ImportFieldDefinition[]
> = {
  relationships: [
    { key: "name", label: "Name", required: true, type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "address", label: "Address", type: "text" },
    { key: "customer_type", label: "Type", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  opportunities: [
    {
      key: "service_requested",
      label: "Opportunity name",
      required: true,
      type: "text",
    },
    { key: "customer_name", label: "Customer name", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "estimated_value", label: "Estimated value", type: "number" },
    { key: "source", label: "Source", type: "text" },
    { key: "next_follow_up_date", label: "Next follow-up date", type: "date" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  work: [
    { key: "service_type", label: "Work name", required: true, type: "text" },
    { key: "customer_name", label: "Customer name", type: "text" },
    { key: "lead_name", label: "Opportunity name", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "job_value", label: "Work value", type: "number" },
    { key: "start_date", label: "Start date", type: "date" },
    { key: "completed_date", label: "Completed date", type: "date" },
    { key: "paid_status", label: "Payment status", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
  ],
  revenue: [
    { key: "amount", label: "Amount", required: true, type: "number" },
    { key: "customer_name", label: "Customer name", type: "text" },
    { key: "payment_status", label: "Payment status", type: "text" },
    { key: "sale_date", label: "Revenue date", type: "date" },
    { key: "service_type", label: "Service / category", type: "text" },
    { key: "source", label: "Source", type: "text" },
  ],
  actions: [
    { key: "message", label: "Action", required: true, type: "text" },
    { key: "customer_name", label: "Customer name", type: "text" },
    { key: "due_date", label: "Due date", type: "date" },
    { key: "status", label: "Status", type: "text" },
  ],
};

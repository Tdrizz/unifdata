import type { Database } from "@/types/db";

export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export type JobListRow = Pick<
  JobRow,
  | "id"
  | "customer_id"
  | "lead_id"
  | "service_type"
  | "status"
  | "job_value"
  | "start_date"
  | "completed_date"
  | "paid_status"
  | "created_at"
> & { contact_id?: string | null };

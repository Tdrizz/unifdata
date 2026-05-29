import type { Database } from "@/types/db";

export type FollowUpRow = Database["public"]["Tables"]["follow_ups"]["Row"] & { contact_id?: string | null };
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export type FollowUpItem = {
  id: string;
  source_type: "manual" | "opportunity";
  source_label: string;
  customer_id: string | null;
  title: string;
  due_date: string | null;
  status: string | null;
  created_at: string;
  href: string;
};

export type FollowUpFilters = {
  status?: string;
  due?: string;
  source?: string;
};

import type { Database } from "@/types/db";

export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
export type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
export type FollowUpRow = Database["public"]["Tables"]["follow_ups"]["Row"];

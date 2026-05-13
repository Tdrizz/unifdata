import type { Database } from "@/types/db";

export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

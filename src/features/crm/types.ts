import type { Database } from "@/types/db";

export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

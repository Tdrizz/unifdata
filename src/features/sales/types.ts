import type { Database } from "@/types/db";

export type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
export type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

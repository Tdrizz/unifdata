import type { Database } from "@/types/db";

export type AiReportRow = Database["public"]["Tables"]["ai_reports"]["Row"];

export type AiReport = Pick<AiReportRow, "id" | "report_type" | "summary" | "created_at">;

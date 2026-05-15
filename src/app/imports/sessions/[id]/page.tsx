import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";
import {
  ImportSessionReviewClient,
  type ImportRow,
} from "./ImportSessionReviewClient";

export const dynamic = 'force-dynamic';

function getStatusTone(status: string | null) {
  if (status === "completed" || status === "active" || status === "committed") {
    return "success" as const;
  }

  if (status === "failed" || status === "error") {
    return "danger" as const;
  }

  if (status === "pending" || status === "ready" || status === "analyzing") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleString();
}

export default async function ImportSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentCompany = await getCurrentCompany();

  if (!currentCompany) {
    redirect("/onboarding");
  }

  const { company } = currentCompany;

  const { data: session, error: sessionError } = await supabase
    .from("import_sessions")
    .select(
      `
      id,
      source_type,
      source_name,
      file_name,
      record_type,
      status,
      total_rows,
      valid_rows,
      duplicate_rows,
      error_rows,
      created_rows,
      updated_rows,
      skipped_rows,
      error_message,
      created_at,
      committed_at
    `,
    )
    .eq("id", id)
    .eq("company_id", company.id)
    .single();

  if (sessionError || !session) {
    redirect("/imports");
  }

  const { data: rows, error: rowsError } = await supabase
    .from("import_session_rows")
    .select(
      `
      id,
      row_number,
      raw_data,
      normalized_data,
      action,
      status,
      target_table,
      target_id,
      match_confidence,
      duplicate_reason,
      validation_errors
    `,
    )
    .eq("company_id", company.id)
    .eq("import_session_id", session.id)
    .order("row_number", { ascending: true })
    .limit(250);

  if (rowsError) {
    throw new Error(rowsError.message);
  }

  return (
    <AppShell
      companyName={company.name}
      userEmail={user.email || ""}
      brandColor={company.brand_color || "#1D2D3E"}
      accentColor={company.accent_color || "#7A8C2A"}
      businessSector={company.business_sector}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Import review"
          title={session.file_name || session.source_name || "Import session"}
          description="Review staged rows, resolve duplicates, and commit clean records into UnifData."
          actions={
            <Link
              href="/imports"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to imports
            </Link>
          }
        />

        <SectionCard
          title="Session details"
          description="This import has been staged before writing anything to the workspace."
        >
          <div className="grid gap-4 p-5 md:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Source</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {session.source_type}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Record type</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {session.record_type}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Created</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {formatDate(session.created_at)}
              </p>
            </div>

            <div className="md:text-right">
              <p className="text-xs font-medium text-slate-500">Status</p>
              <div className="mt-1">
                <StatusBadge tone={getStatusTone(session.status)}>
                  {session.status}
                </StatusBadge>
              </div>
            </div>
          </div>

          {session.error_message && (
            <div className="mx-5 mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {session.error_message}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Review rows"
          description="Choose how to handle duplicates before committing."
        >
          {rows && rows.length > 0 ? (
            <div className="p-5">
              <ImportSessionReviewClient
                session={session}
                rows={rows as unknown as ImportRow[]}
              />
            </div>
          ) : (
            <EmptyState
              title="No staged rows"
              description="This import session does not have any rows to review."
            />
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentCompany = await getCurrentCompany();
  if (!currentCompany) return NextResponse.json({ error: "No company" }, { status: 403 });

  // Scoped to organization_id AND user_id, same as the list/create route --
  // this is what actually stops one member from deleting a teammate's saved
  // view, since the server client bypasses RLS (see the note in ../route.ts).
  const { error } = await supabase
    .from("saved_views")
    .delete()
    .eq("id", id)
    .eq("organization_id", currentCompany.company.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

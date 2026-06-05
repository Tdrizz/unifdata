import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const KEYWORDS: Record<string, string[]> = {
  dental: ["dental", "dentist", "orthodont", "smile"],
  veterinary: ["vet", "animal", "pet ", "paws", "clinic"],
  legal: ["law ", "legal", "attorney", "lawyer", "firm"],
  accounting: ["account", "cpa ", "bookkeep", "tax ", "payroll"],
  hvac: ["hvac", "heating", "cooling", "air condition"],
  plumbing: ["plumb", "pipe"],
  electrical: ["electric", "wiring"],
  roofing: ["roof"],
  landscaping: ["landscap", "lawn", "garden"],
  cleaning: ["clean", "maid", "janitorial"],
  fitness: ["fitness", "gym", "personal train", "yoga", "pilates"],
  photography: ["photo", "studio", "portrait"],
  beauty: ["salon", "spa", "nail", "hair", "barber", "beauty"],
  tattoo: ["tattoo", "ink", "piercing"],
  auto_repair: ["auto ", "car ", "mechanic", "garage", "automotive"],
  auto_detailing: ["detail", "car wash", "wax "],
  insurance: ["insurance", "agency ", "broker"],
  real_estate: ["real estate", "realty", "realtor", "property"],
  consulting: ["consult", "advisory", "strategy"],
  construction: ["construct", "contractor", "builder", "remodel"],
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = (await req.json()) as { name: string };
    const lower = name.toLowerCase();
    for (const [sector, keywords] of Object.entries(KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        return NextResponse.json({ sector });
      }
    }
    return NextResponse.json({ sector: null });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (err instanceof Error && (err as any).digest?.startsWith("NEXT_REDIRECT")) throw err;
    console.error("[detect-sector]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

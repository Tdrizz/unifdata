import Link from "next/link";
import { ProductMark } from "@/components/ProductMark";

const DEMO_FORM_URL = "DEMO_FORM_URL"; // TODO: Replace with Malachi's Google Form URL before launch

type ActivePage = "pricing" | "docs" | "login" | "preview" | "waitlist";

export function PublicNav({ active }: { active?: ActivePage }) {
  const linkClass = (page: ActivePage) =>
    `rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors sm:px-4 sm:py-2 ${
      active === page ? "text-white" : "text-slate-400 hover:text-white"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/6 bg-[#090e1a]/92 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/">
          <ProductMark inverse />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/pricing" className={`hidden sm:inline-flex ${linkClass("pricing")}`}>Pricing</Link>
          <Link href="/docs" className={`hidden sm:inline-flex ${linkClass("docs")}`}>Docs</Link>
          <Link href="/sign-in" className="hidden sm:inline-flex rounded-full px-4 py-2 text-[13px] font-medium text-slate-400 hover:text-white transition-colors">
            Log in
          </Link>
          <a
            href={DEMO_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-slate-950 hover:bg-slate-100 transition-colors active:scale-[0.97]"
          >
            <span className="hidden sm:inline">Book a free demo</span>
            <span className="sm:hidden">Book demo</span>
          </a>
        </div>
      </div>
    </nav>
  );
}

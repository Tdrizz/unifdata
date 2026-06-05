import Link from "next/link";
import { ProductMark } from "@/components/ProductMark";

type ActivePage = "preview" | "docs" | "pricing" | "login" | "waitlist";

export function PublicNav({ active }: { active?: ActivePage }) {
  const linkClass = (page: ActivePage) =>
    `rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm ${
      active === page
        ? "text-white"
        : "text-slate-400 hover:bg-white/8 hover:text-white"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#090e1a]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/">
          <ProductMark inverse />
        </Link>

        <div className="flex items-center gap-1 text-sm">
          {/* Hide secondary links on mobile — only show CTA */}
          <Link href="/preview" className={`hidden sm:inline-flex ${linkClass("preview")}`}>
            Preview
          </Link>
          <Link href="/pricing" className={`hidden sm:inline-flex ${linkClass("pricing")}`}>
            Pricing
          </Link>
          <Link href="/docs" className={`hidden sm:inline-flex ${linkClass("docs")}`}>
            Docs
          </Link>
          <Link
            href="/sign-in"
            className={`hidden sm:inline-flex rounded-full px-4 py-2 font-medium transition-colors ${
              active === "login"
                ? "text-white"
                : "text-slate-400 hover:bg-white/8 hover:text-white"
            }`}
          >
            Log in
          </Link>
          <Link
            href="/waitlist"
            className={`rounded-full px-4 py-2 font-semibold transition-colors ${
              active === "waitlist"
                ? "bg-white/20 text-white"
                : "bg-white text-slate-950 hover:bg-slate-100"
            }`}
          >
            <span className="hidden sm:inline">Request access</span>
            <span className="sm:hidden">Get access</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

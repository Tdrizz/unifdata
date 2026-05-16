import Link from "next/link";
import { ProductMark } from "@/components/ProductMark";

interface PublicNavProps {
  active?: "preview" | "docs" | "pricing";
  dark?: boolean;
}

export function PublicNav({ active, dark = false }: PublicNavProps) {
  if (dark) {
    return (
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#090e1a]/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/">
            <ProductMark inverse />
          </Link>
          <div className="flex items-center gap-1 text-sm">
            <Link href="/preview" className={`hidden rounded-full px-4 py-2 font-medium hover:bg-white/8 hover:text-white sm:block ${active === "preview" ? "text-white" : "text-slate-400"}`}>
              Preview
            </Link>
            <Link href="/docs" className={`hidden rounded-full px-4 py-2 font-medium hover:bg-white/8 hover:text-white sm:block ${active === "docs" ? "text-white" : "text-slate-400"}`}>
              Docs
            </Link>
            <Link href="/pricing" className={`hidden rounded-full px-4 py-2 font-medium hover:bg-white/8 hover:text-white sm:block ${active === "pricing" ? "text-white" : "text-slate-400"}`}>
              Pricing
            </Link>
            <Link href="/sign-in" className="rounded-full px-4 py-2 font-medium text-slate-400 hover:bg-white/8 hover:text-white">
              Log in
            </Link>
            <Link href="/waitlist" className="ml-1 rounded-full bg-white px-4 py-2 font-semibold text-slate-950 hover:bg-slate-100">
              Get started
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  const linkClass = (page?: string) =>
    `rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
      active === page
        ? "bg-ud-surface-sunk text-ud-ink"
        : "text-ud-muted hover:bg-ud-surface-sunk hover:text-ud-ink"
    }`;

  return (
    <nav className="sticky top-0 z-40 border-b border-ud bg-ud-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/">
          <ProductMark />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/preview" className={linkClass("preview")}>Preview</Link>
          <Link href="/docs" className={linkClass("docs")}>Docs</Link>
          <Link href="/pricing" className={linkClass("pricing")}>Pricing</Link>
          <Link href="/sign-in" className="ml-1 rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-ud-muted hover:bg-ud-surface-sunk hover:text-ud-ink transition-colors">
            Log in
          </Link>
          <Link href="/waitlist" className="ml-1 rounded-[9px] bg-ud-ink px-4 py-1.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity">
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}

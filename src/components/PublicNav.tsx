import Link from "next/link";
import { ProductMark } from "@/components/ProductMark";

interface PublicNavProps {
  /** Highlight the active page link */
  active?: "preview" | "docs" | "pricing";
}

export function PublicNav({ active }: PublicNavProps) {
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
          <Link href="/preview" className={linkClass("preview")}>
            Preview
          </Link>
          <Link href="/docs" className={linkClass("docs")}>
            Docs
          </Link>
          <Link href="/pricing" className={linkClass("pricing")}>
            Pricing
          </Link>
          <Link
            href="/sign-in"
            className="ml-1 rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-ud-muted hover:bg-ud-surface-sunk hover:text-ud-ink transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/waitlist"
            className="ml-1 rounded-[9px] bg-ud-ink px-4 py-1.5 text-[13px] font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}

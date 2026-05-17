"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const BREADCRUMBS: Record<string, [string, string]> = {
  "/workspace":    ["Workspace", "Today"],
  "/customers":    ["Workspace", "Clients"],
  "/leads":        ["Workspace", "Leads"],
  "/jobs":         ["Workspace", "Visits"],
  "/sales":        ["Workspace", "Revenue"],
  "/follow-ups":   ["Workspace", "Follow-ups"],
  "/ai-assistant": ["Intelligence", "AI Assistant"],
  "/data-hub":     ["Intelligence", "Data Hub"],
  "/imports":      ["Intelligence", "Imports"],
  "/settings":     ["Account", "Settings"],
};

function getBreadcrumb(pathname: string): [string, string] | null {
  if (BREADCRUMBS[pathname]) return BREADCRUMBS[pathname];
  const prefix = Object.keys(BREADCRUMBS).find(
    (k) => k !== "/workspace" && pathname.startsWith(k + "/"),
  );
  return prefix ? BREADCRUMBS[prefix] : null;
}

export function Topbar({ className }: { className?: string }) {
  const pathname = usePathname();
  const breadcrumb = getBreadcrumb(pathname);
  return (
    <header className={`h-14 flex items-center justify-between px-8 border-b border-[rgba(23,22,20,0.08)] bg-ud-page ${className ?? ""}`}>
      <div className="flex items-center gap-1.5 text-[13px]">
        {breadcrumb ? (
          <>
            {breadcrumb[0] && (
              <>
                <span className="text-ud-faint">{breadcrumb[0]}</span>
                <span className="text-ud-faint">/</span>
              </>
            )}
            <span className="text-ud-text font-semibold">{breadcrumb[1]}</span>
          </>
        ) : (
          <span className="text-ud-text font-semibold">FrontierOps</span>
        )}
      </div>
      <Link
        href="/settings"
        className="inline-flex items-center justify-center h-[34px] w-[34px] rounded-[9px] border border-[rgba(23,22,20,0.08)] bg-ud-surface text-ud-muted hover:text-ud-ink transition-colors"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </Link>
    </header>
  );
}

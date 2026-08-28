"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { cn } from "@/lib/utils";

type SearchResult = { type: "contact" | "lead" | "job" | "sale"; id: string; title: string; subtitle: string | null; href: string };
type SearchResponse = { contacts: SearchResult[]; leads: SearchResult[]; jobs: SearchResult[]; sales: SearchResult[] };
const EMPTY_SEARCH: SearchResponse = { contacts: [], leads: [], jobs: [], sales: [] };

function buildCommands(businessSector?: string | null) {
  const profile = getIndustryProfile(businessSector);
  return [
    { id: "workspace",  label: "Go to Home",                             href: "/workspace",  group: "Navigate" },
    { id: "customers",  label: `Go to ${profile.labels.customerPlural}`, href: "/customers",  group: "Navigate" },
    { id: "crm",        label: `Go to ${profile.pipelineLabel}`,         href: "/crm",        group: "Navigate" },
    { id: "communications", label: "Go to Communications",               href: "/communications", group: "Navigate" },
    { id: "tools",      label: "Go to Tools",                            href: "/tools",      group: "Navigate" },
    { id: "data-hub",   label: "Go to Data Hub",                         href: "/data-hub",   group: "Navigate" },
    { id: "imports",    label: "Go to Imports",                          href: "/imports",    group: "Navigate" },
    { id: "settings",   label: "Go to Settings",                         href: "/settings",   group: "Navigate" },
  ];
}

export function CommandPalette({ businessSector }: { businessSector?: string | null }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse>(EMPTY_SEARCH);
  const router = useRouter();
  const commands = buildCommands(businessSector);

  useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      const t = setTimeout(() => setMounted(false), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Real record search, not just static nav — a name, service type, or
  // address typed here previously only matched contacts (and only "No
  // results found" for anything that only appeared on a lead/job/sale).
  // /api/search covers contacts, leads, jobs, and sales in one round trip.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults(EMPTY_SEARCH);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) setSearchResults(await res.json());
      } catch {
        // best-effort — search results are a nice-to-have, not load-bearing
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/20 backdrop-blur-sm",
          open ? "[animation:fade-in_160ms_ease_both]" : "[animation:fade-out_120ms_ease_both]",
        )}
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-[20vh] z-50 w-full max-w-[560px] -translate-x-1/2 px-4">
        <div className={open ? "[animation:modal-enter_160ms_cubic-bezier(0.16,1,0.3,1)_both]" : "[animation:modal-leave_120ms_ease-in_both]"}>
        <Command
          className="rounded-[14px] border border-ud bg-ud-surface shadow-ud-pop overflow-hidden"
          shouldFilter
        >
          {/* Search input */}
          <div className="flex items-center gap-[10px] border-b border-ud px-[18px]">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="shrink-0 text-ud-muted">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search or jump to..."
              className="flex-1 bg-transparent py-[16px] text-[14px] text-ud-ink placeholder:text-ud-faint outline-none"
            />
            <kbd className="hidden rounded-[6px] border border-ud px-[6px] py-[2px] text-[11px] text-ud-faint sm:block">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[360px] overflow-y-auto py-[8px]">
            <Command.Empty className="px-[18px] py-[14px] text-[13.5px] text-ud-muted">
              No results found.
            </Command.Empty>

            {([
              ["Contacts", searchResults.contacts],
              ["Jobs", searchResults.jobs],
              ["Leads", searchResults.leads],
              ["Sales", searchResults.sales],
            ] as const).map(([heading, items]) =>
              items.length > 0 && (
                <Command.Group
                  key={heading}
                  heading={heading}
                  className="[&>[cmdk-group-heading]]:px-[18px] [&>[cmdk-group-heading]]:py-[8px] [&>[cmdk-group-heading]]:text-[10.5px] [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-[0.13em] [&>[cmdk-group-heading]]:text-ud-faint"
                >
                  {items.map((r) => (
                    <Command.Item
                      key={`${r.type}-${r.id}`}
                      value={`${r.title} ${r.subtitle ?? ""}`}
                      onSelect={() => handleSelect(r.href)}
                      className="flex cursor-pointer items-center gap-[10px] px-[18px] py-[10px] text-[13.5px] text-ud-ink aria-selected:bg-ud-surface-soft aria-selected:text-ud-accent"
                    >
                      <span className="flex-1 truncate">{r.title}</span>
                      {r.subtitle && (
                        <span className="shrink-0 text-[12px] text-ud-faint">{r.subtitle}</span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              ),
            )}

            {["Navigate", "Actions"].map((group) => {
              const items = commands.filter((c) => c.group === group);
              return (
                <Command.Group
                  key={group}
                  heading={group}
                  className="[&>[cmdk-group-heading]]:px-[18px] [&>[cmdk-group-heading]]:py-[8px] [&>[cmdk-group-heading]]:text-[10.5px] [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-[0.13em] [&>[cmdk-group-heading]]:text-ud-faint"
                >
                  {items.map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={cmd.label}
                      onSelect={() => handleSelect(cmd.href)}
                      className="flex cursor-pointer items-center gap-[10px] px-[18px] py-[10px] text-[13.5px] text-ud-ink aria-selected:bg-ud-surface-soft aria-selected:text-ud-accent"
                    >
                      {cmd.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center gap-[14px] border-t border-ud px-[18px] py-[10px]">
            <span className="text-[11px] text-ud-faint">
              <kbd className="mr-[3px] rounded border border-ud px-[5px] py-[1px] font-mono text-[10px]">↵</kbd>
              to select
            </span>
            <span className="text-[11px] text-ud-faint">
              <kbd className="mr-[3px] rounded border border-ud px-[5px] py-[1px] font-mono text-[10px]">↑↓</kbd>
              to navigate
            </span>
          </div>
        </Command>
        </div>
      </div>
    </>
  );
}

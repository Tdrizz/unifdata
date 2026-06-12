"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { getIndustryProfile } from "@/lib/industry-profiles";
import { cn } from "@/lib/utils";

function buildCommands(businessSector?: string | null) {
  const profile = getIndustryProfile(businessSector);
  return [
    { id: "workspace",  label: "Go to Today",                            href: "/workspace",  group: "Navigate" },
    { id: "customers",  label: `Go to ${profile.labels.customerPlural}`, href: "/customers",  group: "Navigate" },
    { id: "crm",        label: "Go to Pipeline",                         href: "/crm",        group: "Navigate" },
    { id: "jobs",       label: `Go to ${profile.labels.jobPlural}`,      href: "/jobs",       group: "Navigate" },
    { id: "sales",      label: `Go to ${profile.labels.salePlural}`,     href: "/sales",      group: "Navigate" },
    { id: "follow-ups", label: `Go to ${profile.labels.followUpPlural}`, href: "/follow-ups", group: "Navigate" },
    { id: "aria",       label: "Open Aria",                              href: "/aria",       group: "Navigate" },
    { id: "data-hub",   label: "Go to Data Hub",                         href: "/data-hub",   group: "Navigate" },
    { id: "imports",    label: "Go to Imports",                          href: "/imports",    group: "Navigate" },
    { id: "settings",   label: "Go to Settings",                         href: "/settings",   group: "Navigate" },
  ];
}

export function CommandPalette({ businessSector }: { businessSector?: string | null }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
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

            {["Navigate", "Actions"].map((group) => {
              const items = commands.filter((c) => c.group === group);
              return (
                <Command.Group
                  key={group}
                  heading={group}
                  className="[&>[cmdk-group-heading]]:px-[18px] [&>[cmdk-group-heading]]:py-[8px] [&>[cmdk-group-heading]]:text-[10.5px] [&>[cmdk-group-heading]]:font-semibold [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-[0.12em] [&>[cmdk-group-heading]]:text-ud-faint"
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

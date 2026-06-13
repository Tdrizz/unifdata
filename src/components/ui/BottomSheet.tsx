"use client";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
type Props = { open: boolean; onClose: () => void; title: string; children: React.ReactNode; };
export function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (open) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden" onClick={onClose} aria-hidden="true" />
      <div className={cn("fixed bottom-0 left-0 right-0 z-50 md:hidden","bg-ud-surface rounded-t-[20px] shadow-ud-pop","max-h-[90dvh] overflow-y-auto","animate-[sheet-up_280ms_cubic-bezier(0.32,0.72,0,1)_both]")}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}>
        <div className="sticky top-0 bg-ud-surface rounded-t-[20px] px-5 pt-4 pb-3 border-b border-ud z-10">
          <div className="w-9 h-1 rounded-full bg-ud-surface-sunk mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-ud-ink">{title}</p>
            <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-ud-surface-sunk flex items-center justify-center text-ud-muted hover:text-ud-ink transition-colors">
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div className="px-5 pt-4 pb-2">{children}</div>
      </div>
    </>
  );
}

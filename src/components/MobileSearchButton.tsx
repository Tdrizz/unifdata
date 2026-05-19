"use client";

export function MobileSearchButton() {
  return (
    <button
      type="button"
      aria-label="Search"
      onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
      className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ud-muted hover:bg-ud-surface-sunk hover:text-ud-ink"
    >
      <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
      </svg>
    </button>
  );
}

"use client";

export function SidebarSearchButton() {
  return (
    <button
      type="button"
      className="sidebar-search"
      onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <span>Search workspace…</span>
      <kbd>⌘K</kbd>
    </button>
  );
}

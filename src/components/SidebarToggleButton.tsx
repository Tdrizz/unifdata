"use client";

import { useCallback, useEffect, useState } from "react";

function IconPanelCollapse() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M15 9l-3 3 3 3" />
    </svg>
  );
}

function IconPanelExpand() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M13 9l3 3-3 3" />
    </svg>
  );
}

export function SidebarToggleButton() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed") === "true";
    if (stored) {
      document.querySelector(".shell")?.classList.add("sidebar-collapsed");
      setCollapsed(true);
    }
  }, []);

  const toggle = useCallback(() => {
    const shell = document.querySelector(".shell");
    if (!shell) return;
    const next = !shell.classList.contains("sidebar-collapsed");
    shell.classList.toggle("sidebar-collapsed", next);
    localStorage.setItem("sidebar-collapsed", String(next));
    setCollapsed(next);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  return (
    <button
      className="topbar-btn"
      onClick={toggle}
      title={collapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? <IconPanelExpand /> : <IconPanelCollapse />}
    </button>
  );
}

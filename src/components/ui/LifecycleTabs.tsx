"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type Tab = {
  key: string;
  label: string;
  content: ReactNode;
};

export function LifecycleTabs({ tabs, defaultTab }: { tabs: Tab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key ?? "");
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="flex rounded-[10px] bg-ud-surface-sunk p-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`flex-1 rounded-[8px] px-3 py-2 text-xs font-semibold transition-[color,background-color,box-shadow] duration-[120ms] ease-out ${
              active === tab.key
                ? "bg-ud-surface text-ud-ink shadow-ud"
                : "text-ud-faint hover:text-ud-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{activeTab?.content}</div>
    </div>
  );
}

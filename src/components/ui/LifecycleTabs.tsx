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
      <div className="flex rounded-2xl bg-slate-100 p-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              active === tab.key
                ? "bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                : "text-slate-500 hover:text-slate-700"
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

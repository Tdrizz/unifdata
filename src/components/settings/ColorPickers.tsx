"use client";

import { useState } from "react";

export function ColorPickers({
  defaultBrandColor,
  defaultAccentColor,
}: {
  defaultBrandColor: string;
  defaultAccentColor: string;
}) {
  const [brandColor, setBrandColor] = useState(defaultBrandColor);
  const [accentColor, setAccentColor] = useState(defaultAccentColor);

  return (
    <>
      {/* Live preview swatch */}
      <div className="flex overflow-hidden rounded-[10px] border border-ud bg-ud-surface">
        <div className="h-12 w-16" style={{ backgroundColor: brandColor }} />
        <div className="h-12 w-16" style={{ backgroundColor: accentColor }} />
      </div>

      {/* Hidden — passed to server action via form */}
      <input type="hidden" name="brand_color" value={brandColor} />
      <input type="hidden" name="accent_color" value={accentColor} />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-ud-muted">
          Brand color
          <div className="mt-2 flex items-center gap-3 rounded-[10px] border border-ud bg-ud-surface p-3">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-11 w-14 cursor-pointer rounded-lg border border-ud bg-ud-surface"
            />
            <span className="min-w-0 flex-1 text-sm font-semibold text-ud-muted">
              {brandColor}
            </span>
          </div>
        </label>

        <label className="block text-sm font-medium text-ud-muted">
          Accent color
          <div className="mt-2 flex items-center gap-3 rounded-[10px] border border-ud bg-ud-surface p-3">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-11 w-14 cursor-pointer rounded-lg border border-ud bg-ud-surface"
            />
            <span className="min-w-0 flex-1 text-sm font-semibold text-ud-muted">
              {accentColor}
            </span>
          </div>
        </label>
      </div>
    </>
  );
}

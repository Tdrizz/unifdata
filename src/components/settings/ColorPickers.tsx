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
      <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="h-12 w-16" style={{ backgroundColor: brandColor }} />
        <div className="h-12 w-16" style={{ backgroundColor: accentColor }} />
      </div>

      {/* Hidden — passed to server action via form */}
      <input type="hidden" name="brand_color" value={brandColor} />
      <input type="hidden" name="accent_color" value={accentColor} />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Brand color
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white"
            />
            <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
              {brandColor}
            </span>
          </div>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Accent color
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white"
            />
            <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
              {accentColor}
            </span>
          </div>
        </label>
      </div>
    </>
  );
}

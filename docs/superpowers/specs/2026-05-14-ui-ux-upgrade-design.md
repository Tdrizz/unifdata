# UI/UX Upgrade Design — UnifData

**Date:** 2026-05-14  
**Status:** Approved

---

## Goal

Apply a site-wide visual upgrade that brings the UnifData brand identity (#1D2D3E navy + #7A8C2A olive-green) throughout the app, sharpens typography and spacing, and polishes every surface to feel clean, data-forward, warm, and professional simultaneously.

## Scope

- CSS design token system
- Button and input components (global)
- AppShell, AppNav, MobileTabBar (shell + navigation)
- PageHeader, SectionCard, StatCard (layout components)
- StatusBadge (semantic component — no color changes, minor border refinement)
- Workspace dashboard stat cards and chart colors
- Empty state CTA buttons
- /docs, /pricing, / (public pages) — brand color update only
- Default `brand_color` and `accent_color` values for new company signups

## Out of Scope

- Dark mode
- New illustration or icon system
- Full marketing page redesign
- Stripe integration UI

---

## Design Decisions

### Color System

All brand/interactive colors shift to UnifData identity. Semantic colors (red, amber, emerald for danger/warning/success) are unchanged.

| Token | Old Value | New Value | Usage |
|---|---|---|---|
| `--fo-primary` | `#0f172a` | `#1D2D3E` | Sidebar bg, primary dark buttons |
| `--fo-accent` | `#2563eb` | `#7A8C2A` | Active nav, accent CTAs, highlights |
| `--fo-accent-soft` | `#eff6ff` | `#f2f5e7` | Accent background tint |
| `--fo-bg` | `#f5f7fb` | `#f3f5f0` | Page background (warm neutral) |
| Body selection | `rgba(37,99,235,0.18)` | `rgba(122,140,42,0.2)` | Text selection highlight |
| Focus rings | `ring-slate-300` / blue | `ring-[#7A8C2A]/40` | Input/button focus states |

Default company settings: `brand_color: #1D2D3E`, `accent_color: #7A8C2A`

### Button Hierarchy

Two CTA weights:
- **Primary (navy):** `bg-[#1D2D3E] text-white hover:bg-[#2a3f57]` — for confirmations, saves, destructive actions that need authority ("Save settings", "Connect")
- **Accent (olive):** `bg-[#7A8C2A] text-white hover:bg-[#6b7c24]` — for positive-forward creation actions ("Add customer", "Generate brief", "Import data")
- **Secondary:** white bg + slate border (unchanged)
- **Danger:** red (unchanged)

### Navigation Active State

AppNav active item: olive-green background (`var(--fo-accent)`) replacing current blue. This applies to both desktop sidebar and mobile pills.

MobileTabBar active: olive-green text + indicator, replacing current blue.

### Shell Refinements

- Logo area: cleaner border (`border-white/15` from `border-white/10`), tighter internal padding
- Bottom user card: add user initials avatar (first letter of email in a small circle) alongside the truncated email
- Nav section labels: `text-white/60` (from `/45`), slightly more readable

### Page Header

- Eyebrow: olive-tinted pill (`bg-[#f2f5e7] text-[#5a6820]`) replacing blue-tinted or plain-text treatment
- Title: `tracking-tight` added for sharper headline feel
- Description: `text-slate-500` (unchanged)

### SectionCard

- Add `border-l-2 border-[#7A8C2A]` to the card title text — a 2px left olive bar as a visual anchor
- Header padding: increase from `px-4 py-3` → `px-5 py-4` for more breathing room

### StatCard

- Default tone accent bar: olive-green (replacing blue/default)
- Key metric number: `text-3xl font-black` (from `text-2xl font-bold`) for dashboard primary stats
- More internal padding for air

### Workspace Dashboard

- Revenue chart: collected line = `#7A8C2A`, pending line = slate-400 (was blue)
- Priority queue neutral tone dot: olive-green
- Welcome state CTA: accent (olive) button

### Focus & Input System

All text inputs, selects, and textareas gain:
- `focus:ring-2 focus:ring-[#7A8C2A]/40 focus:border-[#7A8C2A]`

Replaces the current `focus:ring-slate-300` / `focus:ring-blue` mix.

### Public Pages (/docs, /pricing, /)

- Any hardcoded `blue-` accent classes replaced with olive equivalents
- Any `#0f172a` hardcoded → `#1D2D3E`
- CTA buttons updated to primary (navy) style
- "FrontierOps" → "UnifData" text remaining in /docs

### Empty States

- Action button in EmptyState: uses accent (olive) Button variant
- No layout or copy changes

---

## File Map

| File | Change Type |
|---|---|
| `src/app/globals.css` | Token swap, bg gradient, selection color |
| `src/components/ui/Button.tsx` | Primary + accent variant colors |
| `src/components/AppNav.tsx` | Active state color |
| `src/components/MobileTabBar.tsx` | Active state color |
| `src/components/AppShell.tsx` | User avatar initials, nav label opacity |
| `src/components/ui/PageHeader.tsx` | Eyebrow pill style |
| `src/components/ui/SectionCard.tsx` | Left accent bar, header padding |
| `src/components/ui/StatCard.tsx` | Default tone color, number sizing |
| `src/components/ui/EmptyState.tsx` | CTA button variant |
| `src/components/ui/Input.tsx` | Focus ring color |
| `src/components/ui/Textarea.tsx` | Focus ring color |
| `src/components/ui/Select.tsx` | Focus ring color |
| `src/features/workspace/components/RevenueLineChart.tsx` | Chart line colors |
| `src/app/docs/page.tsx` | Brand color + copy update |
| `src/app/pricing/page.tsx` | Button + accent color update |
| `src/app/page.tsx` | Accent + CTA color update |
| `src/app/onboarding/page.tsx` | Default brand/accent colors |

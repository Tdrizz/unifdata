# Design System

## Overview

unifdata is a warm, editorial business operations platform. The palette is built on a cream-tinted off-white page (`#f4f3f0`) with white surfaces and a near-black ink (`#171614`), creating an analogue-paper warmth that separates it from clinical SaaS blues. The single brand accent — indigo `#4A3FA8` — appears sparingly on interactive elements and active states. Layout is column-structured with a sidebar at `#eceae4`, dense data tables, and card-based stat rows. Typography is Geist (variable weight) throughout — no display or serif faces.

## Colors

- **Page Background**: `#f4f3f0` — warm off-white, used for the full page canvas
- **Surface**: `#ffffff` — card and panel backgrounds
- **Surface Soft**: `#faf9f7` — hover states and nested containers
- **Surface Sunk**: `#eceae4` — sidebar, recessed inputs
- **Ink (Primary Text)**: `#171614` — headings, values
- **Text Muted**: `#6b6760` — labels, meta, helper text
- **Text Faint**: `#a09b91` — placeholders, de-emphasized content
- **Accent Indigo**: `#4A3FA8` — CTAs, active nav, links, focus rings
- **Navy**: `#1D2D3E` — used for badges and secondary callouts
- **Danger**: `#a83232` — overdue items, unpaid revenue, critical alerts
- **Warning**: `#92571b` — due-today, pending states
- **Success**: `#3f7c3f` — completed, paid, positive states
- **Border**: `rgba(23,22,20,0.08)` — dividers and card outlines

## Typography

- **Primary**: Geist (100-900 variable). All UI text — headings, body, labels, values. No other sans-serif.
- **Mono**: Geist Mono (100-900 variable). Currency values, data cells, stat numbers (`tabular-nums`).
- **Eyebrow style**: `10.5px`, `font-weight: 600`, `letter-spacing: 0.16em`, uppercase — used for section labels and dates.
- **Page title**: `24-28px`, `font-weight: 600`, `letter-spacing: -0.02em`.
- **Stat values**: `24-32px`, Geist Mono or Geist semibold, tabular numbers.
- **Body**: `13-14px`, `line-height: 1.5`.

## Elevation

Cards use two-layer box-shadow: `0 1px 0 rgba(23,22,20,0.04), 0 1px 2px rgba(23,22,20,0.03)` — barely-there elevation. Raised state adds `0 2px 4px + 0 8px 24px` for modals and dropdowns. No glassmorphism. Borders are `1px solid rgba(23,22,20,0.08)` — soft and warm-tinted. Depth comes from surface stacking (page → surface → surface-soft) not blur or heavy shadow.

## Components

- **Stat Row**: 4-5 horizontal cards showing key metrics — value large, label small above, helper line below. Conditionally tinted `s-danger` / `s-success` based on state.
- **Queue Item**: Horizontal row — colored dot (tone), bold action title, muted meta, right-side due-date chip. Used in priority queue and jobs today panels.
- **Week Strip**: 7-day horizontal calendar bar — day name, day number, job count indicator dot.
- **Data Table**: Full-width table with `td-primary` (bold), `td-muted`, `td-link` cells. Header in small caps. Status column uses badge pills.
- **Badge Pills**: `8px padding`, `border-radius: 999px`, colored variants (info, success, warning, neutral).
- **Sidebar Nav**: `#eceae4` background, active item highlighted with indigo accent. Icon + label. Collapses to icon-only.
- **Card Header**: Title + optional subtitle left, ghost-button action right. Consistent `16-20px` padding.
- **Quick Action Chips**: Rounded full chips with `+` icon, horizontal scroll row on mobile.

## Do's and Don'ts

### Do's
- Keep backgrounds warm — `#f4f3f0` and `#faf9f7` not pure white.
- Use `tabular-nums` on all numerical values to prevent layout jitter.
- Let the indigo accent punch — use it only on interactive elements, not decoration.
- Use subtle tone classes (`s-danger`, `c-success`) to signal state without heavy color blocks.

### Don'ts
- Do not use pure `#000000` or cold blues — all ink and surfaces are warm-tinted.
- Do not use drop shadows heavier than the two-layer system — depth is subtle here.
- Do not mix font families — Geist only throughout the product.
- Do not use gradient backgrounds in cards — flat surfaces, all depth from border + shadow.

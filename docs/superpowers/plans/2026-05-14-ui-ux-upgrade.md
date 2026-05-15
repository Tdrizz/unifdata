# UI/UX Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the UnifData brand identity (#1D2D3E navy + #7A8C2A olive-green) site-wide and polish every UI surface to feel clean, data-forward, warm, and professional.

**Architecture:** Pure CSS/component changes — no data model or API changes. All brand color tokens live in `globals.css` CSS variables; component changes wire into those tokens. Page-level fallback colors updated via targeted edits.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, React server + client components.

---

### Task 1: CSS Design Token System

**Goal:** Update `globals.css` to replace all brand/interactive color tokens with UnifData identity and warm the page background.

**Files:**
- Modify: `src/app/globals.css`

**Acceptance Criteria:**
- [ ] `--fo-primary` is `#1D2D3E`
- [ ] `--fo-accent` is `#7A8C2A`
- [ ] `--fo-accent-soft` is `#f2f5e7`
- [ ] `--fo-bg` is `#f3f5f0`
- [ ] Body background gradient uses olive tint instead of blue
- [ ] `::selection` uses olive tint `rgba(122, 140, 42, 0.2)`
- [ ] `npm run build` exits 0

**Verify:** `npm run build` in `/Users/tittanolson/frontierops-2` → exits 0 with no errors

**Steps:**

- [ ] **Step 1: Replace the full `:root` block and body styles**

Open `src/app/globals.css` and replace the entire file content with:

```css
@import "tailwindcss";

:root {
  --background: #f3f5f0;
  --foreground: #1D2D3E;

  --fo-bg: #f3f5f0;
  --fo-surface: #ffffff;
  --fo-surface-soft: #f8faf5;
  --fo-border: #e2e8f0;
  --fo-muted: #64748b;
  --fo-ink: #1D2D3E;
  --fo-primary: #1D2D3E;
  --fo-accent: #7A8C2A;
  --fo-accent-soft: #f2f5e7;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 20% 0%,
      rgba(122, 140, 42, 0.07),
      transparent 34rem
    ),
    linear-gradient(180deg, #f8faf5 0%, #eef1e8 100%);
  color: var(--fo-ink);
  font-feature-settings:
    "rlig" 1,
    "calt" 1;
}

::selection {
  background: rgba(122, 140, 42, 0.2);
}

input,
select,
textarea {
  font-size: 16px;
}

button,
a {
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease,
    opacity 160ms ease;
}

button:active,
a:active {
  transform: translateY(1px);
}

table {
  border-collapse: separate;
  border-spacing: 0;
}

::-webkit-scrollbar {
  height: 10px;
  width: 10px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
  border: 2px solid #f1f5f9;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/tittanolson/frontierops-2 && npm run build 2>&1 | tail -5
```

Expected: no TypeScript or compilation errors, exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/tittanolson/frontierops-2
git add src/app/globals.css
git commit -m "style: update CSS design tokens to UnifData brand colors"
```

---

### Task 2: Global Brand Color Fallbacks

**Goal:** Replace all hardcoded `"#0f172a"` and `"#2563eb"` fallback values in page files and AppShell with the new brand colors.

**Files:**
- Modify: `src/components/AppShell.tsx` (default prop values)
- Modify: All `src/app/**/page.tsx` files that pass `brandColor` / `accentColor` to AppShell
- Modify: `src/app/workspace/RevenueChart.tsx` (one text fill)

**Acceptance Criteria:**
- [ ] No file under `src/` contains `"#0f172a"` or `"#2563eb"` as a string literal
- [ ] AppShell default props use `#1D2D3E` and `#7A8C2A`
- [ ] `npm run build` exits 0

**Verify:** `grep -r '"#0f172a"\|"#2563eb"' /Users/tittanolson/frontierops-2/src/` → no output

**Steps:**

- [ ] **Step 1: Global find-replace in AppShell and all page files**

```bash
cd /Users/tittanolson/frontierops-2

# Replace brand color fallbacks (all page files + AppShell)
find src -name "*.tsx" -o -name "*.ts" | xargs grep -l '"#0f172a"\|"#2563eb"' | while read f; do
  sed -i '' 's/"#0f172a"/"#1D2D3E"/g' "$f"
  sed -i '' 's/"#2563eb"/"#7A8C2A"/g' "$f"
done
```

- [ ] **Step 2: Verify no old values remain**

```bash
grep -r '"#0f172a"\|"#2563eb"' /Users/tittanolson/frontierops-2/src/
```

Expected: no output.

- [ ] **Step 3: Build check**

```bash
cd /Users/tittanolson/frontierops-2 && npm run build 2>&1 | tail -5
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/tittanolson/frontierops-2
git add -A
git commit -m "style: replace hardcoded brand color fallbacks with UnifData colors"
```

---

### Task 3: Button Component — Add Accent Variant, Update Primary

**Goal:** Update `Button.tsx` so primary uses the new navy (#1D2D3E) and add an `accent` variant for olive-green CTAs.

**Files:**
- Modify: `src/components/ui/Button.tsx`

**Acceptance Criteria:**
- [ ] `primary` variant uses `bg-[#1D2D3E] hover:bg-[#2a3f57]`
- [ ] New `accent` variant uses `bg-[#7A8C2A] hover:bg-[#6b7c24]` with white text
- [ ] `secondary` variant unchanged
- [ ] Focus ring on all variants uses `focus-visible:ring-2 focus-visible:ring-[#7A8C2A]/40`
- [ ] `npm run build` exits 0

**Verify:** `npm run build` in `/Users/tittanolson/frontierops-2` → exits 0

**Steps:**

- [ ] **Step 1: Rewrite Button.tsx**

Replace the entire content of `src/components/ui/Button.tsx` with:

```tsx
import type { ButtonHTMLAttributes } from "react";

const variantClasses = {
  primary:
    "rounded-2xl bg-[#1D2D3E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a3f57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A8C2A]/40 disabled:opacity-50",
  accent:
    "rounded-2xl bg-[#7A8C2A] px-4 py-3 text-sm font-semibold text-white hover:bg-[#6b7c24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A8C2A]/40 disabled:opacity-50",
  secondary:
    "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A8C2A]/40 disabled:opacity-50",
};

const sizeOverrides = {
  sm: "rounded-xl px-3 py-2 text-xs",
};

export function Button({
  variant = "primary",
  size,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeOverrides;
}) {
  const base = variantClasses[variant];
  const sizeClass = size ? sizeOverrides[size] : "";
  return (
    <button className={`${base} ${sizeClass} ${className ?? ""}`.trim()} {...props}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/tittanolson/frontierops-2 && npm run build 2>&1 | tail -5
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/tittanolson/frontierops-2
git add src/components/ui/Button.tsx
git commit -m "style: update Button primary to navy, add olive accent variant"
```

---

### Task 4: Input Focus Ring — Olive Green

**Goal:** Change focus ring on all text inputs, selects, and textareas from slate/blue to olive-green.

**Files:**
- Modify: `src/components/ui/Input.tsx` (contains Input, Textarea, Select)

**Acceptance Criteria:**
- [ ] Focus ring uses `focus:ring-[#7A8C2A]/40 focus:border-[#7A8C2A]` instead of `focus:ring-slate-300`
- [ ] `outline-none` still present (no double ring)
- [ ] `npm run build` exits 0

**Verify:** `npm run build` in `/Users/tittanolson/frontierops-2` → exits 0

**Steps:**

- [ ] **Step 1: Update Input.tsx**

Replace the entire content of `src/components/ui/Input.tsx` with:

```tsx
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-[#7A8C2A]/40 focus:border-[#7A8C2A]";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} resize-none`} {...props} />;
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  children: React.ReactNode;
}) {
  return (
    <select className={inputClass} {...props}>
      {children}
    </select>
  );
}
```

- [ ] **Step 2: Update inline focus rings in SettingsView.tsx and other forms**

Search for other places that hardcode the old focus ring and update them:

```bash
cd /Users/tittanolson/frontierops-2
grep -rn "focus:ring-slate-300\|focus:ring-blue" src/ --include="*.tsx" | grep -v node_modules
```

For each file found, replace `focus:ring-slate-300` with `focus:ring-[#7A8C2A]/40` and `focus:ring-blue-500` with `focus:ring-[#7A8C2A]/40`.

Common locations: `src/features/settings/components/SettingsView.tsx`, `src/app/onboarding/page.tsx`, `src/features/customers/`, `src/features/leads/`, `src/features/jobs/`, `src/features/sales/`, `src/features/follow-ups/`.

```bash
find src -name "*.tsx" | xargs grep -l "focus:ring-slate-300\|focus:ring-blue" | while read f; do
  sed -i '' 's/focus:ring-slate-300/focus:ring-[#7A8C2A]\/40/g' "$f"
  sed -i '' 's/focus:ring-blue-[0-9]*/focus:ring-[#7A8C2A]\/40/g' "$f"
done
```

- [ ] **Step 3: Build check**

```bash
cd /Users/tittanolson/frontierops-2 && npm run build 2>&1 | tail -5
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/tittanolson/frontierops-2
git add -A
git commit -m "style: update all input focus rings to olive-green"
```

---

### Task 5: PageHeader — Olive Eyebrow Pill

**Goal:** Give the PageHeader eyebrow text an olive-tinted pill background instead of plain uppercase gray text.

**Files:**
- Modify: `src/components/ui/PageHeader.tsx`

**Acceptance Criteria:**
- [ ] Eyebrow renders as an inline-block pill with `bg-[#f2f5e7] text-[#5a6820]` and `rounded-full px-3 py-1`
- [ ] Title has `tracking-tight` (already present — confirm no regression)
- [ ] `npm run build` exits 0

**Verify:** `npm run build` in `/Users/tittanolson/frontierops-2` → exits 0

**Steps:**

- [ ] **Step 1: Update PageHeader.tsx**

Replace the entire content of `src/components/ui/PageHeader.tsx` with:

```tsx
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm md:flex-row md:items-center">
      <div>
        {eyebrow && (
          <span className="inline-block rounded-full bg-[#f2f5e7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5a6820]">
            {eyebrow}
          </span>
        )}

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/tittanolson/frontierops-2 && npm run build 2>&1 | tail -5
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/tittanolson/frontierops-2
git add src/components/ui/PageHeader.tsx
git commit -m "style: add olive eyebrow pill to PageHeader"
```

---

### Task 6: SectionCard — Left Accent Bar

**Goal:** Add a 2px olive-green left border to SectionCard titles as a visual anchor.

**Files:**
- Modify: `src/components/ui/SectionCard.tsx`

**Acceptance Criteria:**
- [ ] The `<h2>` title has `border-l-2 border-[#7A8C2A] pl-3`
- [ ] Layout and spacing otherwise unchanged
- [ ] `npm run build` exits 0

**Verify:** `npm run build` in `/Users/tittanolson/frontierops-2` → exits 0

**Steps:**

- [ ] **Step 1: Update SectionCard.tsx**

Replace the entire content of `src/components/ui/SectionCard.tsx` with:

```tsx
import type { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 md:flex-row md:items-center">
        <div>
          <h2 className="border-l-2 border-[#7A8C2A] pl-3 text-lg font-semibold tracking-tight text-slate-950">
            {title}
          </h2>

          {description && (
            <p className="mt-1 pl-3 text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>

        {actions && <div>{actions}</div>}
      </div>

      <div>{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/tittanolson/frontierops-2 && npm run build 2>&1 | tail -5
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/tittanolson/frontierops-2
git add src/components/ui/SectionCard.tsx
git commit -m "style: add olive left accent bar to SectionCard titles"
```

---

### Task 7: StatCard Default Tone — Olive Accent Bar

**Goal:** Change the `default` tone's accent bar from slate-gray to olive-green, and the `subtle` tone from slate-400 to a lighter olive.

**Files:**
- Modify: `src/components/ui/StatCard.tsx`

**Acceptance Criteria:**
- [ ] `default` tone accent bar is `bg-[#7A8C2A]`
- [ ] `subtle` tone accent bar is `bg-[#a8b96a]` (lighter olive)
- [ ] Semantic tones (positive/warning/danger/green/amber/red) unchanged
- [ ] `blue` backward-compat alias accent bar updated to olive (was slate)
- [ ] `npm run build` exits 0

**Verify:** `npm run build` in `/Users/tittanolson/frontierops-2` → exits 0

**Steps:**

- [ ] **Step 1: Update StatCard.tsx**

Replace the entire content of `src/components/ui/StatCard.tsx` with:

```tsx
const toneStyles = {
  default: {
    card: "border-slate-200 bg-white text-slate-950",
    accent: "bg-[#7A8C2A]",
  },
  subtle: {
    card: "border-slate-200 bg-slate-50 text-slate-950",
    accent: "bg-[#a8b96a]",
  },
  positive: {
    card: "border-slate-200 bg-white text-slate-950",
    accent: "bg-emerald-500",
  },
  warning: {
    card: "border-amber-200 bg-amber-50 text-amber-950",
    accent: "bg-amber-500",
  },
  danger: {
    card: "border-red-200 bg-red-50 text-red-950",
    accent: "bg-red-500",
  },

  // Backward-compatible aliases
  green: {
    card: "border-slate-200 bg-white text-slate-950",
    accent: "bg-emerald-500",
  },
  blue: {
    card: "border-slate-200 bg-white text-slate-950",
    accent: "bg-[#7A8C2A]",
  },
  amber: {
    card: "border-amber-200 bg-amber-50 text-amber-950",
    accent: "bg-amber-500",
  },
  red: {
    card: "border-red-200 bg-red-50 text-red-950",
    accent: "bg-red-500",
  },
};

export function StatCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: keyof typeof toneStyles;
}) {
  const styles = toneStyles[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm ${styles.card}`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${styles.accent}`} />

      <p className="text-sm font-medium text-slate-500">{label}</p>

      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>

      {helper && (
        <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
          {helper}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd /Users/tittanolson/frontierops-2 && npm run build 2>&1 | tail -5
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/tittanolson/frontierops-2
git add src/components/ui/StatCard.tsx
git commit -m "style: update StatCard default accent bar to olive-green"
```

---

### Task 8: AppNav Section Labels — Brightness Boost

**Goal:** Increase nav section label legibility in the sidebar from `text-white/45` to `text-white/60`.

**Files:**
- Modify: `src/components/AppNav.tsx`

**Acceptance Criteria:**
- [ ] Nav group labels use `text-white/60` (not `/45`)
- [ ] Active nav items still use `var(--fo-accent)` via inline style (no change needed)
- [ ] `npm run build` exits 0

**Verify:** `npm run build` in `/Users/tittanolson/frontierops-2` → exits 0

**Steps:**

- [ ] **Step 1: Update AppNav.tsx**

Find and replace the single occurrence of `text-white/45`:

```bash
cd /Users/tittanolson/frontierops-2
sed -i '' 's/text-white\/45/text-white\/60/g' src/components/AppNav.tsx
```

Verify:

```bash
grep "text-white/45\|text-white/60" src/components/AppNav.tsx
```

Expected: one line showing `text-white/60`.

- [ ] **Step 2: Build check**

```bash
cd /Users/tittanolson/frontierops-2 && npm run build 2>&1 | tail -5
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/tittanolson/frontierops-2
git add src/components/AppNav.tsx
git commit -m "style: increase sidebar nav label brightness (white/45 → white/60)"
```

---

### Task 9: Docs Page — Replace Blue Callouts with Olive

**Goal:** Replace the two blue info callout boxes on `/docs` with olive-green branded equivalents.

**Files:**
- Modify: `src/app/docs/page.tsx`

**Acceptance Criteria:**
- [ ] Both `border-blue-100 bg-blue-50` callout blocks replaced with `border-[#d4dba8] bg-[#f2f5e7]`
- [ ] Both `text-blue-900` headings replaced with `text-[#3d4f17]`
- [ ] Both `text-blue-800` body text replaced with `text-[#4a5e1c]`
- [ ] `npm run build` exits 0

**Verify:** `grep "blue-100\|blue-50\|blue-900\|blue-800" /Users/tittanolson/frontierops-2/src/app/docs/page.tsx` → no output

**Steps:**

- [ ] **Step 1: Replace blue callout colors in docs/page.tsx**

```bash
cd /Users/tittanolson/frontierops-2
sed -i '' \
  -e 's/border-blue-100 bg-blue-50/border-[#d4dba8] bg-[#f2f5e7]/g' \
  -e 's/text-blue-900/text-[#3d4f17]/g' \
  -e 's/text-blue-800/text-[#4a5e1c]/g' \
  src/app/docs/page.tsx
```

- [ ] **Step 2: Verify replacements**

```bash
grep "blue-100\|blue-50\|blue-900\|blue-800" /Users/tittanolson/frontierops-2/src/app/docs/page.tsx
```

Expected: no output.

- [ ] **Step 3: Build check**

```bash
cd /Users/tittanolson/frontierops-2 && npm run build 2>&1 | tail -5
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/tittanolson/frontierops-2
git add src/app/docs/page.tsx
git commit -m "style: replace blue callouts with olive-green on /docs page"
```

---

### Task 10: Push to Main

**Goal:** Push all UI upgrade commits to origin/main so Vercel deploys the new look.

**Files:** (no file changes)

**Acceptance Criteria:**
- [ ] `git push` succeeds
- [ ] Vercel deployment triggered (visible in GitHub)

**Verify:** `git log --oneline origin/main..HEAD` → 0 commits behind (all pushed)

**Steps:**

- [ ] **Step 1: Final build verify**

```bash
cd /Users/tittanolson/frontierops-2 && npm run build 2>&1 | tail -10
```

Expected: exits 0, all routes compiled.

- [ ] **Step 2: Push**

```bash
cd /Users/tittanolson/frontierops-2 && git push
```

Expected: `main -> main` push succeeds.

- [ ] **Step 3: Confirm**

```bash
git log --oneline -9
```

Expected: 9 new commits visible.

# Phase E: Calendar & Scheduling Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a weekly calendar view toggle to the Jobs page and Follow-ups page so users can visualize their schedule spatially without an external library.

**Architecture:** A pure CSS Grid calendar component renders 7 day columns × 24 hour rows. Jobs and follow-ups are positioned absolutely within their corresponding day column using `grid-row` based on the hour of their `scheduled_date` or `due_date`. A toggle button switches between the existing list view and the new calendar view, persisted in local state.

**Tech Stack:** React client component, CSS Grid (no external calendar library), TypeScript, Next.js App Router

---

### Task 1: WeeklyCalendar base component

**Goal:** Build a reusable `WeeklyCalendar` client component that renders an empty 7-day × 12-hour grid (7am–7pm) with correct day headers for a given week.

**Files:**
- Create: `src/components/WeeklyCalendar.tsx`

**Acceptance Criteria:**
- [ ] Component renders a grid with 7 columns (Mon–Sun for the current week)
- [ ] Each column has hour cells from 7am to 7pm (12 rows)
- [ ] Day headers show weekday name + date (e.g., "Mon 5/14")
- [ ] "Previous week" / "Next week" navigation buttons change the displayed week
- [ ] Current day column is visually highlighted

**Verify:** Import and render `<WeeklyCalendar events={[]} />` on a page — shows a 7×12 grid with correct dates.

**Steps:**

- [ ] **Step 1: Create `src/components/WeeklyCalendar.tsx`**

```tsx
"use client";

import { useState } from "react";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string
  hour: number; // 0-23
  color?: string;
  href?: string;
}

interface WeeklyCalendarProps {
  events: CalendarEvent[];
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am–6pm

export function WeeklyCalendar({ events }: WeeklyCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));

  const days = getWeekDays(weekStart);
  const today = new Date().toDateString();

  const prevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const nextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const eventsForDay = (day: Date) => {
    const dayStr = day.toISOString().split("T")[0];
    return events.filter((e) => e.date.startsWith(dayStr));
  };

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={prevWeek} className="rounded border border-border px-3 py-1 text-sm">← Prev</button>
        <span className="text-sm font-medium">
          {days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
          {days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <button onClick={nextWeek} className="rounded border border-border px-3 py-1 text-sm">Next →</button>
      </div>

      <div
        className="grid min-w-[700px] border-t border-l border-border"
        style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
      >
        {/* Header row */}
        <div className="border-r border-b border-border bg-muted/30 p-2" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`border-r border-b border-border p-2 text-center text-xs font-medium ${
              day.toDateString() === today ? "bg-primary/10 text-primary" : "bg-muted/30"
            }`}
          >
            <div>{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
            <div>{day.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</div>
          </div>
        ))}

        {/* Hour rows */}
        {HOURS.map((hour) => (
          <>
            <div key={`label-${hour}`} className="border-r border-b border-border p-1 text-right text-xs text-muted-foreground">
              {hour % 12 === 0 ? 12 : hour % 12}{hour < 12 ? "am" : "pm"}
            </div>
            {days.map((day) => {
              const dayEvents = eventsForDay(day).filter((e) => e.hour === hour);
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="relative min-h-[48px] border-r border-b border-border p-0.5"
                >
                  {dayEvents.map((event) => (
                    <a
                      key={event.id}
                      href={event.href ?? "#"}
                      className={`block rounded px-1 py-0.5 text-xs text-white truncate ${
                        event.color ?? "bg-primary"
                      }`}
                    >
                      {event.title}
                    </a>
                  ))}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WeeklyCalendar.tsx
git commit -m "feat: add WeeklyCalendar base component with 7-day grid"
```

---

### Task 2: Calendar view toggle on Jobs page

**Goal:** Add a list/calendar toggle to the Jobs page that switches between the existing list and a `WeeklyCalendar` showing jobs by `scheduled_date`.

**Files:**
- Modify: `src/features/jobs/components/JobsPage.tsx` (or equivalent)
- Modify: `src/features/jobs/queries.ts` if `scheduled_date` and its hour need to be exposed

**Acceptance Criteria:**
- [ ] Jobs page has a "List / Calendar" toggle (two buttons or a segmented control)
- [ ] Calendar view shows jobs positioned in their day column and hour row
- [ ] Jobs without a `scheduled_date` are not shown in calendar view (they remain in list view)
- [ ] Clicking a job in calendar view navigates to the job detail page

**Verify:** Create a job with a scheduled_date of today at 10am → switch to calendar → job appears in today's 10am slot.

**Steps:**

- [ ] **Step 1: Read the jobs page component and query**

```bash
find src/features/jobs -name "*.tsx" | head -10
cat src/features/jobs/queries.ts
```

- [ ] **Step 2: Add view toggle state and CalendarEvent mapping to JobsPage**

```tsx
"use client"; // ensure this is a client component or extract a client wrapper

import { useState } from "react";
import { WeeklyCalendar, type CalendarEvent } from "@/components/WeeklyCalendar";

// Inside the component:
const [view, setView] = useState<"list" | "calendar">("list");

const calendarEvents: CalendarEvent[] = jobs
  .filter((job) => Boolean(job.scheduled_date))
  .map((job) => {
    const date = new Date(job.scheduled_date!);
    return {
      id: job.id,
      title: job.title ?? job.id,
      date: job.scheduled_date!,
      hour: date.getHours(),
      color: "bg-blue-500",
      href: `/jobs/${job.id}`,
    };
  });
```

- [ ] **Step 3: Add toggle buttons and conditional rendering**

```tsx
<div className="mb-4 flex items-center gap-2">
  <button
    onClick={() => setView("list")}
    className={`rounded px-3 py-1 text-sm ${view === "list" ? "bg-primary text-primary-foreground" : "border border-border"}`}
  >
    List
  </button>
  <button
    onClick={() => setView("calendar")}
    className={`rounded px-3 py-1 text-sm ${view === "calendar" ? "bg-primary text-primary-foreground" : "border border-border"}`}
  >
    Calendar
  </button>
</div>

{view === "list" ? (
  <ExistingJobsList jobs={jobs} />
) : (
  <WeeklyCalendar events={calendarEvents} />
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/jobs/
git commit -m "feat: add calendar view toggle to Jobs page"
```

---

### Task 3: Calendar view toggle on Follow-ups page

**Goal:** Add the same list/calendar toggle to the Follow-ups page using `due_date` for positioning.

**Files:**
- Modify: `src/features/follow-ups/components/FollowUpsPage.tsx` (or equivalent)

**Acceptance Criteria:**
- [ ] Follow-ups page has a "List / Calendar" toggle
- [ ] Calendar view shows follow-ups in their `due_date` day column and hour row
- [ ] Follow-ups without a `due_date` are only shown in list view
- [ ] Overdue follow-ups (due_date < today) appear in the past week if visible

**Verify:** Create a follow-up with due_date of today at 2pm → switch to calendar → appears in today's 2pm slot.

**Steps:**

- [ ] **Step 1: Read the follow-ups page component**

```bash
find src/features/follow-ups -name "*.tsx" | head -10
```

- [ ] **Step 2: Add view toggle and CalendarEvent mapping**

Follow the same pattern as Task 2, replacing `scheduled_date` with `due_date` and `color` with `"bg-amber-500"` to visually distinguish follow-ups from jobs.

```tsx
const calendarEvents: CalendarEvent[] = followUps
  .filter((fu) => Boolean(fu.due_date))
  .map((fu) => {
    const date = new Date(fu.due_date!);
    return {
      id: fu.id,
      title: fu.title ?? "Follow-up",
      date: fu.due_date!,
      hour: date.getHours(),
      color: "bg-amber-500",
      href: `/follow-ups/${fu.id}`,
    };
  });
```

- [ ] **Step 3: Add toggle and conditional rendering (same JSX as Task 2)**

- [ ] **Step 4: Commit**

```bash
git add src/features/follow-ups/
git commit -m "feat: add calendar view toggle to Follow-ups page"
```

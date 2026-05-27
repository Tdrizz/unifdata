"use client";

import { useState } from "react";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import type { CalendarEvent } from "@/components/WeeklyCalendar";
import { useProfile } from "@/lib/profile-context";

type View = "list" | "calendar";

interface JobsCalendarToggleProps {
  calendarEvents: CalendarEvent[];
  children: React.ReactNode;
  jobPlural?: string;
}

export function JobsCalendarToggle({ calendarEvents, children, jobPlural }: JobsCalendarToggleProps) {
  const profile = useProfile();
  const resolvedJobPlural = jobPlural ?? profile.labels.jobPlural;
  const [view, setView] = useState<View>("list");

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setView("list")}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "list"
              ? "border-ud-accent bg-ud-accent text-white"
              : "border-ud bg-ud-surface text-ud-muted hover:bg-ud-surface-sunk"
          }`}
        >
          List
        </button>
        <button
          onClick={() => setView("calendar")}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "calendar"
              ? "border-ud-accent bg-ud-accent text-white"
              : "border-ud bg-ud-surface text-ud-muted hover:bg-ud-surface-sunk"
          }`}
        >
          Calendar
        </button>
      </div>

      {view === "list" ? (
        children
      ) : (
        <div className="rounded-[10px] border border-ud bg-ud-surface p-4">
          {calendarEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-ud-faint">
              {`No ${resolvedJobPlural.toLowerCase()} with a start date to show on the calendar.`}
            </p>
          ) : (
            <WeeklyCalendar events={calendarEvents} />
          )}
        </div>
      )}
    </div>
  );
}

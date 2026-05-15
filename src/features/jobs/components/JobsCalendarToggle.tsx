"use client";

import { useState } from "react";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import type { CalendarEvent } from "@/components/WeeklyCalendar";

type View = "list" | "calendar";

interface JobsCalendarToggleProps {
  calendarEvents: CalendarEvent[];
  children: React.ReactNode;
}

export function JobsCalendarToggle({ calendarEvents, children }: JobsCalendarToggleProps) {
  const [view, setView] = useState<View>("list");

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setView("list")}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "list"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          List
        </button>
        <button
          onClick={() => setView("calendar")}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "calendar"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Calendar
        </button>
      </div>

      {view === "list" ? (
        children
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {calendarEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No jobs with a start date to show on the calendar.
            </p>
          ) : (
            <WeeklyCalendar events={calendarEvents} />
          )}
        </div>
      )}
    </div>
  );
}

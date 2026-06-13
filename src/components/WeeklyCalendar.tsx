"use client";

import { useState, Fragment } from "react";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string "YYYY-MM-DD" or full ISO
  hour: number; // 0-23
  color?: string; // Tailwind bg class e.g. "bg-blue-500"
  href?: string;
}

interface WeeklyCalendarProps {
  events: CalendarEvent[];
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am through 6pm

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function WeeklyCalendar({ events }: WeeklyCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));

  const days = getWeekDays(weekStart);
  const todayStr = toDateStr(new Date());

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

  const eventsForCell = (day: Date, hour: number): CalendarEvent[] => {
    const dayStr = toDateStr(day);
    return events.filter(
      (e) => e.date.startsWith(dayStr) && e.hour === hour,
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={prevWeek}
          className="rounded-lg border border-ud px-3 py-1.5 text-sm font-medium text-ud-muted hover:bg-ud-surface-sunk"
        >
          ← Prev
        </button>
        <span className="text-sm font-medium text-ud-muted">
          {days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
          {days[6].toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <button
          onClick={nextWeek}
          className="rounded-lg border border-ud px-3 py-1.5 text-sm font-medium text-ud-muted hover:bg-ud-surface-sunk"
        >
          Next →
        </button>
      </div>

      <div
        className="grid min-w-[640px] border-l border-t border-ud"
        style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}
      >
        {/* Header row */}
        <div className="border-b border-r border-ud bg-ud-surface-sunk p-2" />
        {days.map((day) => {
          const isToday = toDateStr(day) === todayStr;
          return (
            <div
              key={day.toISOString()}
              className={`border-b border-r border-ud p-2 text-center text-xs font-medium ${
                isToday ? "bg-ud-accent/10 text-ud-accent" : "bg-ud-surface-sunk text-ud-muted"
              }`}
            >
              <div>{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
              <div className="mt-0.5 text-ud-faint">
                {day.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
              </div>
            </div>
          );
        })}

        {/* Hour rows */}
        {HOURS.map((hour) => (
          <Fragment key={hour}>
            <div className="border-b border-r border-ud bg-ud-surface-sunk p-1 text-right text-[11px] text-ud-faint">
              {hour % 12 === 0 ? 12 : hour % 12}
              {hour < 12 ? "am" : "pm"}
            </div>
            {days.map((day) => {
              const cellEvents = eventsForCell(day, hour);
              return (
                <div
                  key={`${toDateStr(day)}-${hour}`}
                  className="min-h-[44px] border-b border-r border-ud p-0.5"
                >
                  {cellEvents.map((event) => (
                    <a
                      key={event.id}
                      href={event.href ?? "#"}
                      className={`block truncate rounded px-1.5 py-0.5 text-xs font-medium text-white ${
                        event.color ?? "bg-blue-500"
                      } hover:opacity-90`}
                    >
                      {event.title}
                    </a>
                  ))}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

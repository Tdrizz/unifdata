"use client";

import { useState } from "react";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import type { CalendarEvent } from "@/components/WeeklyCalendar";
import { FollowUpList } from "./FollowUpList";
import type { FollowUpRow, LeadRow, CustomerRow } from "../types";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { isClosedOpportunity } from "@/lib/status";

type Props = {
  followUps: FollowUpRow[];
  opportunities: LeadRow[];
  people: Pick<CustomerRow, "id" | "name" | "email" | "phone">[];
  filters: { status?: string; due?: string; source?: string };
  profile: IndustryProfile;
};

export function FollowUpViewToggle({ followUps, opportunities, people, filters, profile }: Props) {
  const [view, setView] = useState<"list" | "calendar">("list");

  // Build calendar events from manual follow-ups with a due_date
  const manualCalendarEvents: CalendarEvent[] = followUps
    .filter((fu) => Boolean(fu.due_date))
    .map((fu) => {
      const date = new Date(fu.due_date!);
      return {
        id: `manual-${fu.id}`,
        title: fu.message || "Untitled follow-up",
        date: fu.due_date!,
        hour: date.getHours(),
        color: "bg-amber-500",
        href: `/follow-ups/${fu.id}/edit`,
      };
    });

  // Build calendar events from opportunity follow-ups with a next_follow_up_date
  const opportunityCalendarEvents: CalendarEvent[] = opportunities
    .filter((opp) => !isClosedOpportunity(opp.status) && Boolean(opp.next_follow_up_date))
    .map((opp) => {
      const date = new Date(opp.next_follow_up_date!);
      return {
        id: `opportunity-${opp.id}`,
        title: opp.service_requested ? `Follow up: ${opp.service_requested}` : "Follow up on opportunity",
        date: opp.next_follow_up_date!,
        hour: date.getHours(),
        color: "bg-blue-500",
        href: `/leads/${opp.id}/edit`,
      };
    });

  const calendarEvents: CalendarEvent[] = [...manualCalendarEvents, ...opportunityCalendarEvents];

  return (
    <div className="space-y-5">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView("list")}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
            view === "list"
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          List
        </button>
        <button
          onClick={() => setView("calendar")}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
            view === "calendar"
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Calendar
        </button>
      </div>

      {view === "list" ? (
        <FollowUpList
          followUps={followUps}
          opportunities={opportunities}
          people={people}
          filters={filters}
          profile={profile}
        />
      ) : (
        <WeeklyCalendar events={calendarEvents} />
      )}
    </div>
  );
}

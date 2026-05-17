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
      // Date-only strings parse as midnight UTC — default to 9am so events are visible
      const hour = fu.due_date!.length === 10 ? 9 : new Date(fu.due_date!).getHours();
      return {
        id: `manual-${fu.id}`,
        title: fu.message || "Untitled follow-up",
        date: fu.due_date!,
        hour,
        color: "bg-amber-500",
        href: `/follow-ups/${fu.id}/edit`,
      };
    });

  const opportunityCalendarEvents: CalendarEvent[] = opportunities
    .filter((opp) => !isClosedOpportunity(opp.status) && Boolean(opp.next_follow_up_date))
    .map((opp) => {
      const hour = opp.next_follow_up_date!.length === 10 ? 9 : new Date(opp.next_follow_up_date!).getHours();
      return {
        id: `opportunity-${opp.id}`,
        title: opp.service_requested ? `Follow up: ${opp.service_requested}` : "Follow up on opportunity",
        date: opp.next_follow_up_date!,
        hour,
        color: "bg-blue-500",
        href: `/leads/${opp.id}/edit`,
      };
    });

  const calendarEvents: CalendarEvent[] = [...manualCalendarEvents, ...opportunityCalendarEvents];

  return (
    <div className="space-y-5">
      {/* View toggle — calendar hidden on mobile (grid requires 640px+) */}
      <div className="hidden md:flex items-center gap-2">
        <button
          onClick={() => setView("list")}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
            view === "list"
              ? "border-ud-accent bg-ud-accent text-white"
              : "border-ud bg-ud-surface text-ud-muted hover:bg-ud-surface-sunk"
          }`}
        >
          List
        </button>
        <button
          onClick={() => setView("calendar")}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
            view === "calendar"
              ? "border-ud-accent bg-ud-accent text-white"
              : "border-ud bg-ud-surface text-ud-muted hover:bg-ud-surface-sunk"
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
        <>
          <div className="hidden md:block">
            <WeeklyCalendar events={calendarEvents} />
          </div>
          <div className="md:hidden">
            <FollowUpList
              followUps={followUps}
              opportunities={opportunities}
              people={people}
              filters={filters}
              profile={profile}
            />
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import type { CalendarEvent } from "@/components/WeeklyCalendar";
import { FollowUpList } from "./FollowUpList";
import { FollowUpCreateForm } from "./FollowUpCreateForm";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { FollowUpRow, LeadRow } from "../types";
import type { ContactForSelect } from "@/lib/crm/types";
import type { IndustryProfile } from "@/lib/industry-profiles";
import { isClosedOpportunity } from "@/lib/status";

type Props = {
  followUps: FollowUpRow[];
  opportunities: LeadRow[];
  people: ContactForSelect[];
  filters: { status?: string; due?: string; source?: string };
  profile: IndustryProfile;
};

export function FollowUpViewToggle({ followUps, opportunities, people, filters, profile }: Props) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [sheetOpen, setSheetOpen] = useState(false);

  // Build calendar events from manual follow-ups with a due_date
  const manualCalendarEvents: CalendarEvent[] = followUps
    .filter((fu) => Boolean(fu.due_date))
    .map((fu) => {
      // Date-only strings parse as midnight UTC — default to 9am so events are visible
      const hour = fu.due_date!.length === 10 ? 9 : new Date(fu.due_date!).getHours();
      return {
        id: `manual-${fu.id}`,
        title: fu.message || `Untitled ${profile?.labels.followUpSingular?.toLowerCase() ?? "follow-up"}`,
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
      <div className="hidden md:flex items-center gap-[2px] bg-ud-surface-sunk border border-ud rounded-[10px] p-[3px] w-fit">
        <button
          onClick={() => setView("list")}
          className={`px-4 py-[6px] rounded-[7px] text-[13px] font-semibold transition-colors ${
            view === "list"
              ? "bg-ud-surface text-ud-ink shadow-sm"
              : "text-ud-muted hover:text-ud-ink"
          }`}
        >
          List
        </button>
        <button
          onClick={() => setView("calendar")}
          className={`px-4 py-[6px] rounded-[7px] text-[13px] font-semibold transition-colors ${
            view === "calendar"
              ? "bg-ud-surface text-ud-ink shadow-sm"
              : "text-ud-muted hover:text-ud-ink"
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
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom)+12px)] right-4 z-30 w-12 h-12 rounded-full bg-ud-accent text-white shadow-ud-pop flex items-center justify-center active:scale-95 transition-transform md:hidden"
        aria-label={"Add " + (profile?.labels.followUpSingular ?? "follow-up")}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={"Add " + (profile?.labels.followUpSingular ?? "follow-up")}>
        <FollowUpCreateForm people={people} />
      </BottomSheet>
    </div>
  );
}

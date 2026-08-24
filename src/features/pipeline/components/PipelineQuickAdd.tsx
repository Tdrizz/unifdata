"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/Tabs";
import { LeadCreateForm } from "@/features/leads/components/LeadCreateForm";
import { JobCreateForm } from "@/features/jobs/components/JobCreateForm";
import { SaleCreateForm } from "@/features/sales/components/SaleCreateForm";
import { FollowUpCreateForm } from "@/features/follow-ups/components/FollowUpCreateForm";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { LeadRow as JobsLeadRow } from "@/features/jobs/types";
import type { JobRow } from "@/features/sales/types";

type QuickAddType = "lead" | "job" | "sale" | "follow-up";

type Props = {
  profile: IndustryProfile;
  leads: Pick<JobsLeadRow, "id" | "service_requested" | "status" | "estimated_value">[];
  jobs: Pick<JobRow, "id" | "service_type">[];
  // Overrides the `?type=`/`?add=` URL params — used by callers (like the
  // mobile pipeline FAB) that open this form outside of a real navigation,
  // where relying on useSearchParams() picking up a just-replaced URL would race.
  initialType?: QuickAddType;
  initialStage?: string;
};

export function PipelineQuickAdd({ profile, leads, jobs, initialType: initialTypeOverride, initialStage }: Props) {
  const searchParams = useSearchParams();
  const requestedType = initialTypeOverride ?? searchParams.get("type");
  const initialType: QuickAddType =
    requestedType === "job" || requestedType === "sale" || requestedType === "follow-up" ? requestedType : "lead";
  const [type, setType] = useState<QuickAddType>(initialType);

  return (
    <div className="space-y-4">
      <Tabs
        variant="segment"
        value={type}
        onChange={(id) => setType(id as QuickAddType)}
        options={[
          { id: "lead", label: profile.labels.leadSingular },
          { id: "job", label: profile.labels.jobSingular },
          { id: "sale", label: profile.labels.saleSingular },
          { id: "follow-up", label: profile.labels.followUpSingular },
        ]}
      />
      {type === "lead" && <LeadCreateForm profile={profile} initialStage={initialStage} />}
      {type === "job" && <JobCreateForm leads={leads} />}
      {type === "sale" && <SaleCreateForm profile={profile} jobs={jobs} />}
      {type === "follow-up" && <FollowUpCreateForm leads={leads} />}
    </div>
  );
}

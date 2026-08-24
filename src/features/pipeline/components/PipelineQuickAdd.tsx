"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/Tabs";
import { LeadCreateForm } from "@/features/leads/components/LeadCreateForm";
import { JobCreateForm } from "@/features/jobs/components/JobCreateForm";
import { SaleCreateForm } from "@/features/sales/components/SaleCreateForm";
import type { IndustryProfile } from "@/lib/industry-profiles";
import type { LeadRow as JobsLeadRow } from "@/features/jobs/types";
import type { JobRow } from "@/features/sales/types";

type QuickAddType = "lead" | "job" | "sale";

type Props = {
  profile: IndustryProfile;
  leads: Pick<JobsLeadRow, "id" | "service_requested" | "status" | "estimated_value">[];
  jobs: Pick<JobRow, "id" | "service_type">[];
};

export function PipelineQuickAdd({ profile, leads, jobs }: Props) {
  const searchParams = useSearchParams();
  const requestedType = searchParams.get("type");
  const initialType: QuickAddType =
    requestedType === "job" || requestedType === "sale" ? requestedType : "lead";
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
        ]}
      />
      {type === "lead" && <LeadCreateForm profile={profile} />}
      {type === "job" && <JobCreateForm leads={leads} />}
      {type === "sale" && <SaleCreateForm profile={profile} jobs={jobs} />}
    </div>
  );
}

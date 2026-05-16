import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { LeadCard, type LeadCardLead } from "./LeadCard";

type Props = {
  stage: string;
  color: string;
  leads: LeadCardLead[];
  customerById: Map<string, { name: string }>;
  totalValue: number;
};

export function KanbanColumn({ stage, color, leads, customerById, totalValue }: Props) {
  return (
    <div className="bg-ud-surface-soft border border-ud rounded-[14px] overflow-hidden min-h-[480px] flex flex-col">
      {/* Header */}
      <div className="bg-ud-surface border-b border-ud-soft px-[14px] py-[12px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[7px]">
            <span
              style={{ background: color }}
              className="w-2 h-2 rounded-full inline-block shrink-0"
            />
            <span className="text-[12px] font-semibold text-ud-ink">{stage}</span>
          </div>
          <span className="text-[11.5px] font-bold text-ud-muted udv2-num">{leads.length}</span>
        </div>
        <p className="udv2-num text-[11.5px] text-ud-faint mt-[3px]">
          {formatCurrency(totalValue)}
        </p>
      </div>

      {/* Body */}
      <div className="p-[10px] flex flex-col gap-[8px] flex-1">
        {leads.length === 0 ? (
          <div className="border-[1.5px] border-dashed border-ud-soft rounded-[10px] py-[24px] px-[12px] text-center">
            <p className="text-[11.5px] font-medium text-ud-faint">No quotes here</p>
          </div>
        ) : (
          leads.map((lead) => {
            const customer = lead.customer_id ? customerById.get(lead.customer_id) : undefined;
            return (
              <Link key={lead.id} href={`/leads/${lead.id}/edit`}>
                <LeadCard
                  lead={lead}
                  customerName={customer?.name}
                  href={`/leads/${lead.id}/edit`}
                  compact={true}
                />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

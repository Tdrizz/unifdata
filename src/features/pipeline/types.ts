export type PipelineStageName = "Lead" | "Quoted" | "Active" | "Complete" | "Paid" | "Lost";

export type PipelineCard = {
  id: string;
  sourceType: "lead" | "job" | "sale";
  sourceId: string;
  stage: PipelineStageName;
  title: string;
  value: number | null;
  contactId: string | null;
  contactName: string | null;
  statusLabel: string;
  dateLabel: string | null;
  editHref: string;
  chain: { leadId: string | null; jobId: string | null; saleId: string | null };
};

export type RawContact = { id: string; first_name: string | null; last_name: string | null } | null;

export type RawLead = {
  id: string;
  contact_id: string | null;
  service_requested: string | null;
  status: string | null;
  estimated_value: number | null;
  next_follow_up_date: string | null;
  contact?: RawContact;
};

export type RawJob = {
  id: string;
  contact_id: string | null;
  lead_id: string | null;
  service_type: string | null;
  status: string | null;
  job_value: number | null;
  paid_status: string | null;
  start_date: string | null;
  contact?: RawContact;
};

export type RawSale = {
  id: string;
  contact_id: string | null;
  job_id: string | null;
  service_type: string | null;
  amount: number | null;
  payment_status: string | null;
  sale_date: string | null;
  contact?: RawContact;
};

export type PipelinePageData = {
  cards: PipelineCard[];
  leads: RawLead[];
  jobs: RawJob[];
  sales: RawSale[];
};

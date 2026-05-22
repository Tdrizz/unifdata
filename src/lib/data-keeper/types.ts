export type InboundPayload = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  address?: Record<string, string>;
  sourceSystem: string;
  externalId?: string;
};

export type NormalizedPayload = {
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  fullName: string;
  normalizedBusinessName: string | null;
  extractedMetadata: Record<string, string>;
};

export type SignalScores = {
  email?: number;
  phone?: number;
  name?: number;
  businessName?: number;
};

export type FieldDelta = Record<string, { from: unknown; to: unknown }>;

export type ScoredMatch = {
  candidateId: string;
  score: number;
  signals: SignalScores;
  fieldDelta: FieldDelta;
  reasoning: string;
};

export type DataKeeperAction =
  | "AUTO_UPDATE"
  | "CREATE_PROPOSAL"
  | "AUTO_IGNORE"
  | "AUTO_CREATE";

export type DataKeeperDecision = {
  action: DataKeeperAction;
  targetId: string | null;
  normalizedData: NormalizedPayload;
  fieldDelta: FieldDelta;
  confidence: number;
  reasoning: string;
};

export type MasterCustomerCandidate = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  billing_address: Record<string, string> | null;
  service_address: Record<string, string> | null;
  metadata: Record<string, unknown> | null;
  data_health_score: number | null;
};

export type DataKeeperJobData = {
  organizationId: string;
  sourceSystem: string;
  payload: InboundPayload;
};

export type ProposalRow = {
  id: string;
  organization_id: string;
  target_table: string;
  target_record_id: string | null;
  confidence_score: number;
  proposed_changes: {
    updates: FieldDelta;
    metadata?: Record<string, string>;
  };
  raw_reasoning: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
};

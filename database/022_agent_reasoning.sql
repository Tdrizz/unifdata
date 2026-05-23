-- Add reasoning column to agent_drafts and agent_alerts
-- Workers populate this with a 1-2 sentence explanation of why the action was triggered.
-- Displayed in AgentInbox so owners see the reasoning, not just the conclusion.

ALTER TABLE agent_drafts
  ADD COLUMN IF NOT EXISTS reasoning TEXT;

ALTER TABLE agent_alerts
  ADD COLUMN IF NOT EXISTS reasoning TEXT;

-- UnifData AI Health — Weekly Review Queries
-- Run in Supabase SQL editor each week during pilot.

-- 1. Draft approval rates by type, last 7 days
SELECT
  draft_type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'approved') * 100.0 / NULLIF(COUNT(*), 0),
    1
  ) AS approval_rate_pct
FROM agent_drafts
WHERE created_at > now() - interval '7 days'
GROUP BY draft_type
ORDER BY total DESC;

-- 2. Zod / agent failures by agent, last 7 days
SELECT
  agent_name,
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE error IS NOT NULL) AS failures,
  ROUND(
    COUNT(*) FILTER (WHERE error IS NOT NULL) * 100.0 / NULLIF(COUNT(*), 0),
    1
  ) AS failure_rate_pct
FROM agent_logs
WHERE run_at > now() - interval '7 days'
GROUP BY agent_name
ORDER BY failures DESC;

-- 3. Nightly coordinator success rate, last 14 days
SELECT
  COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE error IS NULL) AS successful,
  COUNT(*) FILTER (WHERE error IS NOT NULL) AS failed,
  ROUND(
    COUNT(*) FILTER (WHERE error IS NULL) * 100.0 / NULLIF(COUNT(*), 0),
    1
  ) AS success_rate_pct
FROM agent_logs
WHERE agent_name = 'nightly-coordinator'
  AND run_at > now() - interval '14 days';

-- 4. ROI events this month by org
SELECT
  organization_id,
  COUNT(*) AS events,
  COALESCE(SUM(amount_recovered), 0) AS total_recovered,
  STRING_AGG(event_type, ', ') AS event_types
FROM roi_events
WHERE created_at > date_trunc('month', now())
GROUP BY organization_id
ORDER BY total_recovered DESC;

-- 5. Agent inbox engagement (approve vs dismiss) by org, last 7 days
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved,
  COUNT(*) FILTER (WHERE status = 'rejected') AS dismissed,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'approved') * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE status != 'pending'), 0),
    1
  ) AS approval_rate_pct
FROM agent_drafts
WHERE created_at > now() - interval '7 days'
GROUP BY organization_id;

-- 6. Chat tool call success rates, last 7 days
SELECT
  agent_name AS tool,
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE error IS NULL) AS succeeded,
  COUNT(*) FILTER (WHERE error IS NOT NULL) AS failed
FROM agent_logs
WHERE agent_name LIKE 'tool_%'
  AND run_at > now() - interval '7 days'
GROUP BY agent_name
ORDER BY total_calls DESC;

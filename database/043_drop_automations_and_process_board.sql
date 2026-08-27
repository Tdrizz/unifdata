-- Automations and Process Board were removed entirely (code, UI, settings)
-- in earlier PRs. Nothing in the codebase reads or writes these tables
-- anymore -- verified with a full-repo grep immediately before this
-- migration. Data checked before dropping: 1 row in automations, 0 in
-- automation_runs, 7 in process_boards, 40 in board_stages (default seeded
-- boards, never customized), 0 in process_records. No real usage lost.
drop table if exists public.automation_runs;
drop table if exists public.automations;
drop table if exists public.process_records;
drop table if exists public.board_stages;
drop table if exists public.process_boards;

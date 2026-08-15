-- Persist the wizard input that produced a project so regeneration can reuse it.
-- Without this, regenerating falls back to placeholder values (3 years, USD 10M,
-- SDG 1) and silently discards the problem statement the user wrote.
-- Run this in Supabase SQL Editor.

alter table pcp_projects add column if not exists input jsonb default null;

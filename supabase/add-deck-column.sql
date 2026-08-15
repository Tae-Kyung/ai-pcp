-- Cache the AI-authored slide plan so repeat .pptx downloads are instant.
-- Run this in Supabase SQL Editor.

alter table pcp_documents add column if not exists deck jsonb default null;

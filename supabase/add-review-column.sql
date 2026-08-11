-- Add review column to pcp_documents to store AI expert review results
-- Run this in Supabase SQL Editor

alter table pcp_documents add column if not exists review jsonb default null;

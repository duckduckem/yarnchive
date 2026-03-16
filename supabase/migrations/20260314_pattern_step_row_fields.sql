-- INCORPORATED INTO INITIAL SCHEMA
-- These fields are already included in supabase/schema.sql.
-- This migration exists for historical reference only.
-- Do NOT run this file — it will fail if schema.sql has already been applied.

-- create type row_type as enum ('round', 'row', 'short_row');
-- alter table pattern_step
--   add column row_label text,
--   add column row_type row_type;

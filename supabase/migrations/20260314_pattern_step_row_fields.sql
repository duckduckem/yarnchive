-- Add row_type enum and row_label / row_type columns to pattern_step

create type row_type as enum ('round', 'row', 'short_row');

alter table pattern_step
  add column row_label text,
  add column row_type row_type;

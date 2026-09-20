-- M1.2: schema for all 8 M1 tables (specs/schema-v1.md).
--
-- Owner-only tables copy the standard RLS pattern from docs/ARCHITECTURE.md.
-- Child tables carry their own user_id (not a join to the parent) and a
-- composite FK (parent_id, user_id) -> parent(id, user_id), so a child row's
-- user_id can never disagree with its parent's (spec §2). stitch_dictionary
-- is the one global-read table: readable by any signed-in user, writable
-- only through migrations.

-- ========================================================================
-- patterns
-- ========================================================================

create table patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  designer text not null,
  is_paid boolean not null default false,
  source_link text,
  created_at timestamptz not null default now(),
  unique (user_id, slug),
  unique (id, user_id)
);

alter table patterns enable row level security;

create policy "select own rows" on patterns
  for select using (auth.uid() = user_id);

create policy "insert own rows" on patterns
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on patterns
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own rows" on patterns
  for delete using (auth.uid() = user_id);

-- ========================================================================
-- pattern_sizes
-- ========================================================================

create table pattern_sizes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pattern_id uuid not null,
  label text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  unique (pattern_id, label),
  foreign key (pattern_id, user_id) references patterns (id, user_id) on delete cascade
);

alter table pattern_sizes enable row level security;

create policy "select own rows" on pattern_sizes
  for select using (auth.uid() = user_id);

create policy "insert own rows" on pattern_sizes
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on pattern_sizes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own rows" on pattern_sizes
  for delete using (auth.uid() = user_id);

-- ========================================================================
-- stitch_dictionary (global-read)
-- ========================================================================

create table stitch_dictionary (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('stitch', 'technique')),
  abbreviation text not null unique,
  name text not null,
  definition text not null,
  link text,
  created_at timestamptz not null default now()
);

alter table stitch_dictionary enable row level security;

create policy "select for authenticated" on stitch_dictionary
  for select using (auth.uid() is not null);

-- No insert/update/delete policies: rows are seeded and changed only
-- through migrations, which run with elevated privileges that bypass RLS.

-- ========================================================================
-- pattern_stitch_entries
-- ========================================================================

create table pattern_stitch_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pattern_id uuid not null,
  kind text not null check (kind in ('stitch', 'technique')),
  abbreviation text not null,
  name text not null,
  definition text not null,
  link text,
  created_at timestamptz not null default now(),
  unique (pattern_id, abbreviation),
  foreign key (pattern_id, user_id) references patterns (id, user_id) on delete cascade
);

alter table pattern_stitch_entries enable row level security;

create policy "select own rows" on pattern_stitch_entries
  for select using (auth.uid() = user_id);

create policy "insert own rows" on pattern_stitch_entries
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on pattern_stitch_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own rows" on pattern_stitch_entries
  for delete using (auth.uid() = user_id);

-- ========================================================================
-- repeat_groups
-- ========================================================================

create table repeat_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pattern_id uuid not null,
  repeat_count jsonb,
  repeat_condition text,
  size_params jsonb,
  last_repeat_note text,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (pattern_id, user_id) references patterns (id, user_id) on delete cascade
);

-- Exactly one of repeat_count / repeat_condition is set — enforced by the
-- M1.3 import script, not a DB check (spec §3.5).

alter table repeat_groups enable row level security;

create policy "select own rows" on repeat_groups
  for select using (auth.uid() = user_id);

create policy "insert own rows" on repeat_groups
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on repeat_groups
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own rows" on repeat_groups
  for delete using (auth.uid() = user_id);

-- ========================================================================
-- steps
-- ========================================================================

create table steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pattern_id uuid not null,
  step_order integer not null,
  step_type text not null check (step_type in ('instruction', 'note', 'checkpoint')),
  section text not null,
  subsection text,
  row_or_round text,
  side text check (side in ('RS', 'WS')),
  instructions_before text,
  stitch_instructions text,
  instructions_after text,
  size_params jsonb,
  stitch_count jsonb,
  branch_options jsonb,
  applies_to_sizes text[],
  repeat_group_id uuid,
  repeat_step_number integer,
  link text,
  errata_note text,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (pattern_id, user_id) references patterns (id, user_id) on delete cascade,
  foreign key (repeat_group_id, user_id) references repeat_groups (id, user_id) on delete cascade
);

alter table steps enable row level security;

create policy "select own rows" on steps
  for select using (auth.uid() = user_id);

create policy "insert own rows" on steps
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on steps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own rows" on steps
  for delete using (auth.uid() = user_id);

-- ========================================================================
-- projects
-- ========================================================================

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pattern_id uuid not null,
  size_label text not null,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (pattern_id, user_id) references patterns (id, user_id) on delete cascade
);

alter table projects enable row level security;

create policy "select own rows" on projects
  for select using (auth.uid() = user_id);

create policy "insert own rows" on projects
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own rows" on projects
  for delete using (auth.uid() = user_id);

-- ========================================================================
-- project_progress
-- ========================================================================

create table project_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null,
  current_step_id uuid,
  repeat_pass_counts jsonb not null default '{}',
  checkbox_states jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique (project_id),
  foreign key (project_id, user_id) references projects (id, user_id) on delete cascade,
  foreign key (current_step_id, user_id) references steps (id, user_id) on delete set null
);

alter table project_progress enable row level security;

create policy "select own rows" on project_progress
  for select using (auth.uid() = user_id);

create policy "insert own rows" on project_progress
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on project_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own rows" on project_progress
  for delete using (auth.uid() = user_id);

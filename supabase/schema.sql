-- Yarnchive — Initial Schema
-- Version: 2.0
-- Apply in Supabase Dashboard → SQL Editor
--
-- ID strategy:
--   Pattern library tables (pattern, pattern_variant, pattern_size, pattern_step,
--   stitch_def, repeat_group) use TEXT primary keys — human-readable slugs that
--   make data entry and debugging easier for shared reference data.
--
--   User-space tables (users, project, project_step_state, etc.) use UUID primary
--   keys. `users.id` must match the UUID from Supabase Auth.
--
-- Before importing test data:
--   1. Create an auth user in Supabase Dashboard → Authentication → Users
--   2. Copy that user's UUID
--   3. Use it as `id` when inserting into `users`
--   4. Use the same UUID as `user_id` in `project`

-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type step_type_enum as enum ('instruction', 'note', 'checkpoint');
create type side_enum as enum ('RS', 'WS');
create type project_status_enum as enum ('Planned', 'In Progress', 'Finished', 'Shelved', 'Abandoned');
create type needle_type_enum as enum ('Straight', 'Circular', 'DPNs');
create type notion_type_enum as enum (
  'Tapestry Needle', 'Crochet Hook', 'Stitch Markers',
  'Scissors', 'Cable Needle', 'Row Counter', 'Waste Yarn'
);

-- ============================================================
-- STITCH DEFINITIONS
-- ============================================================

create table stitch_def (
  id           text primary key,   -- abbreviation or hyphenated slug, e.g. 'k', 'long-tail-cast-on'
  abbreviation text,               -- nullable: some entries have no abbreviation
  name         text not null,
  description  text,
  category     text,               -- 'basic', 'increase', 'decrease', 'marker', 'cast on', 'finishing', etc.
  image_urls   text[],
  video_urls   text[],
  created_at   timestamptz not null default now()
);

-- ============================================================
-- PATTERN LIBRARY  (shared across all users, no duplicates)
-- ============================================================

create table pattern (
  id                text primary key,  -- human-readable slug, e.g. 'tolsta'
  name              text not null,
  designer          text,
  url               text,              -- source URL (Ravelry, designer site, etc.)
  source            text,              -- book or collection name if not a URL
  full_instructions text,              -- original pattern text stored for reference
  gauge             text,
  needle_size       text,              -- as written in the pattern, e.g. 'US 8 / 5.0 mm'
  construction      text,              -- e.g. 'In the Round', 'Flat', 'Top-Down'
  difficulty        text,              -- Beginner / Intermediate / Advanced / Expert
  category_1        text,              -- primary category, e.g. 'Tops'
  category_2        text,              -- secondary category, e.g. 'Tee'
  sizing            text,              -- sizing guidance text, may include HTML
  ease_min_cm       numeric(5,2),
  ease_max_cm       numeric(5,2),
  ease_min_in       numeric(5,2),
  ease_max_in       numeric(5,2),
  created_at        timestamptz not null default now()
);

create table pattern_variant (
  id          text primary key,    -- e.g. 'tolsta_dk', 'tolsta_worsted'
  pattern_id  text not null references pattern(id) on delete cascade,
  label       text not null,       -- e.g. 'DK Weight', 'Worsted Weight'
  notes       text,
  created_at  timestamptz not null default now()
);

create table pattern_size (
  id                   text primary key,   -- e.g. '3_f-cup', '1_d-cup'
  pattern_id           text not null references pattern(id) on delete cascade,
  variant_id           text references pattern_variant(id) on delete set null,
  label                text not null,       -- e.g. 'Size 3 (F cup)', 'One Size'
  sort_order           smallint not null default 0,
  yardage              int,                 -- total yardage for this size
  -- Finished measurements (both cm and in stored for display flexibility)
  m_full_bust_circ_cm  numeric(6,2),
  m_full_bust_circ_in  numeric(6,2),
  m_bicep_circ_cm      numeric(6,2),
  m_bicep_circ_in      numeric(6,2),
  m_yoke_depth_cm      numeric(6,2),
  m_yoke_depth_in      numeric(6,2),
  m_body_len_cm        numeric(6,2),
  m_body_len_in        numeric(6,2),
  m_sleeve_len_cm      numeric(6,2),
  m_sleeve_len_in      numeric(6,2),
  m_foot_len_cm        numeric(6,2),
  m_foot_len_in        numeric(6,2),
  created_at           timestamptz not null default now()
);

create table repeat_group (
  id            text primary key,   -- e.g. 'repeat_1', 'repeat_2'
  pattern_id    text not null references pattern(id) on delete cascade,
  label         text,               -- optional display label
  default_total int,                -- suggested number of repeats
  condition     text                -- human-readable stop condition
);

create table pattern_step (
  id                  text primary key,   -- e.g. 'tolsta-tolsta_dk-3_f-cup-1'
  pattern_id          text not null references pattern(id) on delete cascade,
  size_id             text references pattern_size(id) on delete cascade,
  variant_id          text references pattern_variant(id) on delete set null,
  step_num            int not null,
  step_type           step_type_enum not null default 'instruction',
  section             text,
  subsection          text,
  step_label          text,               -- source pattern reference, e.g. 'Round 1', 'Short Row 2'
  iteration_label     text,               -- for multi-piece patterns, e.g. 'Left Sleeve'
  side                side_enum,
  yarn_label          text,               -- active yarn at this step (colorwork)
  instructions_before text,               -- prose only, no stitch markup
  stitch_instructions text,               -- stitch abbreviations with [bracket] markup
  instructions_after  text,               -- prose only, no stitch markup
  repeat_group_id     text references repeat_group(id) on delete set null,
  repeat_total        int,
  repeat_condition    text,
  created_at          timestamptz not null default now(),
  unique (pattern_id, size_id, step_num)
);

-- Supply requirements
create table pattern_yarn (
  id             text primary key,
  pattern_id     text not null references pattern(id) on delete cascade,
  size_id        text references pattern_size(id) on delete cascade,
  label          text,
  weight_code    smallint not null check (weight_code between 0 and 7),
  yardage        int not null,
  fiber_notes    text,
  suggested_yarn text
);

create table pattern_needle (
  id          text primary key,
  pattern_id  text not null references pattern(id) on delete cascade,
  size_id     text references pattern_size(id) on delete cascade,
  label       text,
  type        needle_type_enum not null,
  size_us     real,
  size_mm     numeric(4,2),
  lengths     text[],
  notes       text
);

create table pattern_notion (
  id          text primary key,
  pattern_id  text not null references pattern(id) on delete cascade,
  type        notion_type_enum not null,
  details     text,
  notes       text
);

-- ============================================================
-- USER SPACE  (private per user, UUID keys)
-- ============================================================

create table users (
  id           uuid primary key,   -- must match auth.users.id from Supabase Auth
  email        text not null,
  display_name text,
  created_at   timestamptz not null default now()
);

create table user_pattern (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  pattern_id     text not null references pattern(id) on delete cascade,
  personal_notes text,
  added_at       timestamptz not null default now(),
  unique (user_id, pattern_id)
);

create table stash_yarn (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  brand             text,
  yarn_line         text,
  color_name        text,
  color_family      text,
  color_hex         text,
  weight_code       smallint not null check (weight_code between 0 and 7),
  yardage_total     int not null,
  yardage_remaining int not null,
  fiber             text,
  image_urls        text[],
  notes             text,
  created_at        timestamptz not null default now()
);

create table stash_needle (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  type          needle_type_enum not null,
  size_us       real,
  size_mm       numeric(4,2),
  lengths_owned text[],
  created_at    timestamptz not null default now()
);

create table project (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  pattern_id  text not null references pattern(id),
  size_id     text references pattern_size(id),
  name        text not null,
  status      project_status_enum not null default 'Planned',
  notes       text,
  start_date  date,
  finish_date date,
  created_at  timestamptz not null default now()
);

create table project_step_state (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null unique references project(id) on delete cascade,
  current_step_id text references pattern_step(id),
  current_repeat  int,
  cached_steps    jsonb,
  last_updated    timestamptz not null default now()
);

create table project_yarn (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references project(id) on delete cascade,
  stash_yarn_id      uuid not null references stash_yarn(id) on delete cascade,
  pattern_yarn_label text,
  unique (project_id, stash_yarn_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index on pattern_step (pattern_id, step_num);
create index on pattern_step (size_id);
create index on pattern_step (repeat_group_id);
create index on pattern_variant (pattern_id);
create index on pattern_size (pattern_id);
create index on project (user_id);
create index on project_step_state (project_id);
create index on user_pattern (user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table stitch_def         enable row level security;
alter table pattern            enable row level security;
alter table pattern_variant    enable row level security;
alter table pattern_size       enable row level security;
alter table repeat_group       enable row level security;
alter table pattern_step       enable row level security;
alter table pattern_yarn       enable row level security;
alter table pattern_needle     enable row level security;
alter table pattern_notion     enable row level security;
alter table users              enable row level security;
alter table user_pattern       enable row level security;
alter table stash_yarn         enable row level security;
alter table stash_needle       enable row level security;
alter table project            enable row level security;
alter table project_step_state enable row level security;
alter table project_yarn       enable row level security;

-- Pattern library: readable by all authenticated users
create policy "Authenticated read" on stitch_def      for select to authenticated using (true);
create policy "Authenticated read" on pattern         for select to authenticated using (true);
create policy "Authenticated read" on pattern_variant for select to authenticated using (true);
create policy "Authenticated read" on pattern_size    for select to authenticated using (true);
create policy "Authenticated read" on repeat_group    for select to authenticated using (true);
create policy "Authenticated read" on pattern_step    for select to authenticated using (true);
create policy "Authenticated read" on pattern_yarn    for select to authenticated using (true);
create policy "Authenticated read" on pattern_needle  for select to authenticated using (true);
create policy "Authenticated read" on pattern_notion  for select to authenticated using (true);

-- Users: own row only
create policy "Own row"    on users for select to authenticated using (auth.uid() = id);
create policy "Own update" on users for update to authenticated using (auth.uid() = id);

-- User-space: own data only
create policy "Own data" on user_pattern for all to authenticated using (user_id = auth.uid());
create policy "Own data" on stash_yarn   for all to authenticated using (user_id = auth.uid());
create policy "Own data" on stash_needle for all to authenticated using (user_id = auth.uid());
create policy "Own data" on project      for all to authenticated using (user_id = auth.uid());

create policy "Own data" on project_step_state for all to authenticated
  using (project_id in (select id from project where user_id = auth.uid()));

create policy "Own data" on project_yarn for all to authenticated
  using (project_id in (select id from project where user_id = auth.uid()));

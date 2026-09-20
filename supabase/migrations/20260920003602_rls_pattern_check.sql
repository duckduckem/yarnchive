-- Standard RLS pattern, proven with a throwaway table before M1.2 copies it
-- for real user-owned tables. See docs/ARCHITECTURE.md "Data and auth".
-- Dropped by the migration that follows this one once verified.

create table rls_pattern_check (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table rls_pattern_check enable row level security;

create policy "select own rows" on rls_pattern_check
  for select using (auth.uid() = user_id);

create policy "insert own rows" on rls_pattern_check
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on rls_pattern_check
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own rows" on rls_pattern_check
  for delete using (auth.uid() = user_id);

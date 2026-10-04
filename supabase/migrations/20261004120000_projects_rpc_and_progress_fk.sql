-- M1.7: create_project() and a corrected project_progress.current_step_id FK.
-- See specs/projects.md sections 1 and 5.

-- ========================================================================
-- FK fix
-- ========================================================================
-- A plain "on delete set null" on the composite FK (current_step_id, user_id)
-- nulls user_id too, which is NOT NULL, so deleting a referenced step fails.
-- Null only current_step_id (Postgres 15+).

alter table project_progress
  drop constraint project_progress_current_step_id_user_id_fkey;

alter table project_progress
  add constraint project_progress_current_step_id_user_id_fkey
  foreign key (current_step_id, user_id) references steps (id, user_id)
  on delete set null (current_step_id);

-- ========================================================================
-- create_project
-- ========================================================================
-- Inserts a project and its project_progress row in one transaction.
-- security invoker: RLS applies, user_id comes from the column default
-- (auth.uid()).

create function create_project(
  p_pattern_id uuid,
  p_size_label text,
  p_current_step_id uuid default null,
  p_repeat_pass_counts jsonb default '{}'
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  if not exists (
    select 1 from pattern_sizes
    where pattern_id = p_pattern_id and label = p_size_label
  ) then
    raise exception 'size "%" is not a size of this pattern', p_size_label;
  end if;

  if p_current_step_id is not null and not exists (
    select 1 from steps
    where id = p_current_step_id and pattern_id = p_pattern_id
  ) then
    raise exception 'start step is not a step of this pattern';
  end if;

  insert into projects (pattern_id, size_label)
  values (p_pattern_id, p_size_label)
  returning id into v_project_id;

  insert into project_progress (project_id, current_step_id, repeat_pass_counts)
  values (v_project_id, p_current_step_id, coalesce(p_repeat_pass_counts, '{}'));

  return v_project_id;
end;
$$;

revoke all on function create_project(uuid, text, uuid, jsonb) from public;
grant execute on function create_project(uuid, text, uuid, jsonb) to authenticated;

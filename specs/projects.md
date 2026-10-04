# Projects, saved progress, jump to step (M1.7)

**Status:** Approved. Covers PROJ-01 (create), PROJ-02 (save progress), PROJ-03 (list), KNIT-07 (jump to step), and re-importing a pattern while a project is in progress. Builds on `schema-v1.md` (§3.7 `projects`, §3.8 `project_progress`) and `knit-navigation.md`. Out of scope: project status, dates, notes, photos (M2), timer, offline, running stitch counts, personal versions, visual design (M1.8 usability pass).

## 1. Creating a project (PROJ-01)

Inputs: pattern (from my `patterns`), size (labels from that pattern's `pattern_sizes`, in `display_order`), optional start step (default: the beginning).

1. `/projects/new`: pick a pattern, then a size; optionally "Start at a specific step" opens the step picker (§3) over the size-filtered steps.
2. Create calls one Postgres function, `create_project(p_pattern_id, p_size_label, p_current_step_id, p_repeat_pass_counts)`, `security invoker` (RLS applies; `user_id` defaults to `auth.uid()`). It inserts `projects` and `project_progress` in one transaction and returns the project id. It raises if the size label isn't in `pattern_sizes` for the pattern (schema rule 10, enforced at creation) or the step isn't in the pattern. A function rather than two REST calls, for the same reason as the import script: "created together" needs a real transaction.
3. No start step: `current_step_id` is null (resume at the first step). A start step inside a repeat group's body uses the pass chosen per §3.
4. Success: go to `/projects/:id`. Failure: message on the form, nothing created. Duplicates (same pattern and size) are allowed.

## 2. Saving and resuming (PROJ-02)

- `src/lib/progress.ts` stays the only reader and writer of progress. The key is the project id. Per project it holds `progress` and a save state: `idle | saving | failed(message)`.
- **Open:** load the project's `project_progress` row. No row means empty progress; the first save upserts it.
- **Write:** every change updates memory immediately, then saves with an upsert on `project_id` of `current_step_id`, `repeat_pass_counts`, `checkbox_states`, `updated_at`. One save in flight at a time; changes made meanwhile are coalesced and the latest state is sent when it finishes.
- **Failure is visible:** a persistent banner ("Not saved: your place is only on this screen") with a Retry button. The next change also retries. `beforeunload` warns while a save is pending or failing. In-memory position is never discarded on failure. The banner clears on success.
- **Other devices:** state loads when a project opens, so opening it anywhere resumes at the last saved place. Last write wins; an already-open stale screen is not refreshed (accepted for M1).
- Checkpoint confirmation and per-move strikethrough stay transient.
- `useProgress(projectId)` returns `{ progress (null while loading), set, save }`.

## 3. Jump to step (KNIT-07), including inside a repeat group

The picker is a plain scrollable list of the size-filtered steps (`n. Section › Subsection · Row`). It is also used for "start at a step" in §1.

- A step outside any group, or a group's intro: no pass question. Next from an intro starts pass 1 as before.
- A group **body** step: the picker shows one number field, "Pass", default 1. Clamped to 1..count for a count group, at least 1 for a condition group. (The pass can't be inferred from the step; "round 3 of 7 on the sleeve" is the real case.)
- **A jump rewrites repeat state wholesale:** `repeat_pass_counts` and `checkbox_states` are cleared, then the target group (if any) gets `{ [group]: pass }` with its checkbox unticked. Other groups fall back to the existing defaults (view shows pass 1; stepping back out of a group restores its final pass). This keeps stale counts from earlier visits from making Previous land on the wrong pass.
- Pure function `jumpTo(nav, index, pass?)` in `src/lib/knitNav.ts`; the UI only calls it. Checkpoint confirmation resets as on any move.

## 4. Project list (PROJ-03) and routes

- `/`: the project list: pattern name and size, each linking to `/projects/:id`; a "New project" link; Sign out. Empty state points to New project.
- `/projects/new`, `/projects/:id`. The temporary `/knit/:slug/:size` route and `Home.tsx` go away. Plain links (the Vercel SPA rewrite already exists), no router dependency; a small pure `parseRoute` replaces `parseKnitRoute`.
- Theme-token classes only; readable and tappable on a phone, no other layout decisions.

## 5. Re-importing with a project in progress (`--replace`)

**Before M1.7:** `--replace` keeps the `patterns` row (so projects survive) and deletes and recreates sizes, entries, repeat groups and steps with new ids. `project_progress.current_step_id` has a composite FK `(current_step_id, user_id) ... on delete set null`; in Postgres that nulls *every* referencing column, including the NOT NULL `user_id`, so deleting a referenced step is expected to abort the transaction. Loud, nothing lost, but `--replace` is blocked while any project has a position. Separately, `repeat_pass_counts` and `checkbox_states` are keyed by repeat group ids, which a replace regenerates. (The 2026-09-19 decision said position "resets to null"; that was never exercised with progress rows.)

**Behavior now.** `step_order` is hand-entered in the CSV and stays stable when sections are appended.

1. Before writing, for each project on the pattern with a position, read its anchor: the old step's `step_order`, `section`, `subsection`, `row_or_round`, and one `step_order` for each group id in its `repeat_pass_counts` / `checkbox_states`.
2. Find the new step at the same `step_order` that applies to the project's size (`applies_to_sizes` empty or including it). **Match** if section, subsection and row_or_round are equal. After inserting the new steps and groups in the same transaction, set `current_step_id` to the new step and re-key the pass and checkbox maps to the new group ids using the same `step_order` lookup.
3. **Mismatch** (the step_order no longer exists, belongs to a different row, or the current step's group can't be mapped): the import **fails before deleting anything**, listing each affected project (size, old step) and why. Group state for groups other than the current step's that can't be re-keyed is dropped.
4. `--reset-progress` proceeds anyway and resets only the mismatched projects to not started. `--dry-run` prints the same plan (N keep their place, M would block).
5. The matching is a pure function in `scripts/lib/remap.ts` with unit tests; `scripts/lib/db.ts` reads anchors and applies the result.
6. Limit: inserting rows in the middle of a pattern shifts `step_order`, trips the label check, and fails loudly rather than moving you to the wrong row. Appending sections is the happy path.
7. Migration also changes the FK to `on delete set null (current_step_id)` so deleting a step can never fail on `user_id`.

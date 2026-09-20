# Decision Log

A running record of major decisions and why we made them. Add entries at the top. Keep them short: a few sentences each.

Format:
```
## YYYY-MM-DD — Short title
**Decision:** What we chose.
**Why:** Brief reasoning.
**Alternatives considered:** What we didn't pick and why.
```

---

## 2026-09-19 — M1.3 import: direct Postgres transaction; --replace keeps the pattern row, resets progress to start

**Decision:** The import script (`scripts/import-pattern.ts`) connects straight to Postgres with the service-role connection string (`SUPABASE_DB_URL`), instead of through `@supabase/supabase-js` like the rest of the app, and wraps every write in one transaction. Re-importing a pattern whose slug already exists requires `--replace`, which keeps the existing `patterns` row and only deletes-and-reinserts its `pattern_sizes` / `pattern_stitch_entries` / `repeat_groups` / `steps`.

**Why:** The REST API `@supabase/supabase-js` uses has no multi-statement transactions, and "an error means nothing is written" needs a real one — especially for `--replace`, where deleting old children before inserting new ones would otherwise risk leaving a pattern with none at all if it failed partway. Keeping the `patterns` row means any `projects` row pointing at it survives, since `projects.pattern_id` cascades on the *pattern's* deletion, which this avoids.

**Effect on an in-progress project:** `project_progress.current_step_id` pointed at a step `--replace` just deleted; its FK is `on delete set null`, so it resets to `null` — already defined as "not started, resume at the pattern's first step." You lose your exact place, never the project itself. Preserving exact position across a re-import is real complexity for a rare event — not built for M1.

**Alternatives considered:** Delete-and-recreate the whole pattern on re-import (rejected — cascades away any project on it, per `projects.pattern_id on delete cascade`). Ordered `@supabase/supabase-js` inserts with compensating deletes on failure (rejected — weaker guarantee, actively risky for `--replace`'s delete-then-insert sequence).

## 2026-09-20 — Check constraints in the DB, business rules stay in the import script

**Decision:** M1.2's migrations add DB `check` constraints for small fixed-value columns — `step_type`, `kind` (on both `stitch_dictionary` and `pattern_stitch_entries`), and `side`. Everything else in schema-v1.md §6 (size-label existence, repeat_groups' exactly-one-of-count/condition, cross-row JSON key consistency) stays enforced by the M1.3 import script only.

**Why:** Single-column enum checks are cheap and catch bad data from any writer — the M1.3 script today, the M3 parser later, or a future UI — not just the current import path. Cross-row rules need sibling data a column check can't see, so they stay where the spec already put them.

**Alternatives considered:** Push everything to the import script for consistency with the rest of §6 — rejected, since these specific checks cost nothing and outlive any one entry path.

## 2026-09-20 — project_progress.current_step_id resets on delete, doesn't cascade

**Decision:** `project_progress.current_step_id`'s FK uses `on delete set null` rather than cascade. schema-v1.md doesn't specify this explicitly.

**Why:** Deleting a step should reset "resume at" to "not started," not silently delete the whole progress row (and with it `repeat_pass_counts` / `checkbox_states`, which have nothing to do with the deleted step).

**Alternatives considered:** Cascade, matching the other composite FKs — rejected, since it would destroy progress data unrelated to the deleted step.

---

## 2026-09-20 — Composite foreign keys for cross-user protection

**Decision:** Every child table's foreign key to its parent (`steps.pattern_id`, `project_progress.project_id`, `steps.repeat_group_id`, etc.) is composite — `(parent_id, user_id)` references the parent's `(id, user_id)` — rather than a plain `id` reference. Parent tables that get referenced this way (`patterns`, `repeat_groups`, `steps`, `projects`) each gain an additional `unique (id, user_id)` constraint to support it.

**Why:** RLS already stops one user from *reading* another user's rows, but a plain `pattern_id` foreign key would still allow a row's own `user_id` to disagree with its parent's `user_id` if the client ever inserted the wrong one — an app-bug risk, not the cross-user read/write RLS is designed to stop. The composite FK makes that state impossible at the database level, for the cost of one extra unique constraint per referenced parent table.

**Alternatives considered:** Relying on RLS alone (rejected — RLS governs which rows a user can touch, not whether the rows they insert are internally consistent with each other); a trigger checking `user_id` matches on insert/update (rejected — a constraint doesn't need to be kept in sync with every insert path the way a trigger would).

---

## 2026-09-20 — Repeat groups: two shapes, not three; size-varying conditions move to size_params

**Decision:** Reviewing `specs/schema-v1.md` found that repeat groups only need two shapes, not the three originally drafted. A **count group** (`repeat_count` set, `repeat_condition` null) has a passes-count that may vary by size; when the pattern also has a per-pass "work even until X" condition, that's now an ordinary step inside the group carrying its own `size_params` — not a group-level field. A **condition group** (`repeat_condition` set, `repeat_count` null) is open-ended, with a checkbox shown at the end of every pass. `repeat_groups` gains its own `size_params` column (same shape as `steps.size_params`) to fill per-size placeholders inside `repeat_condition`'s text, since the sock's heel-flap length, the sweater's body length, and its sleeve-increase spacing all vary by size. `repeat_count` is redefined as "the number of times the knitter works the grouped steps" (superseding the "total passes" phrasing in the entry below); "N more times" becomes `repeat_count = N + 1` only when the pattern's first pass is itself inside the group — when it's a standalone step before the group (now the normal case, since "work even until X" moved out of the group and onto a step), the count is entered as `N` directly.

**Why:** The original three-shape model put a size-varying condition on the group itself, but that's the same "text that varies by size" problem `steps.size_params` already solves — inventing a second mechanism for it on `repeat_groups` was unnecessary once the condition text is free to live on a step instead. Splitting it out this way also resolved a real inconsistency: the sleeve-increase worked example had claimed the same repeat count applied to every size, when it doesn't.

**Alternatives considered:** Keeping the "both" shape and adding size variance to `repeat_condition` directly (rejected — duplicates `size_params`, which already exists); a separate `condition_size_params` column just for the "both" case (rejected — moot once "both" is gone).

---

## 2026-09-20 — Schema spec: repeat_count is per-size, ownership columns are per-table, sizes-list is a native array

**Decision:** Writing `specs/schema-v1.md` (M1.1 session B) settled four exact shapes that the session-A decisions named but didn't fully pin down:
- `repeat_groups.repeat_count` is JSONB, size label → total passes — not a plain integer — so it can vary by size (Yoke Shaping) or repeat the same value across sizes (Sleeve increases) with one column.
- `project_progress.repeat_pass_counts` and `.checkbox_states` are both keyed by `repeat_group_id`, not by step id — the pass counter and the condition checkbox belong to the group, not to any one step in it.
- Every child table (`pattern_sizes`, `pattern_stitch_entries`, `repeat_groups`, `steps`, `project_progress`) carries its own `user_id` and its own copy of the standard four RLS policies, rather than checking ownership through a join to `patterns`/`projects`. Denormalized, but keeps every policy the same one-line shape.
- `steps.applies_to_sizes` is a native Postgres `text[]`, not JSONB — it's a flat membership list with no per-size value attached.

**Why:** Session A resolved *that* these things needed to happen (repeat counts vary by size, ownership is universal, a step can apply to only some sizes) but not the exact column shape. Left ambiguous, M1.2 would have had to make these calls anyway, with less context. Deciding them here keeps the migrations a direct translation of the spec.

**Alternatives considered:** A plain integer `repeat_count` with a separate override mechanism for size-varying cases (rejected — two mechanisms for one concept); RLS via a join to the parent table (rejected — breaks the copy-paste-per-table simplicity of the standard pattern); `applies_to_sizes` as JSONB (rejected — no value to attach per entry, just membership).

---

## 2026-09-20 — Progress: step, repeat counts, and checkboxes persist; strikethroughs don't

**Decision:** `project_progress` persists current step, repeat-group pass counts, and condition-checkbox states. Per-stitch strikethrough state (KNIT-02) is not saved — it resets when the knitter leaves a step.

**Why:** Matches PROJ-02's actual requirement without persisting UI state that's cheap to lose and would otherwise add sync surface for M2's offline work.

**Alternatives considered:** Persisting strikethrough state too (rejected — no real use case, conflicts with keeping progress writes simple for M2).

---

## 2026-09-20 — Per-size data keyed by size label

**Decision:** Every per-size structure — `size_params`, `repeat_count`, `stitch_count` breakdowns, a step's applies-to-sizes list — references sizes by `label` (e.g. `"S"`, `"1"`), not by database id or numeric position.

**Why:** Keeps per-size JSON self-describing (`{"S": 57, "M": 63, ...}` reads on its own) and matches what's typed into the CSV. The import script validates every label used against the pattern's actual size list, covering the lack of a database-enforced foreign key.

**Alternatives considered:** Referencing `pattern_sizes.id` (rejected — needs a join for every read, produces unreadable JSON keys, for a table that's rarely written).

---

## 2026-09-20 — Measurement units: keep both, store as printed; canonical unit deferred

**Decision:** Measurement values in instruction prose are stored as text exactly as printed (e.g. `8"/20.5 cm`), not split into separate inch/cm numeric fields. A canonical unit, and any conversion or display-preference feature, is deferred to M4.

**Why:** Both units appear throughout, and no M1 feature reads a measurement as a number — it's prose, with a manual checkbox for condition-based repeats. Storing as printed avoids picking a canonical unit before a feature needs one and avoids two independently-entered numbers drifting apart.

**Alternatives considered:** Inches-only (rejected — loses information for no M1 benefit); canonical + computed conversion (deferred until a display-preference feature exists).

---

## 2026-09-20 — Sizes stay generic; yarn-by-size stays M4

**Decision:** `pattern_sizes` holds only a label and display order in M1 — no measurement-type columns — working for both Nurtured (bust, labels "1"–"9") and the socks (foot circumference, labels "S"–"XL"). Yarn quantity varying by size (Nurtured's does, the socks' doesn't) stays M4 scope (`PAT-07`).

**Why:** Confirmed against both patterns; no changes needed to the existing plan.

---

## 2026-09-20 — Deferred for M1: no yarn label, no mid-pattern value recording

**Decision:** No `yarn_label` field on steps, despite the socks switching main/contrast color by section — color changes are entered as `note` steps. Values the pattern asks you to record mid-knit (Nurtured's sleeve-round Pro Tip) also stay as `note` steps; a step type that records a value into project state is left for M2+.

**Why:** Both are real KNIT-screen conveniences, not things M1 needs to prove the schema. Cheap to add later as nullable columns.

**Alternatives considered:** Adding `yarn_label` now (rejected — no feature reads it yet).

---

## 2026-09-20 — Steps: optional link and errata note

**Decision:** Steps get `link` (tutorial URL, set on a section's intro step — the sock links Cuff, Heel Flap, Heel Turn, Gusset, Toe Decreases, and Kitchener) and `errata_note` (free text, for corrections to the source pattern — the sock's Toe Decreases section repeats "rows 2 and 3" without ever defining a Row 3).

**Why:** Cheap nullable additions to steps rather than new entities; `errata_note` keeps a correction traceable instead of silently vanishing.

**Alternatives considered:** A `sections` entity to hold the link (rejected — sections are label fields on steps, not a table, and nothing else needs more than that yet).

---

## 2026-09-20 — Dictionary: stitches and techniques, pattern-only entries, renamed

**Decision:** The stitch dictionary gets a `kind` field (stitch | technique) and an optional `link` field, covering both in one entity. Named, multi-row stitch patterns (Nurtured's Main Fabric Stitch Pattern) are not their own entity — M1 doesn't track motif position; the knitter does, same as the pattern itself expects. The Main Fabric Stitch Pattern is entered as a pattern-only dictionary entry, with definition text covering both the in-the-round and flat versions. The per-pattern table is renamed from `pattern_stitch_overrides` to `pattern_stitch_entries`, since it now holds pattern-only entries as well as overrides.

**Why:** One dictionary matches KNIT-06's own wording. A `stitch_patterns` entity and motif-position tracking are more than M1 needs and cut against the existing rule that repeated content is duplicated as steps rather than referenced. (A motif round counter is a real Later idea, to be added to `PRODUCT.md` separately.)

**Alternatives considered:** A `stitch_patterns` entity with per-project position tracking (rejected — no current feature needs it).

---

## 2026-09-20 — Stitch counts: labeled breakdown, not a single number

**Decision:** `stitch_count` on a verify checkpoint is a labeled structure (label → per-size value), defaulting to a single "total" label for simple checks (the sock's Toe Decreases target). Checkpoints with a breakdown (Nurtured's Join Sleeves and Body: total, per sleeve, per front/back, raglan stitches) store one entry per label.

**Why:** A single number can't hold Join Sleeves and Body's breakdown, and dropping it would mean the knitter can't check against the numbers the pattern actually gives.

**Alternatives considered:** One number per size (rejected — loses the breakdown).

---

## 2026-09-20 — Steps: one mechanism for size-specific text and size-varying step counts

**Decision:** A step carries an optional list of sizes it applies to. Size-specific wording (the sock's Leg section: S/XL decrease, M increases, L does nothing) and size-varying step counts (the sock's Heel Turn, whose row count is computable per size) are both entered as separate step rows sharing the same position, each tagged with the size(s) it applies to. A size with no matching row at a position has no step there. The import script validates that no size matches more than one row at the same position.

**Why:** These looked like two problems but are the same shape: a step whose existence or wording depends on size.

**Alternatives considered:** Separate mechanisms for text variants vs. expanded sequences (rejected — same shape); duplicating the full step list per size (rejected — multiplies identical steps).

---

## 2026-09-20 — Repeat groups: shapes, total-pass counts, no nesting

**Decision:** `repeat_count` and `repeat_condition` are each independently nullable, giving three shapes: pure count (Yoke Shaping's raglan-decrease rounds), pure open-ended condition with no computable count (the sock's Heel Flap), and count with a per-iteration condition (Nurtured's Sleeves increases — a known number of increase rounds, each gated by a measurement checkbox). `repeat_count` always stores total passes, never "more times" — "repeat rounds 1–4, N more times" is entered as N+1. Repeat groups don't nest in M1.

**Why:** All three shapes are real, used by at least one section of the two test patterns, but were only implicit before. Normalizing "more times" to a total keeps the repeat counter (KNIT-04) simple with no per-step exception. Nesting isn't needed by either pattern.

**Alternatives considered:** Adding 1 to "more times" at display time instead of at entry (rejected — normalization belongs at entry, not in UI logic).

---

## 2026-09-20 — Password sign-in; RLS pattern confirmed

**Decision:** Sign-in uses Supabase Auth's email + password (`signInWithPassword`), not magic link or email-OTP. The standard `user_id` + RLS pattern (owner-only policies, `user_id default auth.uid()`) was proven with a throwaway table (created and dropped in M0.4's migrations) and recorded in `docs/ARCHITECTURE.md` for M1.2 to copy.

**Why:** Password sign-in needs no redirect URL or deep-link handling, so nothing has to change when M7 wraps the app in Capacitor. Magic links would need a custom URL scheme registered for that; single-user with a password manager makes the password itself a non-issue.

**Alternatives considered:** Magic link (convenient on web, but needs Capacitor deep-link setup later). Email OTP code (no password, but adds an email-checking step to every sign-in with no offsetting benefit for a single user).

---

## 2026-09-19 — Supabase CLI workflow confirmed

**Decision:** Schema changes go through the Supabase CLI: `npx supabase migration new <name>` to create a migration file in `supabase/migrations`, `npx supabase db push` to apply it to the linked project. No manual schema edits in the dashboard. CLI is a dev dependency (not global), run via `npx`.

**Why:** Matches the no-Homebrew constraint, keeps the CLI version pinned per-project via `package.json`/lockfile, and gives every schema change a reviewable file in git.

---

## 2026-09-19 — Tailwind v4 for theme tokens

**Decision:** Use Tailwind v4 (`@tailwindcss/vite`, CSS-native `@theme`) instead of v3 + PostCSS/autoprefixer.

**Why:** Theme tokens are plain CSS variables in `src/styles/theme.css`; Tailwind v4's `@theme inline` maps utility names straight to those variables with no `tailwind.config.js` needed. That file is exactly what M6's Figma pipeline is meant to swap out.

**Alternatives considered:** Tailwind v3. Would work too, but adds a JS config file and a PostCSS step for no benefit here.

---

## 2026-09-19 — True fresh start

**Decision:** Archive the old repo (`yarnchive-archive`), start a new repo and a new Supabase project, and keep Vercel and the domains. The May 2026 start isn't resumed.

**Why:** After a long pause, the state of the old repo and database was unclear. Planning for the end state from a clean slate is faster than reconstructing where things stopped. Earlier design decisions carry forward through `DATA-MODEL.md`, not through old files.

**Alternatives considered:** Resuming the May repo. Rejected because nobody could say what was in it.

---

## 2026-09-19 — Doc set built for re-entry

**Decision:** Split planning into `NOW.md` (read first, updated every session), `PRODUCT.md`, `ROADMAP.md`, `ARCHITECTURE.md`, `DATA-MODEL.md`, and this log. `docs/first-task.md` is retired.

**Why:** The hard part of this project has been restarting after breaks. One file that always names the next task removes that cost.

---

## 2026-09-19 — Test patterns: Nurtured and I'm So Basic Sock

**Decision:** M1 is validated against the two patterns currently on the needles. The sweater is imported first, the socks second.

**Why:** Tolsta is finished. The two patterns stress the schema in different ways (sizes, shaping, stitch patterns, short rows vs. heel construction, color changes). The sweater will be on the needles longer.

---

## 2026-09-19 — CSV import for M1 pattern entry

**Decision:** Patterns are entered by filling in a CSV template and loading it with a local script. Supersedes hand-entering through the Supabase interface.

**Why:** New patterns need to get into the app regularly now. A template plus script is fast enough to keep knitting while the parser waits, and it isn't a data-entry UI.

**Alternatives considered:** Parser first (too big to wait for), hand entry (too slow for two patterns and counting).

---

## 2026-09-19 — Patterns are user-owned; no shared library for now

**Decision:** Every pattern belongs to a user and uses a UUID, with a readable slug as an extra field. Supersedes the earlier plan of a shared library with slugs as IDs.

**Why:** Paid patterns can't be redistributed, so each user's uploads stay private. Personal versions also belong to a user.

**Alternatives considered:** Shared library. Deferred to Someday, limited to free patterns and original designs.

---

## 2026-09-19 — End-state foundations from day one

**Decision:** Build in `user_id` + RLS on every user-owned table, theme tokens as CSS variables, a single module for progress writes, and phone-first responsive layouts, from the first screen.

**Why:** Each is cheap now and expensive to retrofit. They're listed as explicit exceptions to the "no flexibility for cases that don't exist yet" rule in `CLAUDE.md`.

---

## 2026-09-19 — Web first, Capacitor later

**Decision:** Build a responsive web app; package it with Capacitor for the app stores in M7.

**Why:** No rewrite needed to reach the app stores, and nothing about the planned features requires native code.

---

## 2026-09-19 — Offline knitting screen in M2

**Decision:** Offline support covers the knitting screen only and ships in M2. M1 saves progress directly to Supabase, but through one module.

**Why:** Offline isn't needed to prove the schema and screen work. Scoping it to the knitting screen covers the real need (not losing your place) without making the whole app work offline.

---

## 2026-09-19 — Personal pattern versions

**Decision:** Changing a pattern creates a personal version linked to the original. Each project uses either the original or a version.

**Alternatives considered:** Editing the original in place (loses the original and breaks past projects' step history); per-project edits only (doesn't carry changes to the next time you knit it).

---

## 2026-09-19 — Stitch dictionary: global with per-pattern overrides

**Decision:** One global dictionary, with overrides per pattern when a designer defines an abbreviation differently. Short text definitions first; richer tutorials later.

---

## 2026-09-19 — Fit: size recommendation, gauge suggests size

**Decision:** Recommend a size from measurements and ease. When your gauge differs from the pattern's, suggest the size that gives the intended finished measurements. Stitch counts are never recalculated.

**Why:** Recalculating a whole pattern for a new gauge is a very large project, because shaping and stitch patterns don't scale evenly.

---

## 2026-09-19 — Time tracking as sessions

**Decision:** The timer records sessions (start, end) while the knitting screen is open, with pause and auto-stop after inactivity trimmed to the last tap. Project totals and "last worked" come from the sessions.

---

## 2026-09-19 — Stash: catalog plus holdings; reserve, then deduct

**Decision:** Yarn is a catalog entry (brand/line, weight, yards and grams per skein, fiber) plus holdings (color, lot, amount). Yarn assigned to a project is marked in use and only removed when the knitter confirms at finish.

---

## 2026-05-24 — Knitting screen before parser

**Decision:** First milestone is a working knitting screen against real Supabase data, not the parser.

**Why:** Designing the knitting screen against a real pattern forces the data model to confront what the UI actually needs. The parser then has a concrete target to parse into.

**Alternatives considered:** Parser-first. Deferred because we'd be designing the parser's output schema in the abstract, and the schema is the expensive thing to get wrong.

---

## 2026-05-24 — Don't port the Tolsta prototype

**Decision:** Leave the hardcoded `tolsta.html` prototype alone. The new knitting screen is designed fresh from the data model up.

**Why:** The prototype's value was proving the interaction model works; that's done. Porting it would anchor the new UI to prototype-era shortcuts.

---

## 2026-05-24 — Stack: React + Vite + Tailwind + Supabase + Vercel

**Decision:** Continuing with the stack established before this rebuild. TypeScript throughout (confirmed 2026-09-19).

**Why:** Already working, no reason to change.

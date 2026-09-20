# Schema v1 (M1)

**Status:** Source of truth for M1 tables — fields, types, relationships, security, and validation. Supersedes the "Entities by milestone" and "Open questions" sections of `docs/DATA-MODEL.md`, which now holds only carried-forward principles and history. Decisions behind this spec are logged in `docs/decisions.md` (entries dated 2026-09-20, M1.1 sessions A and B).

**Out of scope here:** actual SQL/migrations (M1.2), the CSV template and import script's code (M1.3), and any UI. Column tables below are the input to M1.2's migrations, not migrations themselves.

**Test patterns this spec is checked against:** Nurtured (sweater, 9 sizes, bottom-up raglan) and I'm So Basic Sock (4 sizes, magic loop). See `docs/DATA-MODEL.md` for what each stresses.

---

## 1. Conventions

These apply across every table and are enforced by the M1.3 import script, not the database:

- **Stitch tokens:** lowercase abbreviations, commas between all stitches in `stitch_instructions` (e.g. `k2tog, yo, k1`). Resolution order when the knitting screen looks up a token's definition: exact abbreviation match → pipe syntax `[display|id]` → trailing-digit stripping (`k12` looks up `k`). Pattern-specific entries (`pattern_stitch_entries`) are checked before the global `stitch_dictionary`.
- **Title Case** for `section`, `subsection`, and any step `label`/`row_or_round` text.
- **Full prose sentences** in `instructions_before` and `instructions_after` — no fragments.
- **Repeated pieces** (two sleeves, two socks, mirrored fronts) are not a schema feature — they're separate `steps` rows distinguished by `section`/`subsection` text (`"Sleeve 1"` / `"Sleeve 2"`, or `"Sock 1"` / `"Sock 2"`). **AT THE SAME TIME** cross-references are expanded into explicit interleaved steps at entry time, for the same reason: step-by-step tracking can't follow a cross-reference.
- **Sizes are always referenced by `label`** (e.g. `"S"`, `"1"`), never by `pattern_sizes.id` or position. Every JSON structure that varies by size is an object keyed by size label. This is a convention, not a database foreign key — see Validation rules (§6) for how the import script covers that gap.
- **`repeat_count` stores the number of times the knitter works the grouped steps** — not a blanket "total passes" rule. "Repeat rounds 1–4, N more times" becomes `repeat_count = N + 1` only when the pattern's first pass through rounds 1–4 is itself one of the group's own steps; when that first pass is entered as a standalone step before the group starts (see "Ending row alignment" below), `repeat_count` is just `N`, since the group only counts the repeats, not the standalone first pass.
- **Ending row alignment:** when a pattern says a repeat should end on a particular row, order the standalone step(s) before the group and the group's own steps so every full pass through the group lands on that row — even if that means reusing a row's content under a new row number, or repeating a row a standalone step already covered. See the sock's Heel Flap in §7.
- **Measurements are stored as printed**, exactly as the pattern gives them (e.g. `8"/20.5 cm`), as plain text inside prose or `repeat_condition`. No numeric inch/cm split, no canonical unit — deferred to M4.
- **M1 data-entry scope:** the CSV only requires values for your own project's size in any per-size structure; other sizes may be left blank. Filling every size is optional now (validation exercise later, or the parser's job in M3).

## 2. Security model

Every table below is either **owner-only** (standard RLS pattern) or **global-read** (one exception: `stitch_dictionary`).

**Owner-only** tables get the standard pattern from `docs/ARCHITECTURE.md` verbatim: `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`, RLS enabled, four policies (select/insert/update/delete) all checking `auth.uid() = user_id`. This spec doesn't repeat that SQL per table — assume it applies to every table marked **owner-only** below.

Child tables (`pattern_sizes`, `pattern_stitch_entries`, `repeat_groups`, `steps`, `project_progress`) carry their **own** `user_id` column and their own copy of the four policies, rather than checking ownership through a join to their parent (`patterns` or `projects`). It's duplicated data — a step's `user_id` always equals its pattern's — but it keeps every RLS policy the same one-line shape with no joins, which matches the "cheap now, painful to retrofit" reasoning for the pattern in the first place.

**Global-read** (`stitch_dictionary` only): RLS enabled, one `select` policy for any authenticated user (`auth.uid() is not null`), no insert/update/delete policies for the `authenticated` role at all. Rows are seeded and changed only through migrations, which run with elevated privileges that bypass RLS.

**Composite foreign keys.** Every child table's foreign key to its parent is composite — `(parent_id, user_id)` references the parent's `(id, user_id)`, not just `parent_id → id`. Each referenced parent table therefore also carries a `unique (id, user_id)` constraint alongside its primary key, solely to support this. This guarantees at the database level, independent of RLS or app code, that a child row's `user_id` always matches its parent's — a bug or a malformed request can never attach one user's step to another user's pattern. The composite FKs:

- `pattern_sizes.(pattern_id, user_id)` → `patterns(id, user_id)`
- `pattern_stitch_entries.(pattern_id, user_id)` → `patterns(id, user_id)`
- `repeat_groups.(pattern_id, user_id)` → `patterns(id, user_id)`
- `steps.(pattern_id, user_id)` → `patterns(id, user_id)`, and `steps.(repeat_group_id, user_id)` → `repeat_groups(id, user_id)` when `repeat_group_id` is set
- `projects.(pattern_id, user_id)` → `patterns(id, user_id)`
- `project_progress.(project_id, user_id)` → `projects(id, user_id)`, and `project_progress.(current_step_id, user_id)` → `steps(id, user_id)` when `current_step_id` is set

## 3. Tables

Listed in dependency order.

### 3.1 `patterns`

One row per pattern a user has added. Personal versions (M4) will add a `based_on_pattern_id` self-reference later — not needed yet.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | |
| `user_id` | uuid | no | `auth.uid()` | FK → `auth.users(id)`, cascade delete |
| `slug` | text | no | — | readable id, unique per user |
| `name` | text | no | — | |
| `designer` | text | no | — | |
| `is_paid` | boolean | no | `false` | |
| `source_link` | text | yes | — | where you bought/found it |
| `created_at` | timestamptz | no | `now()` | |

**Relationships:** referenced by `pattern_sizes`, `pattern_stitch_entries`, `repeat_groups`, `steps`, `projects` (all via `pattern_id`).
**Unique:** `(user_id, slug)`, plus `(id, user_id)` to support composite FKs from child tables (§2).
**Security:** owner-only.

### 3.2 `pattern_sizes`

Size list only — no measurement-type columns in M1 (`docs/decisions.md`, "Sizes stay generic").

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | |
| `user_id` | uuid | no | `auth.uid()` | |
| `pattern_id` | uuid | no | — | FK → `patterns(id)`, cascade delete; composite with `user_id` — see §2 |
| `label` | text | no | — | e.g. `"S"`, `"1"` — the key used everywhere else |
| `display_order` | integer | no | — | left-to-right/smallest-to-largest position |

**Unique:** `(pattern_id, label)`.
**Security:** owner-only.

### 3.3 `stitch_dictionary`

Global. Covers both stitches and techniques (`docs/decisions.md`, "Dictionary: stitches and techniques").

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | |
| `kind` | text | no | — | `'stitch'` \| `'technique'` |
| `abbreviation` | text | no | — | lowercase, e.g. `k2tog` |
| `name` | text | no | — | Title Case full name, e.g. "Knit Two Together" |
| `definition` | text | no | — | short text definition |
| `link` | text | yes | — | tutorial link, e.g. a technique video |
| `created_at` | timestamptz | no | `now()` | |

**Unique:** `(abbreviation)`.
**Security:** global-read (see §2).

### 3.4 `pattern_stitch_entries`

Per-pattern overrides of a global abbreviation, **and** pattern-only entries with no global counterpart (e.g. a named multi-round stitch pattern). Renamed from `pattern_stitch_overrides` because it now holds both (`docs/decisions.md`).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | |
| `user_id` | uuid | no | `auth.uid()` | |
| `pattern_id` | uuid | no | — | FK → `patterns(id)`, cascade delete; composite with `user_id` — see §2 |
| `kind` | text | no | — | `'stitch'` \| `'technique'` |
| `abbreviation` | text | no | — | the token used in `stitch_instructions`; may be pattern-invented (e.g. `mfsp` for a named stitch pattern) |
| `name` | text | no | — | |
| `definition` | text | no | — | for a named multi-round stitch pattern, covers both in-the-round and flat versions in one definition |
| `link` | text | yes | — | |
| `created_at` | timestamptz | no | `now()` | |

**Unique:** `(pattern_id, abbreviation)`.
**Security:** owner-only.
**Note:** M1 does not track a knitter's position within a named stitch pattern (no `stitch_patterns` entity, no per-project motif round) — see `docs/decisions.md`. Tracked as a Later product idea; see `docs/PRODUCT.md`.

### 3.5 `repeat_groups`

Ties a run of steps together. Always starts with an intro note step (a `steps` row with `repeat_step_number` null, `repeat_group_id` set — see §3.6).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | |
| `user_id` | uuid | no | `auth.uid()` | |
| `pattern_id` | uuid | no | — | FK → `patterns(id)`, cascade delete; composite with `user_id` — see §2 |
| `repeat_count` | jsonb | yes | — | size label → number of passes (integer). Set only on count groups. See §5. |
| `repeat_condition` | text | yes | — | free text, may contain `{PLACEHOLDER}`-style tokens filled from this row's own `size_params` (e.g. `"until sleeve measures {LEN} since the last increase round"`). Set only on condition groups. |
| `size_params` | jsonb | yes | — | placeholder name → size label → value, same shape as `steps.size_params`. Fills placeholders inside `repeat_condition`; only meaningful when `repeat_condition` is set. See §5. |
| `last_repeat_note` | text | yes | — | shown only on the final pass |
| `created_at` | timestamptz | no | `now()` | |

**Constraint (enforced by the import script, not a DB check — see §6):** exactly one of `repeat_count` / `repeat_condition` is set — never both, never neither. The two valid shapes:
- **Count group** (`repeat_count` set, `repeat_condition` null): a known number of passes, which may vary by size (Yoke Shaping) or be the same across sizes (Sleeve increases). When the pattern also has a per-pass "work even until X" condition, that's an ordinary step inside the group carrying its own `steps.size_params` — not a property of the group.
- **Condition group** (`repeat_condition` set, `repeat_count` null): open-ended, no computable count (the sock's Heel Flap). A checkbox is shown at the end of every pass; ticking it ends the repeat rather than starting another pass.

No nesting in M1 (`docs/decisions.md`).
**Unique:** `(id, user_id)`, to support `steps`' composite FK on `repeat_group_id` (§2).
**Security:** owner-only.

### 3.6 `steps`

The core table. One row per instruction, note, or checkpoint.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | |
| `user_id` | uuid | no | `auth.uid()` | |
| `pattern_id` | uuid | no | — | FK → `patterns(id)`, cascade delete; composite with `user_id` — see §2 |
| `step_order` | integer | no | — | global order within the pattern |
| `step_type` | text | no | — | `'instruction'` \| `'note'` \| `'checkpoint'`. `'checkpoint'` always means a stitch-count-or-measurement verify in M1 (KNIT-05) — no separate checkpoint-kind column needed since it's the only kind. |
| `section` | text | no | — | Title Case, e.g. "Sleeves" |
| `subsection` | text | yes | — | Title Case, e.g. "Increases" |
| `row_or_round` | text | yes | — | free text label, e.g. "Round 12" or "Rounds 1–4"; null for steps with no row/round identity |
| `side` | text | yes | — | `'RS'` \| `'WS'`, when relevant |
| `instructions_before` | text | yes | — | prose before the stitch instructions |
| `stitch_instructions` | text | yes | — | tokenized stitch text |
| `instructions_after` | text | yes | — | prose after |
| `size_params` | jsonb | yes | — | placeholder name → size label → value. See §5. |
| `stitch_count` | jsonb | yes | — | only meaningful when `step_type = 'checkpoint'`. Label → size label → value. See §5. |
| `branch_options` | jsonb | yes | — | reserved for KNIT-10 (branching steps); not read by any M1 UI. See §5. |
| `applies_to_sizes` | text[] | yes | — | size labels this row applies to. Null/empty = every size in the pattern. Not JSON — a flat list fits a native array better (see §5). |
| `repeat_group_id` | uuid | yes | — | FK → `repeat_groups(id)`, cascade delete; composite with `user_id` — see §2 |
| `repeat_step_number` | integer | yes | — | 1-based position within the repeat group; null on the group's intro note step and on steps outside any group |
| `link` | text | yes | — | tutorial URL, conventionally set on a section's intro step |
| `errata_note` | text | yes | — | free-text correction to the source pattern, kept traceable rather than silently fixed |
| `created_at` | timestamptz | no | `now()` | |

**Relationships:** `pattern_id` → `patterns`; `repeat_group_id` → `repeat_groups`.
**Unique:** `(id, user_id)`, to support `project_progress`'s composite FK on `current_step_id` (§2).
**Security:** owner-only.

### 3.7 `projects`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | |
| `user_id` | uuid | no | `auth.uid()` | |
| `pattern_id` | uuid | no | — | FK → `patterns(id)`, cascade delete; composite with `user_id` — see §2. Personal versions (M4) will let this point to a version instead — not yet. |
| `size_label` | text | no | — | must match one of `pattern_sizes.label` for this `pattern_id`; checked at creation time, not by a DB FK (labels aren't a real foreign key — same gap as everywhere else sizes are referenced) |
| `created_at` | timestamptz | no | `now()` | |

**Unique:** `(id, user_id)`, to support `project_progress`'s composite FK on `project_id` (§2).
**Security:** owner-only.

### 3.8 `project_progress`

One row per project. Everything the knitting screen needs to resume exactly where you left off, and the single table the "one path for progress writes" module (M1 foundation, M2 offline prep) reads and writes.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | |
| `user_id` | uuid | no | `auth.uid()` | |
| `project_id` | uuid | no | — | FK → `projects(id)`, cascade delete; unique (1:1 with `projects`); composite with `user_id` — see §2 |
| `current_step_id` | uuid | yes | — | FK → `steps(id)`; null means "not started," resume at the pattern's first step; composite with `user_id` — see §2 |
| `repeat_pass_counts` | jsonb | no | `'{}'` | repeat group id → current pass number. See §5. |
| `checkbox_states` | jsonb | no | `'{}'` | repeat group id → whether the current pass's condition checkbox is ticked. See §5. Per-stitch strikethrough state (KNIT-02) is deliberately **not** stored here — it resets when the knitter leaves a step (`docs/decisions.md`). |
| `updated_at` | timestamptz | no | `now()` | |

**Unique:** `(project_id)`.
**Security:** owner-only.

## 4. Relationship summary

```
patterns
 ├─ pattern_sizes        (pattern_id)
 ├─ pattern_stitch_entries (pattern_id)
 ├─ repeat_groups        (pattern_id)
 │   └─ steps            (repeat_group_id, optional)
 ├─ steps                (pattern_id)
 └─ projects             (pattern_id)
      └─ project_progress (project_id, 1:1; current_step_id → steps)

stitch_dictionary        (global, no FKs in)
```

Every parent→child FK shown above is composite, `(parent_id, user_id) → parent(id, user_id)` — see §2.

## 5. JSON field reference

Every size-keyed structure below uses the same shape: an object whose keys are `pattern_sizes.label` values for that pattern. Only your own project's size needs a value in M1 (§1).

### `repeat_groups.repeat_count`

Size label → number of times the knitter works the group's steps. A single value repeated across sizes is valid (Nurtured's sleeve increases, same count for every size) as much as one that varies (Nurtured's Yoke Shaping):

```json
{ "1": 6, "2": 6, "3": 7, "4": 7, "5": 8, "6": 8, "7": 9, "8": 9, "9": 10 }
```

### `repeat_groups.size_params`

Same shape as `steps.size_params` below — placeholder name → size label → value — but scoped to filling placeholders inside this group's own `repeat_condition` text:

```json
{ "LEN": { "S": "6\"/15 cm", "M": "6.5\"/16.5 cm", "L": "7\"/18 cm", "XL": "7.5\"/19 cm" } }
```

### `steps.size_params`

Placeholder name → size label → value. One step can carry more than one placeholder:

```json
{
  "N":  { "S": 4, "M": 6, "L": 8, "XL": 8 },
  "N2": { "S": 2, "M": 2, "L": 3, "XL": 3 }
}
```

### `steps.stitch_count`

Only on checkpoint steps. Label → size label → value, defaulting to a single `"total"` label for a plain count:

```json
{ "total": { "S": 16, "M": 16, "L": 20, "XL": 20 } }
```

A labeled breakdown (Nurtured's join checkpoint) adds one entry per label instead of just `"total"`:

```json
{
  "total":      { "1": 210, "2": 222 },
  "sleeve":     { "1": 54,  "2": 56 },
  "front_back": { "1": 88,  "2": 92 },
  "raglan":     { "1": 8,   "2": 8 }
}
```

### `steps.branch_options`

Reserved for Later (KNIT-10). Shape not finalized — the UI doesn't read it yet — but a plausible placeholder to unblock the column existing:

```json
{
  "options": [
    { "label": "Option A: Short-row heel", "goto_step_id": null },
    { "label": "Option B: Afterthought heel", "goto_step_id": null }
  ]
}
```

### `steps.applies_to_sizes` (not JSON — native array, documented here for contrast)

A flat list of size labels, not a JSON object, since there's no per-size value to attach — just membership:

```
{S,XL}
```

Null or empty means the step applies to every size in the pattern.

### `project_progress.repeat_pass_counts`

Repeat group id → current pass number (1-based, counting only passes through the group's own steps — same convention as `repeat_groups.repeat_count`):

```json
{ "3f2b1c2a-9e3d-4b7a-8f11-2f6a9c1d0e77": 3 }
```

### `project_progress.checkbox_states`

Repeat group id → whether that group's current-pass condition checkbox is ticked:

```json
{ "3f2b1c2a-9e3d-4b7a-8f11-2f6a9c1d0e77": true }
```

## 6. Validation rules for the M1.3 import script

The database has no cross-row constraints for most of these (sizes are labels, not foreign keys) — the import script is where they're actually enforced:

1. Every size label appearing anywhere for a pattern (`steps.applies_to_sizes`, any `size_params`/`stitch_count`/`repeat_count` key) must exist in that pattern's `pattern_sizes.label` set. Unknown labels are a row-level error.
2. At a given `step_order` position, no two step rows may both apply to the same size — each size must resolve to exactly one row at that position, or none if the position is skipped for that size (`docs/decisions.md`, size-specific steps).
3. `repeat_groups` has exactly one of `repeat_count` / `repeat_condition` set — never both, never neither.
4. `repeat_count` is the number of times the knitter works the group's steps. The script normalizes "repeat rows 1–4, N more times" phrasing to `N + 1` only when rows 1–4's first pass is entered as part of the group; when that first pass is a standalone step before the group, the count is entered as `N`. This is a data-entry convention the script enforces, not something recoverable from the number alone.
5. A step with `repeat_group_id` set must have `repeat_step_number` set, except a group's one intro note step, which has `repeat_group_id` set and `repeat_step_number` null. A step with neither `repeat_group_id` must have `repeat_step_number` null too.
6. `steps.stitch_count` is only accepted when `step_type = 'checkpoint'`; flagged as an error on any other step type.
7. Within one `stitch_count` value, every label's inner object must use the same set of size labels (no label silently missing a size the others have).
8. `pattern_stitch_entries.abbreviation` is unique per pattern; the script warns (doesn't error) if an abbreviation shadows a `stitch_dictionary` entry of a different `kind`.
9. `section`/`subsection`/`row_or_round` are normalized to Title Case; `stitch_instructions` tokens are normalized to lowercase, comma-separated. The script fixes mechanical case issues rather than rejecting them, and only errors when a token can't be resolved at all (§1 resolution order).
10. `projects.size_label` must match a `pattern_sizes.label` for the chosen pattern — checked at project-creation time in the app, using the same label-matching approach as the import script, since this is the same kind of soft reference.
11. Every `repeat_groups` row has exactly one `steps` row pointing to it with `repeat_step_number` null (its intro note step) — not zero, not more than one.

## 7. Worked examples

Placeholder wording throughout — none of this is copied from either pattern's actual instructions.

### Nurtured (sweater)

**Sleeve increases** — a count group whose count varies by size, with a per-pass "work even" step inside it:
- `steps` (standalone, outside any group): `step_type = 'instruction'`, `section = "Sleeves"`, `subsection = "Increases"`, `row_or_round = "Round 1"`, `stitch_instructions = "[placeholder tokens], m1r, [placeholder tokens], m1l, [placeholder tokens]"`, `size_params = {"N": {"1": 60, ..., "9": 84}}` filling the pre-increase stitch count — this is the pattern's first increase round, worked once before any repeating starts.
- `repeat_groups`: `repeat_count = {"1": 6, "2": 6, "3": 7, "4": 7, "5": 8, "6": 8, "7": 9, "8": 9, "9": 9}` — how many *more* times the increase round repeats, and it isn't the same for every size. `repeat_condition = null`, `size_params = null` (this is a count group; the condition and its size-varying length live on a step inside it instead).
- `steps` (intro note): `step_type = 'note'`, `repeat_group_id` set, `repeat_step_number = null`, `instructions_before = "[Placeholder] Set up for sleeve increases."`
- `steps` (in-group, repeat_step_number = 1): `step_type = 'instruction'`, `instructions_before = "[Placeholder] Work even until sleeve measures {LEN} since the last increase round."`, `size_params = {"LEN": {"1": "6\"/15 cm", ..., "9": "8\"/20.5 cm"}}` — the "work even until X" condition, entered as an ordinary step with its own size-varying measurement text, not as the group's `repeat_condition`.
- `steps` (in-group, repeat_step_number = 2): `row_or_round = "Round 2"`, `stitch_instructions = "[placeholder tokens], m1r, [placeholder tokens], m1l, [placeholder tokens]"` — the same increase round content as the standalone Round 1 step, repeated.

**Yoke shaping** — a count group where the count itself varies by size, no per-pass condition step:
- `repeat_groups`: `repeat_count = {"1": 6, "2": 6, "3": 7, ..., "9": 10}`, `repeat_condition = null`, `size_params = null` (nothing to fill — there's no condition text here).
- `steps` (in-group instruction): `repeat_step_number = 1`, `stitch_instructions = "[placeholder tokens], ssk, [placeholder tokens], k2tog, [placeholder tokens]"` (a raglan decrease round), no `applies_to_sizes` needed since the round's wording doesn't change by size — only how many times it repeats does, which lives on the group.

**The join checkpoint** — a labeled stitch-count breakdown:
- `steps`: `step_type = 'checkpoint'`, `section = "Yoke"`, `subsection = "Join Sleeves and Body"`, `instructions_before = "[Placeholder] Join all pieces and check your stitch count before continuing."`, `stitch_count` as shown in §5 (`total`, `sleeve`, `front_back`, `raglan`).

**A short row** — mid-motif row-switch handling:
- `steps`: `step_type = 'instruction'`, `section = "Yoke"`, `subsection = "Short Rows"`, `row_or_round = "Row 3"`, `side = "RS"`, `instructions_before = "[Placeholder] Work in the established stitch pattern to the marker."`, `stitch_instructions = "[placeholder tokens], w&t"`, `instructions_after = "[Placeholder] Turn."` — the stitch pattern's own round-tracking is left to the knitter per the dictionary decision (§3.4); this row doesn't need a motif-position field, just the ordinary instruction fields.

### I'm So Basic Sock

**Leg setup round** — size-specific step rows, including a size that knits the round with no shaping (still its own row, not a skipped position):
- Three `steps` rows covering all four sizes at one `step_order` position, `section = "Leg"`, `subsection = "Setup"`:
  - `applies_to_sizes = {S,XL}`, `instructions_before = "[Placeholder] Decrease evenly around."`
  - `applies_to_sizes = {M}`, `instructions_before = "[Placeholder] Increase evenly around."`
  - `applies_to_sizes = {L}`, `instructions_before = "[Placeholder] Knit one round even."` — L has no shaping here, but still gets a row; nothing about this position is skipped for any size.

**Heel flap** — a condition group, with ending row alignment so every pass finishes on the row the pattern names:
- `steps` (standalone, outside any group): `row_or_round = "Row 1"`, `side = "RS"`, `stitch_instructions = "sl1, k1"` repeated across the row.
- `steps` (standalone, outside any group): `row_or_round = "Row 2"`, `side = "WS"`, `stitch_instructions = "sl1, p1"` repeated across the row.
- `repeat_groups`: `repeat_count = null`, `repeat_condition = "[Placeholder] Continue working the heel flap pattern until the flap measures {LEN} for your size, ending after a WS row."`, `size_params = {"LEN": {"S": "1.75\"/4.5 cm", "M": "2\"/5 cm", "L": "2.25\"/5.5 cm", "XL": "2.5\"/6.5 cm"}}`.
- `steps` (intro note): `repeat_group_id` set, `repeat_step_number = null`.
- `steps` (in-group, repeat_step_number = 1): `row_or_round = "Row 3"`, `side = "RS"`, `stitch_instructions = "sl1, k1"` — same content as the standalone Row 1, relabeled as the pattern's own "repeat rows 2 and 3" phrasing continues the row count.
- `steps` (in-group, repeat_step_number = 2): `row_or_round = "Row 2"`, `side = "WS"`, `stitch_instructions = "sl1, p1"` — same content as the standalone Row 2, reused so every pass through the group ends on a WS row, matching the condition's "ending after a WS row."

**Heel turn** — a "continue until" sequence expanded into explicit rows at entry time, per size, since the row count is computable (no `repeat_groups` row at all — this isn't a repeat, it's fully expanded steps):
- `steps`: one row per short-row, e.g. `row_or_round = "Row 1"`, `applies_to_sizes = null` (wording same for all sizes) or set per size where the row count differs, `stitch_instructions = "[placeholder tokens], ssk, k1, turn"`, continuing for as many explicit rows as each size's turn requires — S might end at "Row 9", XL at "Row 13". Each size's final row is just its last `steps` row tagged with that size in `applies_to_sizes`; there's no group and nothing to mark as a last pass, since a fully expanded sequence has no repeat to finish.

**A color change** — a plain note step, no `yarn_label` column (deferred, §1 of `docs/decisions.md`):
- `steps`: `step_type = 'note'`, `section = "Gusset"`, `instructions_before = "[Placeholder] Switch to contrast color yarn."`

**Toe errata** — a correction traceable on the step itself:
- `steps`: `step_type = 'instruction'`, `section = "Toe"`, `subsection = "Decreases"`, `row_or_round = "Row 2"`, `stitch_instructions = "[placeholder decrease round tokens]"`, `errata_note = "[Placeholder] Source pattern repeats 'rows 2 and 3' but never defines a Row 3; entered as repeating Row 2 only."`

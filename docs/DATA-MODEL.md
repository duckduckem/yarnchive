# Yarnchive — Data Model

**Last updated:** 2026-09-20

**Status:** Table definitions now live in `specs/schema-v1.md` — that's the source of truth for M1 fields, types, relationships, and security. This file keeps only the carried-forward principles below, plus the test-pattern reference table.

The earlier schema spec (May 2026) wasn't recovered. Decisions below are carried forward from earlier design sessions; some field names differ from the M1 spec, which renamed a few (e.g. `pattern_stitch_overrides` → `pattern_stitch_entries`, `order` → `step_order`).

---

## Carried-forward decisions

### Steps

- **Step types:** `instruction`, `note`, `checkpoint`. The only checkpoint type is `verify` (a stitch-count or measurement check). Decision points are handled by condition-based repeats, not checkpoints.
- **Three-part instruction text:** `instructions_before` (prose), `stitch_instructions` (stitch tokens), `instructions_after` (prose).
- **Ordering:** an `order` integer per step within a pattern.
- **Sizes:** `size_params` (JSON) holds per-size values that fill `{N}`-style placeholders in the text. The size is chosen when a project is created.
- **Stitch counts:** `stitch_count` (JSON, per size) is for verification only and is separate from `size_params`.
- **Branching:** `branch_options` (JSON) exists in the schema for steps where the knitter chooses a path. Not used in the UI yet.

### Repeats

- Repeat groups tie a range of steps together.
- Every repeat group starts with an intro note step.
- Fields: `repeat_group_id`, `repeat_step_number` (position within the group), `repeat_count`, `repeat_condition`, `last_repeat_note`.
- Condition-based repeats ("until piece measures…") show an always-present checkbox the knitter ticks when ready. No automatic detection.
- `last_repeat_note` shows only on the final pass.

### Structure

- **AT THE SAME TIME** instructions are expanded into explicit interleaved rows. Cross-references don't work in step-by-step tracking.
- **Repeated pieces** (two sleeves, two socks, fronts that mirror the back) are duplicated as separate steps, labeled by section or subsection.

### Normalization rules

- Stitch abbreviations lowercase, commas between all stitches.
- Title Case for section, subsection, and step label.
- Full prose sentences in `instructions_before` and `instructions_after`.

### Stitch tokens

- Resolution order: exact abbreviation match, then pipe syntax `[display|id]`, then trailing-digit stripping (`[k12]` looks up `k`).

### Ownership and IDs

- Every pattern belongs to a user and has a UUID, plus a readable `slug` field. There is no shared library for now.
- Every user-owned table has `user_id` and RLS from day one.
- **Stitch dictionary:** global entries, plus per-pattern overrides when a designer defines an abbreviation differently.

---

## Entities by milestone (conceptual)

M1's tables and their fields are specified in full in `specs/schema-v1.md`. This row stays only as a milestone-level pointer:

| Milestone | Entities |
|---|---|
| M1 | see `specs/schema-v1.md` |
| M2 | pattern files, photos, project status/dates/notes, timer sessions |
| M4 | pattern yarn/needle/notion requirements, gauge, finished measurements per size, pattern versions, people, measurements |
| M5 | yarn catalog, yarn holdings, needle holdings, notion holdings, project yarn assignments |

---

## Open questions for the M1 spec

All 14 questions this section used to list were resolved in M1.1 (session A: 2026-09-20, recorded in `docs/decisions.md`; session B: `specs/schema-v1.md` turned those resolutions into fields, types, and worked examples against both test patterns). Nothing open right now — new questions belong in `NOW.md` when they come up.

---

## M1 data-entry scope (proposed)

To keep CSV entry manageable while you're mid-knit:

- The schema supports all sizes.
- For M1, fill in only **your size's** values in the size columns, and leave the others blank. Filling in all sizes is a good validation exercise later, or a job for the parser.
- The socks are entered as two full step sets (Sock 1, Sock 2).

## Test patterns

| Pattern | Designer | What it tests |
|---|---|---|
| Nurtured (sweater) | Andrea Mowry (drea renee knits), paid | 9 sizes, bottom-up raglan, pieces joined partway, size-variable repeats, a 4-round stitch pattern worked both in the round and flat, short rows with wraps, measurement-based repeats, stitch count breakdowns |
| I'm So Basic Sock | Summer Lee Design Co., paid | 4 sizes by foot circumference, magic loop, two colors switching by section, heel flap / heel turn / gusset, size-specific text, a pattern error, two identical pieces |
| Tolsta Tee | Creabea Designs | Previous reference pattern (finished). Useful as extra validation data later. |
| Ammi | Berroco | Parser validation target from earlier work (9-size colorwork). |

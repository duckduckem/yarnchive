# Yarnchive — Data Model

**Last updated:** 2026-09-19

**Status:** This is the *input* to the M1 schema spec (`specs/schema-v1.md`). Once that spec is approved, the spec is the source of truth for tables and fields, and this file keeps only principles and the running list of open questions.

The earlier schema spec (May 2026) wasn't recovered. Decisions below are carried forward from earlier design sessions; field names are from those sessions and can be renamed in the M1 spec.

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

| Milestone | Entities |
|---|---|
| M1 | patterns, pattern sizes (list only), steps, repeat groups, stitch dictionary, pattern stitch overrides, projects, project progress |
| M2 | pattern files, photos, project status/dates/notes, timer sessions |
| M4 | pattern yarn/needle/notion requirements, gauge, finished measurements per size, pattern versions, people, measurements |
| M5 | yarn catalog, yarn holdings, needle holdings, notion holdings, project yarn assignments |

---

## Open questions for the M1 spec

These came from reading the two test patterns. The M1 spec must answer each one, even if the answer is "not yet."

1. **Size-specific text, not just numbers.** The sock leg setup round is a different instruction per size, and one size has no change at all. Options: substitute whole phrases through `size_params`, or let a step apply only to certain sizes. (This is the "hybrid size-variant" approach that was previously deferred; it's needed now.)
2. **Size-variable repeat counts.** The sweater yoke repeats a different number of times per size, so `repeat_count` has to vary by size.
3. **Count-based repeat containing a measurement condition.** Sleeve increases happen every so many inches, a set number of times. Probably fits the current model (a counted repeat group that includes a condition checkbox step), but confirm.
4. **Stitch count breakdowns.** After joining the sweater's body and sleeves, the check is a total plus counts per sleeve, per front/back, and raglan stitches. Decide whether `stitch_count` holds one number per size or a labeled breakdown.
5. **Named multi-row stitch patterns.** The sweater's main stitch is a 4-round pattern with separate in-the-round and flat versions. The knitter needs to know which round of the motif they're on, including during short rows, where the row switches between the knit row and the slip row partway across. Decide whether stitch patterns are their own entity and how the screen tracks position within them.
6. **Deterministic "continue until" sequences.** The sock heel turn gives the first few rows, then says to continue the established pattern until all heel stitches are worked. The number of rows is computable per size. Proposed rule: expand into explicit rows at entry time when the count is computable, the same way AT THE SAME TIME is handled; use a condition checkbox only when it truly depends on the knitting.
7. **Active yarn per step.** The socks switch between a main color and a contrast color by section. Decide whether steps carry a yarn label.
8. **Techniques in the dictionary.** Both patterns rely on techniques (a specific cast-on, wrap and turn, resolving wraps, picking up stitches, Kitchener stitch), not just stitches. Dictionary entries likely need a kind (stitch or technique) and an optional link.
9. **Tutorial links at the section level.** The sock pattern links a video per section. Decide whether sections or steps can carry links.
10. **Units.** Measurements are given in both inches and centimeters. Store both as given, or one canonical unit with a display preference.
11. **Values recorded mid-pattern.** The sweater asks you to note which round of the stitch pattern the first sleeve ended on, to match later pieces. M1 answer can be a note step; later this might become a step that records a value.
12. **Pattern errors.** The sock toe section tells you to repeat rows that don't match the rows it defines. Normalized data fixes this at entry; decide whether to record an errata note on the step. Personal versions (M4) handle corrections formally.
13. **Pattern-type-specific sizing.** The sweater is sized by bust, the socks by foot circumference. Relevant for M4, but the M1 size list should not assume bust.
14. **Yarn quantity by size.** The sweater's yarn amount varies by size; the socks' doesn't. Relevant for M4.

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

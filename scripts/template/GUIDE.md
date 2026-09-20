# Filling in a pattern template

Five files, one workbook tab each. Put your own pattern's copies together in one
folder (e.g. `patterns-private/nurtured/`) — that folder is what you point the
import script at.

A fully filled-in example exercising every tricky case below lives in
[`../test/fixture/`](../test/fixture/) — a tiny made-up two-size pattern called
"Test Swatch." Open those five files side by side with this guide. Nothing in
it is real pattern content; it's a fixture for the import script's own tests.

Background: `specs/schema-v1.md` is the source of truth for what every column
means and how the app will use it. This guide only covers *how to type it into
a spreadsheet* — read the spec first if something here doesn't make sense.

## The files

1. **`pattern.csv`** — one header row, one data row. Your pattern's own
   `slug` (a short readable id, e.g. `nurtured`), `name`, `designer`,
   `is_paid` (`TRUE`/`FALSE`), and `source_link` (optional).

2. **`sizes.csv`** — one row per size your pattern offers, in the order you
   want them to display (`display_order`). `label` is exactly the text you'll
   use everywhere else to mean this size — `"S"`, `"1"`, whatever the pattern
   itself calls it.

3. **`stitch_entries.csv`** — optional. One row per stitch or technique that's
   specific to this pattern: either an override of a global abbreviation
   (spelled differently by this designer) or one this pattern invents (a named
   stitch pattern with no global equivalent). Leave it empty if the pattern
   only uses the shared dictionary as-is.

4. **`repeat_groups.csv`** — optional. One row per repeat. See "Repeats" below
   — this is the file where the per-size dynamic columns start to matter.

5. **`steps.csv`** — one row per instruction, note, or checkpoint, in reading
   order. This is almost all of the work.

## No JSON, no UUIDs

Two things the schema stores as JSON keyed by size, and one relationship
that's a real database id, both become plain, readable columns or text here:

- **A repeat group is referenced by a `group_key` you make up** (e.g.
  `sleeve_increases`), not a database id. Put that same text in
  `repeat_group_key` on every `steps.csv` row that belongs to the group. The
  import script generates the real ids and wires everything together.
- **Anything that varies by size becomes one column per size**, named
  `<prefix>_<SIZE>` — or `<prefix>_<SUBKEY>_<SIZE>` when there's a sub-key too
  (a placeholder name, or a stitch-count label). You add these columns
  yourself once you know your pattern's sizes; the blank templates only ship
  the fixed columns.

**Naming rule:** size labels, placeholder names, and stitch-count labels must
not contain underscores — the import script splits column names on `_` to
recover them.

The dynamic column prefixes:

| Prefix | Where | Fills |
|---|---|---|
| `repeat_count_<SIZE>` | `repeat_groups.csv` | how many times a *count* repeat runs, per size |
| `param_<PLACEHOLDER>_<SIZE>` | `repeat_groups.csv` or `steps.csv` | a `{PLACEHOLDER}` token inside that same row's own text, per size |
| `count_<LABEL>_<SIZE>` | `steps.csv` (checkpoints only) | a stitch count, per size — use the label `total` unless you're giving a breakdown |

## Sizes you don't need yet

Per the spec, you only have to fill in values for **your own project's
size**. Leave every other size's cells blank in any per-size column — that's
expected, not an error, at this stage.

## Repeats

A repeat group is either a **count** (a known number of passes) or a
**condition** (open-ended, "until it measures X") — never both, never
neither:

- **Count group:** fill `repeat_count_<SIZE>` for each size, leave
  `repeat_condition` blank. See `sleeve_inc` in the fixture's
  `repeat_groups.csv` — the count itself differs by size (`2` for S, `3` for
  M).
- **Condition group:** fill `repeat_condition` (with `{PLACEHOLDER}` text if
  it varies by size) and the matching `param_<PLACEHOLDER>_<SIZE>` columns,
  leave `repeat_count_*` blank. See `flap` in the fixture, with `{LEN}`.

Every group needs, in `steps.csv`:
- exactly one **intro note** row: `step_type = note`, `repeat_group_key` set
  to the group's key, `repeat_step_number` left **blank**.
- one or more **in-group rows** after it: same `repeat_group_key`,
  `repeat_step_number` set to `1`, `2`, ... in order.

A step with neither `repeat_group_key` nor `repeat_step_number` is a
standalone step outside any group — most rows are this.

**`repeat_count` counts only the repeats, not a first pass entered as its own
standalone step.** If the pattern says "repeat rows 1–4, 3 times more," and
row 1–4's very first pass is itself the group's first in-group step, enter
`repeat_count = 4`. If instead you entered that first pass as a standalone
step *before* the group (as the fixture does for `sleeve_inc` — the standalone
Round 1 at `step_order = 3`), enter `repeat_count = 3`. The import script
can't detect which convention you meant from the number alone — get this
right when you type it in. (Spec §6, rule 4.)

**Ending row alignment:** when a pattern wants every pass of a repeat to land
on a specific row, it's fine — expected, even — to repeat a row's content
under a new row number, or to reuse the same row number twice, so that the
math works out. See the fixture's `flap` group: the standalone Row 1/Row 2
come first, then the group's own two rows are labeled "Row 3" and "Row 2"
again, so every full pass ends on a WS row as the pattern requires.

## Same position, different sizes

When a step's wording genuinely differs by size — including a size that has
*no* shaping where others do — give each size its own row, all sharing the
same `step_order`, each with `applies_to_sizes` set to just that size (or a
comma-separated list like `S,XL` if several sizes share the same wording).
Every size must resolve to exactly one row at a given `step_order`, or the
position must not exist for that size at all — never two rows claiming the
same size at the same position. See `step_order = 2` in the fixture's
`steps.csv`: one row for S, a different one for M.

Leave `applies_to_sizes` blank when a row's wording is identical for every
size in the pattern — that's most rows.

## Checkpoints

`step_type = checkpoint` is the only step type that accepts `count_*`
columns. A plain count uses the label `total` (`count_total_S`,
`count_total_M`, ...). A labeled breakdown (e.g. total plus a count for each
piece being joined) adds one label per breakdown, and **every label needs
values for the same set of sizes** — don't fill `count_total_S` and
`count_total_M` but only `count_partA_S`. See `step_order = 12` in the
fixture.

## Stitch tokens

`stitch_instructions` is a comma-separated list of lowercase tokens (the
import script lowercases and normalizes spacing for you — you don't have to
get the casing perfect). Each token resolves in this order:

1. An exact match against this pattern's own `stitch_entries.csv`.
2. An exact match against the shared stitch dictionary.
3. Pipe syntax `[shown as|actual-id]` — write whatever text you want the
   knitter to see, then the real abbreviation to look up after the `|`. See
   `[dec evenly|k2tog]` in the fixture (`step_order = 2`, size S).
4. Trailing digits stripped and retried — `k12` resolves as `k`. See the
   fixture's `k12` and `k1` tokens.

If none of those match, the import script reports it as an error with the
file and row number. Add a `stitch_entries.csv` row if it's genuinely
pattern-specific.

## Errata

If the source pattern has a mistake or an ambiguity, don't silently "fix" it
— enter the step as you're actually knitting it, and explain the discrepancy
in `errata_note`. See `step_order = 14` in the fixture.

## Sections, subsections, row/round labels

Write these in whatever case is natural; the import script normalizes them to
Title Case. `instructions_before` / `instructions_after` should be full
sentences, not fragments.

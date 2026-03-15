# Yarnchive — Pattern Data Normalization Rules

These rules govern how raw knitting pattern text is translated into the Yarnchive data model. The goal is consistency across all patterns regardless of how the original source was written. A knitter using the app should never need to think about where a pattern came from — everything should feel the same.

This document is a living reference. Add new rules as new edge cases are discovered during pattern entry.

---

## General Principles

- The app normalizes patterns so users don't have to think about source conventions
- When in doubt, optimize for clarity to the knitter using the app, not fidelity to the source pattern
- Unnecessary phrases, redundant qualifiers, and filler language should be removed
- Write for the knitter who is actively working, not for someone reading a pattern book

---

## Field-by-Field Rules

### `section` and `subsection`
- Always Title Case
- `section` is the top-level grouping — e.g. "Yoke", "Body", "Sleeves", "Finishing"
- `subsection` is optional finer grouping — e.g. "Neckband", "Bust Shaping", "Raglan Increases", "Vertical Darts", "Bottom Ribbing"
- Use subsections when a section has meaningfully distinct phases that a knitter would want to navigate to
- Sections and subsections are used for progress display and future navigation features — keep them meaningful

### `step_label`
- Always Title Case
- Stores whatever the source pattern calls the step — "Round 1", "Row 3", "Short Row 2", "Next Round"
- This is reference data only — the app navigates by step number, not by step_label
- Leave null if the source pattern does not name the step

### `step_type`
- `instruction` — something the knitter does and completes. Shown with a completion control.
- `note` — context or information the knitter should know. No completion action.
- `checkpoint` — a moment where the knitter should pause, verify something (stitch counts, measurements, fit), and explicitly confirm before continuing. Use for: stitch count verification, fit checks, and mid-pattern decision points.

### `side`
- `RS` — right side (public-facing side of the fabric)
- `WS` — wrong side
- `null` — for in-the-round patterns where RS/WS does not apply, or for construction steps where it is not relevant

### `instructions_before`
- Prose only — no stitch abbreviations, no bracket markup
- Full sentences with correct punctuation
- Used for context that must appear before the stitch instructions — e.g. "Change to your larger needles." or "Place the held stitches back on your needle."
- Spell out "stitches" in full — do not use "sts" here

### `stitch_instructions`
- Contains stitch abbreviations with `[bracket]` markup
- All stitch abbreviations are lowercase — `[k]`, `[p]`, `[sm]`, never `[K]` or `[SM]`
- All stitches are abbreviations, not words — `[k]` not `[knit]`, `[p]` not `[purl]`
- Use `[sts]` for the abbreviation "stitches" within stitch instructions — full word used in prose fields only
- Commas between all stitches — `[k1], [p1]` not `[k1] [p1]`
- In-row repeats begin with `*` followed by a space, then the stitches — `* [k1], [p1]`
- Use `|` as a line break separator to group long sequences into logical sets of 3–6 stitches per line
- Numbers within stitch instructions are rendered in accent color by the app automatically
- Spell out ordinals — "first", "second", "third" — not "1st", "2nd", "3rd"
- Avoid unnecessary parentheses, brackets, single quotes, and double quotes unless they add essential meaning
  - Exception: parenthetical alternatives that are time-critical for the knitter — e.g. "(or your cast-on of choice)" immediately before performing the cast-on

### `instructions_after`
- Prose only — no stitch abbreviations, no bracket markup
- Full sentences with correct punctuation
- Used for qualifiers, stitch counts, and measurement targets that follow the stitches
- Spell out "stitches" in full — do not use "sts" here
- Stitch increase/decrease counts use this format: "X stitches increased." or "X stitches decreased." — always at the end of the field
- Measurements use abbreviated units separated by " / " — e.g. "2 cm / 0.75 in" not "2 centimeters or 0.75 inches"

### `repeat_total`
- Integer — the number of times the step or group repeats in total (including the first pass)
- Null for measurement-based repeats where the knitter decides when to stop

### `repeat_condition`
- Plain prose describing when to stop repeating — e.g. "or until ribbing measures 2 cm / 0.75 in"
- Used alongside or instead of `repeat_total` for measurement-based repeats
- Start with lowercase — this field continues from an implied "repeat until..."

### `repeat_group_id`
- Format: `repeat_` followed by an incrementing integer — e.g. `repeat_1`, `repeat_2`, `repeat_3`
- Must be unique within the pattern (not just within a section)
- All steps within the same repeat block share the same `repeat_group_id`

---

## Stitch Bracket Markup

### Basic usage
Every stitch abbreviation that has an entry in `stitch_def` is wrapped in brackets:
`[k1], [p1]; repeat to end`

### Numbered stitches
The number is included inside the bracket with no space:
`[k12]`, `[p3]`, `[k2tog]`

The app strips trailing digits to find the base stitch definition, so `[k12]` resolves to the `k` stitch def.

Note: abbreviations where digits are part of the name (e.g. `k2tog`, `m1l`) are matched exactly first.

### Pipe syntax for display overrides
When the display text differs from the stitch_def ID, use pipe syntax:
`[display text|stitch_def_id]`

Examples:
- `[Join in the round|join]` — displays "Join in the round", links to stitch def with id `join`
- `[Weave in ends|weave-in-ends]` — displays "Weave in ends", links to stitch def with id `weave-in-ends`
- `[long-tail cast-on|long-tail-cast-on]` — display matches closely but ID uses hyphens throughout

Use pipe syntax whenever the bracket text would not resolve cleanly by exact match or digit stripping.

### What gets bracketed
- All stitch abbreviations — `[k]`, `[p]`, `[sm]`, `[pm]`, `[rm]`
- All technique names that have stitch_def entries — `[GSR]`, `[BOR]`, `[stockinette]`
- Cast-on methods — `[long-tail cast-on|long-tail-cast-on]`
- Finishing techniques — `[bo]`, `[block]`, `[Weave in ends|weave-in-ends]`
- `[sts]` when used as an abbreviation within stitch_instructions

### What does NOT get bracketed
- Plain prose text in stitch_instructions (the words between stitches)
- Numbers standing alone — numbers are highlighted automatically by the app
- "stitches" spelled out in full — only used in prose fields where bracketing does not apply

---

## Notes

### When to use a note vs. instructions_before/after
- `instructions_before` / `instructions_after` — context attached to a specific step, appears immediately before or after the stitches for that step
- A `note` step — standalone information that is not attached to a specific instruction. Used for section transitions, explanations of upcoming technique, or important context the knitter needs before a new phase begins.

### Removing filler phrases
Remove these phrases when they appear at the end of notes or instructions:
- "as follows" — just say what follows
- "as set" — describe what is set
- "in pattern" — describe the pattern
- "continue as established" — restate what to continue

### Stitch counts in checkpoints
Use checkpoints to surface stitch counts the pattern provides as verification points. Format:
"You will now have X stitches: [breakdown]."
Example: "You will now have 136 stitches: 4 raglan stitches, 20 sleeve stitches, and 46 front/back stitches."

### Handling size-specific instructions
When entering a specific size, extract only the relevant number from size brackets in the source pattern. Document which size was entered in the `size_id` field. Do not include the full bracketed size list from the source pattern.

---

## Future Automation Notes

This section captures normalization decisions that will inform future automated pattern parsing. Each entry is a rule that a parser would need to apply.

- Stitch abbreviations are always lowercase in stitch_instructions
- "knit" → `[k]`, "purl" → `[p]`, "slip marker" → `[sm]`, "place marker" → `[pm]`, "remove marker" → `[rm]`
- "repeat from * to end" → `*` in stitch_instructions + "Repeat from * to end of round." in instructions_after
- Stitch counts at end of row/round (e.g. "— 80 sts") → instructions_after as "X stitches increased/decreased."
- "work as established" or "continue in pattern" → restate the actual stitches
- Size brackets (96, 100, 104...) → extract the value for the selected size only
- "as follows:" at the end of a sentence → remove "as follows", let the next step speak for itself
- Measurement ranges → use " / " separator with abbreviated units: "2 cm / 0.75 in"
- Ordinals → spell out: "first", "second", not "1st", "2nd"

---

*Last updated: March 2026*
*Add new rules here as edge cases are discovered during pattern entry.*

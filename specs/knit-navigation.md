# Knitting screen navigation: repeats and checkpoints (M1.6)

**Status:** Draft for approval. Covers KNIT-04 (repeats) and KNIT-05 (verify checkpoints). Builds on `schema-v1.md` (§3.5 `repeat_groups`, §3.6 `steps`, §3.8 `project_progress`, §5 JSON shapes). Out of scope: saving progress and jump-to-step (M1.7), running stitch counts (KNIT-12), nested repeats, visual polish.

## 1. State

Position is held in the shape of `project_progress`:

```
Progress = {
  current_step_id: string | null,            // null = not started, resume at first step
  repeat_pass_counts: { [groupId]: number }, // 1-based current pass
  checkbox_states:    { [groupId]: boolean } // condition checkbox for the current pass
}
```

It lives in memory and is read and written **only** through `src/lib/progress.ts`. M1.7 adds persistence inside that module; the UI does not change. Per-move strikethrough and checkpoint confirmation are transient UI state and are not part of `Progress`.

If `current_step_id` is not in the size-filtered step list, treat it as null.

## 2. Groups and steps

Work from the size-filtered step list (`stepsForSize`). For each `repeat_group_id`:

- **Intro:** the step with `repeat_step_number` null.
- **Pass body:** steps with `repeat_step_number` set, ordered by it. First and last body steps are the pass's first and last step *for this size*.
- **Assumption:** a group's steps are contiguous in `step_order` (the importer does not check this). A group with no body steps for the chosen size is skipped.

A **count group** has `repeat_count[size]` (integer). A **condition group** has `repeat_condition`. If a count group has no valid integer for the size, the count is **missing**.

## 3. Next

| From | Next goes to |
|---|---|
| A step outside any group | the following step |
| A group's intro | first body step, pass 1 (`repeat_pass_counts[g] = 1`, `checkbox_states[g] = false`) |
| A body step that isn't the last of its pass | the next body step |
| Last body step, count group, pass < count | first body step, pass + 1 |
| Last body step, count group, pass >= count | the step after the group (pass count kept) |
| Last body step, count group, count missing | the step after the group (so the knitter isn't trapped) |
| Last body step, condition group, checkbox ticked | the step after the group (pass count and ticked state kept) |
| Last body step, condition group, checkbox unticked | first body step, pass + 1, `checkbox_states[g] = false` |

Next is disabled on the final step of the pattern, and on a checkpoint until the knitter confirms (§6).

## 4. Previous

| From | Previous goes to |
|---|---|
| A step outside any group | the preceding step; if that is a group's last body step, land on it with the group's stored pass count and checkbox (the final pass) |
| First body step, pass 1 | the group's intro |
| First body step, pass p > 1 | last body step, pass p - 1 (condition group: checkbox cleared) |
| Any other body step | the preceding body step |
| A group's intro | the preceding step |

Going back out of a group and forward again through the intro restarts at pass 1.

## 5. Display

- **Intro note:** after its text, "Worked N times for size X" (count group), or the condition (condition group) with placeholders filled from the **group's** `size_params`. A missing value shows the existing ⚠ marker. A missing count shows "⚠ repeat count missing for size X".
- **Body steps:** counter "Repeat 3 of 8", or "Repeat 3" for a condition group. Missing count: "Repeat 3 of ⚠ missing".
- **`last_repeat_note`:**
  - Count group: on every body step of the final pass (pass = count).
  - Condition group: the final pass isn't known up front, so it shows on the pass's last step once the checkbox is ticked.
  - Never shown on non-final passes or on the intro.
- **Condition checkbox:** on the last body step of each pass of a condition group: the filled condition, a checkbox, and a line saying what Next will do ("Next leaves the repeat" / "Next starts another pass").
- **Previews:** Previous/Next previews show the step that Previous/Next would actually go to.
- **Header:** "step X of N" stays the flat position in the size-filtered list; the counter is separate.

## 6. Checkpoints

A step with `step_type = 'checkpoint'` shows the expected counts for the chosen size from `stitch_count`: `total` first, then every other label in key order, each with its value. A label's underscores are shown as spaces (`front_back` → "front back"). A label with no value for the size shows as missing (⚠). A checkpoint with no `stitch_count` at all shows "⚠ expected count missing".

Next stays disabled until the knitter ticks "Confirm count". Confirmation is transient: it resets whenever the position changes, and is not saved. A checkpoint with missing data can still be confirmed.

## 7. Decisions made here

1. Missing `repeat_count`: shown as missing; Next leaves the group at the end of the pass.
2. Condition-group `last_repeat_note` shows once the checkbox is ticked.
3. Checkpoint confirmation is transient, not stored in `checkbox_states`.

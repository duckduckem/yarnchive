# Spec 01 — Knitting View (Step-by-Step Active Project Experience)

**Status:** Draft
**Author:** Emily
**Date:** 2026-03-14

---

## Overview

The Knitting View is the primary screen a user interacts with while actively working on a project. It presents pattern steps as a vertically scrolling list, keeping focus on the current step while showing surrounding context. It tracks progress, handles repeats, and works fully offline. This is the core feature of Yarnchive.

---

## User Stories

**As a knitter actively working a project, I want to:**

1. See my current step clearly, so I know exactly what to do next without hunting through a paper pattern.
2. Mark a step complete and advance to the next one, so my progress is saved and I can pick up where I left off.
3. See how many repeats remain for the current step, so I don't lose count mid-row.
4. Tap a stitch abbreviation to see its definition, so I don't have to look it up elsewhere.
5. Scroll up to review a previous step, so I can recheck instructions I already passed.
6. See a note or checkpoint step rendered differently from a regular instruction, so I know when something needs my attention vs. action.
7. Have my progress saved automatically, so a phone lock or app close never loses my place.
8. Use the Knitting View offline, so I can knit without a Wi-Fi connection.
9. Restart a project from the beginning, so I can re-knit a pattern or recover from a mistake.

---

## Scope

**In scope for this spec:**
- Displaying the current step (all three instruction fields)
- Marking an instruction step complete
- Repeat tracking — rendering current/total repeat count and incrementing
- Checkpoint steps — blocking advance until user confirms
- Note steps — display-only, no completion action
- Stitch abbreviation parsing and tap-to-define behavior (definition display only; full stitch directory is a separate spec)
- Vertical scroll layout with focus on the current step and context above/below
- Progress indicator with section labels
- Restart project action (with confirmation)
- Offline support via cached steps
- Auto-save on every step state change

**Out of scope (future specs):**
- Timer / row counter
- Pattern section navigation (jumping to a different section)
- Editing or annotating steps
- Photos on projects
- Full stitch directory browse view
- Yarn / needle supply display within this view

---

## Layout & Navigation Model

Steps are presented as a **vertical list**. The user moves **down** through the pattern as they progress and can scroll **up** to review earlier steps.

At any point the user sees:
- **Above** — previous step(s), rendered in a visually de-emphasized style (dimmed, reduced size) to provide context without competing with the active step
- **Center / focused** — the current active step, visually prominent
- **Below** — upcoming step(s), rendered de-emphasized, visible enough to orient the user but not distracting

The view auto-scrolls to keep the active step centered on screen whenever progress advances. The user can freely scroll up to review past steps; scrolling does not change saved progress.

### Header

Persistent at the top of the screen:
- Project name and pattern name
- Section label + progress: e.g. "Body — Step 4 of 12" or "Step 4 of 24" if no sections
- Back chevron — exits to project detail (not a previous step)
- Overflow menu — contains Restart Project action

---

## Step Card

Each step is rendered as a card in the list. The active step card is full-size and visually prominent; adjacent steps are smaller and dimmed.

Card contents (each field rendered only if not null):
- **Side indicator** (RS / WS) — shown as a small badge if `side` is not null
- **`instructions_before`** — prose text above the stitch line
- **`stitch_instructions`** — parsed for stitch markup (see Stitch Markup below)
- **`instructions_after`** — prose text below the stitch line

All three instruction fields can be present simultaneously; this is a valid and expected configuration. They are always rendered in order: before → stitch → after.

**Repeat indicator** — shown below the instruction fields only when `total_repeats > 1`: "Repeat N of M"

---

## Step Types

| `step_type` | Visual treatment | Advance action |
|---|---|---|
| `instruction` | Default card styling | Large icon button (e.g. checkmark) — marks complete, advances to next step |
| `note` | Distinct style (e.g. lighter background, info icon) | Large icon button (e.g. arrow-down) — advances; no event recorded |
| `checkpoint` | Distinct style (e.g. warning tone, pause icon) | Large icon button (e.g. confirm/flag) — user must tap to proceed; does not auto-advance |

Advance buttons are icon-only — no text labels. Buttons should be large enough for easy one-handed tap while holding knitting.

When the user is scrolled up reviewing a prior step, no advance action is shown for that card. The active step's advance button remains visible at its scroll position.

---

## Repeat Behavior

When `total_repeats > 1` for the active step:
- Show "Repeat N of M" on the step card
- Tapping the advance button increments `current_repeat`
- When `current_repeat` reaches `total_repeats`, advance to the next step and reset `current_repeat` to 1

---

## End of Pattern

After the final step is marked complete:
- Show a completion state (inline or overlay): congratulations message, project name, option to mark the project as Finished
- Do not loop back to step 1 automatically

---

## Restart Project

Accessible from the overflow menu in the header.

- Tapping "Restart Project" shows a confirmation alert: "Restart this project? Your progress will be reset to the beginning. This can't be undone."
- Confirming resets `project_step_state.current_step_id` to the first step and `current_repeat` to 1
- Project status is set back to "In Progress" if it was "Finished"
- The view scrolls to the top (step 1 becomes the active step)

---

## Stitch Markup

Step instructions may contain stitch abbreviations wrapped in brackets: `[k2tog]`, `[ssk]`, `[yo]`.

- Parse all `[token]` occurrences in all three instruction fields at render time
- Render each token as a tappable inline element (e.g. underlined or highlighted)
- On tap: show a bottom sheet with the stitch definition from `stitch_def` (abbreviation + definition text). If no matching `stitch_def` record exists, show "No definition found for [abbreviation]"
- Numbers in stitch instructions are rendered in the accent color — display-only, not tappable

---

## Data Requirements

**Reads:**
- `project` — name, status, linked `pattern_size_id`
- `pattern` — name (via `pattern_size` → `pattern`)
- `pattern_step` — all steps for the selected size, ordered by `step_order`; fields: `id`, `step_type`, `side`, `total_repeats`, `instructions_before`, `stitch_instructions`, `instructions_after`, and any section/group label
- `project_step_state` — `current_step_id`, `current_repeat`, `cached_steps`
- `stitch_def` — on demand when a bracketed token is tapped

**Writes:**
- `project_step_state.current_step_id` — updated on advance
- `project_step_state.current_repeat` — updated on repeat increment
- `project_step_state.cached_steps` — updated to keep a window of steps around the current position
- `project.status` — updated on completion or restart

---

## Offline Behavior

- On load (online), fetch all steps for the active project and store a JSON snapshot in `project_step_state.cached_steps`
- When offline, render from `cached_steps`
- Write step state changes to local storage immediately; sync to Supabase when connectivity is restored
- Show a subtle persistent offline indicator when the device has no connection
- If `cached_steps` is empty and the device is offline: "You need a connection to load this project for the first time. Open it while online to enable offline access."

---

## Edge Cases

| Scenario | Expected behavior |
|---|---|
| Step has only one or two instruction fields populated | Render only the non-null fields; no error or placeholder |
| All three instruction fields are populated | Render before → stitch → after in order |
| All three instruction fields are null | Should not occur (data integrity), but if it does: show "No instructions recorded for this step" |
| `total_repeats` is 1 or null | Treat as 1; do not show repeat indicator |
| Stitch token has no matching `stitch_def` | Show "No definition found for [abbreviation]" in the bottom sheet |
| User is on step 1 | No previous step visible above; top of list |
| Pattern has only one step | Progress shows "Step 1 of 1"; completion triggers end-of-pattern state immediately |
| Device goes offline mid-session | Continue from cached steps; queue state writes; show offline indicator |
| User confirms restart | Reset state, scroll to top, active step is step 1 |

---

## Decisions

- Back navigation is scroll-based (no swipe gesture)
- Checkpoint steps do not trigger push notifications
- Note steps record no completion event on advance
- Progress indicator includes section labels when the pattern has named sections

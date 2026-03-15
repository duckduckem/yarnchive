# Tasks 01 — Knitting View

**Plan:** `plan/01-knitting-view.md`
**Status:** Not started
**Date:** 2026-03-14

---

## Prerequisites Note

Tasks 1–2 are bootstrap tasks that must be completed before any feature tasks. All others depend on them. Within the feature tasks, work top-to-bottom — each task assumes the previous ones are done.

---

## Task 1 — Project bootstrap

**What:** Initialize the Vite + React + TypeScript project, install and configure Tailwind CSS, install React Router, and create the Supabase client.

**Files to create/modify:**
- Project root (`vite.config.ts`, `tsconfig.json`, `index.html`, etc.)
- `src/main.tsx` — app entry point with router
- `src/lib/supabase.ts` — Supabase client using env vars
- `tailwind.config.ts`, `src/styles/global.css`

**Verify:** Dev server runs. Navigating to `/` renders a placeholder without errors. Supabase client initializes without throwing (check console).

---

## Task 2 — Define TypeScript types

**What:** Create `src/types/knitting.ts` with all types needed for the Knitting View as specified in the plan.

**Types to define:** `StepType`, `Side`, `PatternStep`, `ProjectStepState`, `Project`, `KnittingSession`

**Files to create:**
- `src/types/knitting.ts`

**Verify:** No TypeScript errors. Types can be imported in another file without issue.

---

## Task 3 — Stitch markup parser

**What:** Implement `parseStitchText` in `src/lib/parse-stitch-text.ts`. The function takes a string and returns an array of segments typed as `text`, `token`, or `number`.

**Files to create:**
- `src/lib/parse-stitch-text.ts`

**Verify:** Manually test the following inputs produce the correct segment arrays:
- `"k3, p2"` → two number segments, text in between
- `"[k2tog] twice"` → one token segment, one text segment
- `"[ssk], [k2tog], k1"` → two token segments, text, one number segment
- `"Turn work."` → one text segment, no tokens or numbers
- `""` (empty string) → empty array

---

## Task 4 — `useKnittingSession` data fetching hook

**What:** Implement the hook in `src/hooks/use-knitting-session.ts`. It accepts a `projectId` string and returns `{ session, loading, error }`. On mount it runs the three Supabase queries from the plan (project + pattern name, steps, step state) and maps `repeat_group.label` onto each step as `section_label`.

**Files to create:**
- `src/hooks/use-knitting-session.ts`

**Verify:** Use a hardcoded `projectId` from your Supabase database. Hook returns a populated `KnittingSession` without errors when online. Confirm `section_label` is correctly mapped. Confirm `loading` transitions from `true` to `false`.

---

## Task 5 — `KnittingPage` shell and route

**What:** Create `src/pages/knitting-page.tsx` as the route component for `/projects/:projectId/knit`. It calls `useKnittingSession`, handles loading and error states, and renders placeholder text where child components will go. Wire up the route in the router.

**Files to create/modify:**
- `src/pages/knitting-page.tsx`
- `src/main.tsx` (add route)

**Verify:** Navigating to `/projects/<real-id>/knit` in the browser shows a loading state then renders without errors. 404 or bad project ID shows an error state.

---

## Task 6 — `KnittingHeader`

**What:** Build `src/components/knitting/knitting-header.tsx`. Receives `projectName`, `patternName`, `sectionLabel` (nullable), `stepIndex`, `totalSteps`, `isOnline`, and `onRestartClick`. Renders the header bar with back chevron, progress label, and overflow menu containing "Restart Project". Renders an offline indicator when `isOnline` is false.

**Progress label logic:**
- With section: `"Body — Step 4 of 12"`
- Without section: `"Step 4 of 24"`

**Files to create:**
- `src/components/knitting/knitting-header.tsx`

**Verify:** Render the component with props covering: section present, section absent, online, offline. Progress label is correct in both section cases. Overflow menu opens and "Restart Project" calls `onRestartClick`. Offline indicator appears only when `isOnline` is false.

---

## Task 7 — `SideBadge` and `RepeatIndicator`

**What:** Two small presentational components.

- `src/components/knitting/side-badge.tsx` — receives `side: 'RS' | 'WS'`, renders a small labeled badge
- `src/components/knitting/repeat-indicator.tsx` — receives `current` and `total` (both numbers), renders "Repeat N of M"

**Verify:** Both render correctly with their props. `RepeatIndicator` is not expected to handle `total <= 1` — that guard lives in the parent.

---

## Task 8 — `StitchToken` and `StitchText`

**What:** Build the inline stitch markup renderer.

- `src/components/knitting/stitch-token.tsx` — receives `abbreviation: string` and `onTap: (abbr: string) => void`. Renders an inline tappable element.
- `src/components/knitting/stitch-text.tsx` — receives `text: string` and `onTokenTap: (abbr: string) => void`. Calls `parseStitchText`, maps segments to: plain `<span>`, accent-colored `<span>` for numbers, `<StitchToken>` for tokens.

**Files to create:**
- `src/components/knitting/stitch-token.tsx`
- `src/components/knitting/stitch-text.tsx`

**Verify:** Render `StitchText` with `"[k2tog] 3 times, [ssk]"`. Confirm two tappable tokens, one accent-colored "3", plain " times, " text. Tapping a token fires `onTokenTap` with the correct abbreviation.

---

## Task 9 — `AdvanceButton`

**What:** Build `src/components/knitting/advance-button.tsx`. Receives `stepType: StepType` and `onAdvance: () => void`. Renders a large icon-only button (min 56px tap target). Icon varies by step type: checkmark for `instruction`, arrow-down for `note`, flag for `checkpoint`.

**Files to create:**
- `src/components/knitting/advance-button.tsx`

**Verify:** Renders the correct icon for each of the three step types. Tapping calls `onAdvance`. Tap target is visually large.

---

## Task 10 — `StepCard` and `StepList`

**What:** The core layout components.

`src/components/knitting/step-card.tsx` — receives `step: PatternStep`, `isActive: boolean`, `currentRepeat: number`, `onAdvance: () => void`, `onTokenTap: (abbr: string) => void`. Renders:
- `SideBadge` if `side` is non-null
- `StitchText` for each non-null instruction field in order (before → stitch → after)
- `RepeatIndicator` if `total_repeats > 1` (use `currentRepeat` and `step.total_repeats`)
- `AdvanceButton` only when `isActive`
- Active card: full opacity and scale. Inactive: dimmed and reduced.

`src/components/knitting/step-list.tsx` — receives `steps: PatternStep[]`, `currentStepId: string`, `currentRepeat: number`, `onAdvance: () => void`, `onTokenTap: (abbr: string) => void`. Renders all `StepCard` components. On `currentStepId` change, smooth-scrolls the active card into center view using a ref map.

**Files to create:**
- `src/components/knitting/step-card.tsx`
- `src/components/knitting/step-list.tsx`

**Verify:** Render a list of 3–5 steps. Active card is visually prominent; others are dimmed. Changing `currentStepId` scrolls correctly. All three instruction fields render when present. Null fields are omitted. `RepeatIndicator` appears only when `total_repeats > 1`. `AdvanceButton` only on active card.

---

## Task 11 — Advance and repeat logic in `KnittingPage`

**What:** Wire up state and the `handleAdvance` function in `KnittingPage`. Add `currentStepId`, `currentRepeat`, and `isFinished` to component state, initialized from the session. Implement `handleAdvance` per the plan's advance logic (repeat increment vs. step advance vs. finished). Pass `onAdvance` down to `StepList`.

**Files to modify:**
- `src/pages/knitting-page.tsx`

**Verify:** Using a real project in the browser: tapping advance moves through repeats correctly, then advances to the next step. After the final step, `isFinished` becomes true (log it for now — `CompletionOverlay` comes next).

---

## Task 12 — `StitchDefinitionSheet`

**What:** Build `src/components/knitting/stitch-definition-sheet.tsx`. Receives `abbreviation: string | null`, `onClose: () => void`. When `abbreviation` is non-null, fetches from `stitch_def` via Supabase (using the session-level cache in `KnittingPage`). Renders as a bottom sheet overlay with the definition text, or "No definition found for [x]" if no record exists.

Wire up `onTokenTap` in `KnittingPage`: set active abbreviation state, pass cache + setter down, open the sheet.

**Files to create/modify:**
- `src/components/knitting/stitch-definition-sheet.tsx`
- `src/pages/knitting-page.tsx`

**Verify:** Tap a known stitch token — sheet opens with correct definition. Tap an unknown token — sheet shows "No definition found" message. Tapping the same token twice does not re-fetch (cache hit). Sheet closes on dismiss.

---

## Task 13 — `CompletionOverlay`

**What:** Build `src/components/knitting/completion-overlay.tsx`. Receives `projectName: string`, `onMarkFinished: () => void`, `onDismiss: () => void`. Shown when `isFinished` is true in `KnittingPage`. `onMarkFinished` updates `project.status` to `"Finished"` in Supabase.

**Files to create/modify:**
- `src/components/knitting/completion-overlay.tsx`
- `src/pages/knitting-page.tsx`

**Verify:** Advance past the final step — overlay appears with project name. Tapping "Mark as Finished" updates status in Supabase (verify in dashboard). Dismissing closes the overlay without changing status.

---

## Task 14 — `RestartConfirmDialog` and restart logic

**What:** Build `src/components/knitting/restart-confirm-dialog.tsx`. A simple confirmation modal (or `window.confirm` as a placeholder). Wire "Restart Project" in `KnittingHeader` to open it. On confirm: reset `current_step_id` to first step, `current_repeat` to 1, set `project.status` back to `"In Progress"` if it was `"Finished"`, update both localStorage and Supabase, and scroll to top.

**Files to create/modify:**
- `src/components/knitting/restart-confirm-dialog.tsx`
- `src/pages/knitting-page.tsx`

**Verify:** Trigger restart from overflow menu. Confirm alert appears. On confirm, view resets to step 1, repeat is 1. Supabase `project_step_state` reflects the reset. If project was Finished, status reverts to In Progress.

---

## Task 15 — Persistence (localStorage + Supabase sync)

**What:** Implement the full persistence strategy in `KnittingPage`. On mount, read from localStorage first for an instant render, then reconcile with Supabase (Supabase wins). On every state change: write to localStorage immediately; write to Supabase debounced at 300ms. After a successful online load, upsert the full steps array into `project_step_state.cached_steps`.

**Files to modify:**
- `src/pages/knitting-page.tsx`

**Verify:** Advance several steps. Refresh the page — resumes at the correct step without a flash of wrong state. Verify `cached_steps` is populated in Supabase after load.

---

## Task 16 — Offline detection, indicator, and fallback

**What:** Add online/offline detection to `KnittingPage` via `navigator.onLine` and event listeners on `window`. When offline: skip Supabase writes (queue for retry on reconnect), render from `cached_steps` if Supabase is unavailable. If `cached_steps` is null and offline on mount, show the "needs connection" error state. Show offline indicator in `KnittingHeader` when `isOnline` is false. On reconnect, flush any queued state writes.

**Files to modify:**
- `src/pages/knitting-page.tsx`

**Verify:** Load the view while online (confirm `cached_steps` populated). Switch to offline in DevTools. Reload — view renders from cache. Advance a step — state saves to localStorage. Come back online — Supabase reflects the offline advance. Clear `cached_steps` in Supabase, reload while offline — error state appears.

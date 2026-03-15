# Plan 01 — Knitting View

**Spec:** `spec/01-knitting-view.md`
**Status:** Draft
**Date:** 2026-03-14

---

## Overview

This plan covers the technical implementation of the Knitting View — the step-by-step active knitting screen. It covers component architecture, data fetching, state management, offline strategy, stitch markup parsing, and routing.

---

## Prerequisites

Before this feature can be built, the following infrastructure must exist:

- Supabase client initialized (`src/lib/supabase.ts`)
- React Router configured with a route for `/projects/:projectId/knit`
- TypeScript types generated or hand-written for the relevant database tables
- Tailwind CSS configured

These will be set up as part of the project bootstrap, before task implementation begins.

---

## Route

```
/projects/:projectId/knit
```

The `projectId` identifies the `project` record. From it we resolve `pattern_size_id`, then load all `pattern_step` records for that size.

---

## TypeScript Types

Define in `src/types/knitting.ts`:

```ts
type StepType = 'instruction' | 'note' | 'checkpoint'
type Side = 'RS' | 'WS' | null

interface PatternStep {
  id: string
  step_order: number
  step_type: StepType
  side: Side
  total_repeats: number | null
  instructions_before: string | null
  stitch_instructions: string | null
  instructions_after: string | null
  section_label: string | null  // derived from repeat_group if present
}

interface ProjectStepState {
  current_step_id: string
  current_repeat: number
  cached_steps: PatternStep[] | null
}

interface Project {
  id: string
  name: string
  status: string
  pattern_size_id: string
}

// Resolved at load time, not stored
interface KnittingSession {
  project: Project
  pattern_name: string
  steps: PatternStep[]
  stepState: ProjectStepState
}
```

---

## Component Architecture

```
KnittingPage                          ← route entry point, data fetching, orchestration
├── KnittingHeader                    ← project/pattern name, progress, back chevron, overflow menu
├── StepList                          ← scrollable container, renders all step cards
│   └── StepCard (× N)               ← individual step, active vs. inactive visual states
│       ├── SideBadge                 ← RS/WS indicator
│       ├── StitchText                ← renders one instruction field with markup parsed
│       │   └── StitchToken           ← tappable bracket token
│       ├── RepeatIndicator           ← "Repeat N of M", conditionally rendered
│       └── AdvanceButton             ← icon-only, step-type-aware, hidden on inactive cards
├── StitchDefinitionSheet             ← bottom sheet for stitch lookup, portal-rendered
├── CompletionOverlay                 ← shown after final step is completed
└── RestartConfirmDialog              ← confirmation alert for restart action
```

### Component responsibilities

**`KnittingPage`**
- Fetches project, pattern name, all steps, and step state on mount
- Manages `currentStepId` and `currentRepeat` in React state (optimistic)
- Persists state changes (debounced write to Supabase + immediate write to localStorage)
- Passes derived data down; handles advance, repeat increment, and restart actions
- Detects online/offline status via `navigator.onLine` + `online`/`offline` events

**`KnittingHeader`**
- Receives: project name, pattern name, section label, step index, total steps
- Computes progress label: section-aware if `section_label` is non-null on the current step
- Overflow menu with single item: "Restart Project"

**`StepList`**
- Receives: all steps, current step index
- Renders all `StepCard` components
- Holds a ref to each card; on `currentStepId` change, calls `scrollIntoView({ behavior: 'smooth', block: 'center' })` on the newly active card

**`StepCard`**
- Receives: step data, `isActive` boolean, `currentRepeat` (only relevant when active), `onAdvance` callback
- When `isActive`: full-size, full opacity, shows `AdvanceButton`
- When inactive: reduced opacity/scale, no `AdvanceButton`
- Renders `StitchText` for each non-null instruction field in order

**`StitchText`**
- Receives: a single instruction string
- Parses the string into segments: plain text, `[token]` spans, and number spans
- Renders plain text as-is, numbers in accent color, tokens as `<StitchToken>`

**`StitchToken`**
- Receives: abbreviation string, `onTap` callback
- Tappable inline element; calls `onTap(abbreviation)` on click/tap

**`AdvanceButton`**
- Receives: `step_type`, `onAdvance` callback
- Renders appropriate icon per step type (checkmark / arrow-down / flag)
- Large tap target (min 56px)

**`StitchDefinitionSheet`**
- Receives: open state, abbreviation, definition (or null), `onClose`
- Fetches `stitch_def` by abbreviation when opened (not preloaded)
- Shows definition or "No definition found for [x]"
- Renders as a bottom sheet overlay

**`CompletionOverlay`**
- Receives: project name, `onMarkFinished`, `onDismiss`
- Shown when user advances past the final step

**`RestartConfirmDialog`**
- Native `window.confirm` or a simple modal — confirmation before resetting state

---

## Data Fetching

All fetching is in `KnittingPage` via a single `useKnittingSession` hook.

### Initial load query

```ts
// 1. Fetch project + pattern name
const { data: project } = await supabase
  .from('project')
  .select('id, name, status, pattern_size_id, pattern_size(pattern(name))')
  .eq('id', projectId)
  .single()

// 2. Fetch all steps for this size, ordered
const { data: steps } = await supabase
  .from('pattern_step')
  .select(`
    id, step_order, step_type, side, total_repeats,
    instructions_before, stitch_instructions, instructions_after,
    repeat_group(label)
  `)
  .eq('pattern_size_id', project.pattern_size_id)
  .order('step_order', { ascending: true })

// 3. Fetch step state
const { data: stepState } = await supabase
  .from('project_step_state')
  .select('current_step_id, current_repeat, cached_steps')
  .eq('project_id', projectId)
  .single()
```

`section_label` on each step is mapped from `repeat_group.label` after the query.

### Stitch definition fetch (on demand)

```ts
const { data } = await supabase
  .from('stitch_def')
  .select('abbreviation, definition')
  .eq('abbreviation', token)
  .single()
```

Fetched only when a token is tapped. Cache results in a `Map<string, string | null>` within `KnittingPage` for the session so repeated taps on the same token don't re-fetch.

---

## State Management

All state lives in `KnittingPage`. No global store needed for this feature.

```ts
const [steps, setSteps] = useState<PatternStep[]>([])
const [currentStepId, setCurrentStepId] = useState<string>('')
const [currentRepeat, setCurrentRepeat] = useState<number>(1)
const [isFinished, setIsFinished] = useState<boolean>(false)
const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
const [stitchDefCache, setStitchDefCache] = useState<Map<string, string | null>>(new Map())
```

Derived values (computed, not stored):
```ts
const currentStepIndex = steps.findIndex(s => s.id === currentStepId)
const currentStep = steps[currentStepIndex]
const totalSteps = steps.length
```

### Advance logic

```ts
function handleAdvance() {
  const step = currentStep
  const repeatsRemaining = (step.total_repeats ?? 1) - currentRepeat

  if (repeatsRemaining > 0) {
    // More repeats: increment repeat counter, stay on same step
    const nextRepeat = currentRepeat + 1
    setCurrentRepeat(nextRepeat)
    persistStepState({ currentStepId, currentRepeat: nextRepeat })
  } else {
    // Repeats complete: advance to next step
    const nextStep = steps[currentStepIndex + 1]
    if (!nextStep) {
      setIsFinished(true)
      return
    }
    setCurrentStepId(nextStep.id)
    setCurrentRepeat(1)
    persistStepState({ currentStepId: nextStep.id, currentRepeat: 1 })
  }
}
```

---

## Persistence Strategy

### Write path

On every state change, write in two places:

1. **localStorage** — immediate, synchronous, keyed by `project_id`
   ```ts
   localStorage.setItem(`knit-state-${projectId}`, JSON.stringify({ currentStepId, currentRepeat }))
   ```

2. **Supabase** — debounced (300ms), skipped when offline; queued for retry on reconnect

### Read path on mount

1. Check localStorage for a saved state — use it if present for instant render
2. Fetch from Supabase in the background; reconcile (Supabase wins if newer)
3. If offline and `cached_steps` in Supabase state is populated: use it
4. If offline and no cache: show the "needs connection" error state

### Cached steps

After a successful online load, write the full steps array into `project_step_state.cached_steps` as JSON. Overwritten on every successful online load to stay current.

---

## Stitch Markup Parser

Implemented as a pure utility function in `src/lib/parse-stitch-text.ts`.

```ts
type Segment =
  | { type: 'text'; value: string }
  | { type: 'token'; value: string }      // bracketed stitch abbreviation
  | { type: 'number'; value: string }     // numeric literal

function parseStitchText(input: string): Segment[]
```

Parsing rules (applied in a single pass via regex):
- `\[([^\]]+)\]` → token segment (strip brackets, keep inner text)
- `\b(\d+)\b` → number segment
- Everything else → text segment

`StitchText` maps each segment to its rendered element:
- `text` → plain `<span>`
- `token` → `<StitchToken>`
- `number` → `<span className="text-accent-500">`

---

## Scroll Behavior

`StepList` maintains a `Map<string, HTMLElement>` of step card refs keyed by step id. When `currentStepId` changes:

```ts
cardRefs.get(currentStepId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
```

This is the only programmatic scroll. The user otherwise scrolls freely.

---

## Progress Label

Computed in `KnittingHeader`:

```ts
const sectionLabel = currentStep.section_label
const stepPosition = `Step ${currentStepIndex + 1} of ${totalSteps}`
const progressLabel = sectionLabel ? `${sectionLabel} — ${stepPosition}` : stepPosition
```

---

## Offline Indicator

A small banner or icon in the header, shown when `isOnline === false`. Informational only. Hidden when back online.

---

## File Structure

```
src/
├── pages/
│   └── knitting-page.tsx
├── components/
│   └── knitting/
│       ├── knitting-header.tsx
│       ├── step-list.tsx
│       ├── step-card.tsx
│       ├── side-badge.tsx
│       ├── stitch-text.tsx
│       ├── stitch-token.tsx
│       ├── repeat-indicator.tsx
│       ├── advance-button.tsx
│       ├── stitch-definition-sheet.tsx
│       ├── completion-overlay.tsx
│       └── restart-confirm-dialog.tsx
├── hooks/
│   └── use-knitting-session.ts
├── lib/
│   ├── supabase.ts
│   └── parse-stitch-text.ts
└── types/
    └── knitting.ts
```

---

## Out of Scope for This Plan

- PWA service worker configuration (separate infrastructure task)
- Supabase Row Level Security policies (separate infrastructure task)
- Stitch directory browse page
- Pattern section jump navigation

---

## Open Questions for Implementation

- Does `repeat_group` have a `label` field in the actual schema? Confirm against `docs/data-model.docx` before writing the Supabase query.
- Should `project_step_state` be created automatically when a project is created, or lazily on first open of the Knitting View? Plan assumes lazy creation with an upsert.

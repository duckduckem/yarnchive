# Yarnchive — Project Bible

> Read this file at the start of every session. It is the source of truth for what we're building, how we're building it, and why.

---

## What is Yarnchive?

Yarnchive is a knitting companion app. It solves the core problem that knitting patterns are inconsistently formatted and difficult to reference on a phone while actively knitting.

**Core value proposition:**
- Step-by-step pattern guidance while knitting, with normalized instructions regardless of source format
- Track progress and never lose your place — even offline
- Store patterns and yarn stash, with bidirectional matching (find patterns for a yarn, find yarn for a pattern)
- Stitch directory with definitions, images, and tutorials linked directly from pattern steps

**Target user:** Any knitter, from beginner to advanced. The app should work for any pattern type — accessories, garments, colorwork, flat, in-the-round, multi-piece construction, any size variants.

**Domain:** yarnchive.app (primary), yarnchive.com (redirects to .app)

---

## Current Status

**Phase:** Pre-development. Spec and data model complete. Setting up project structure and beginning spec-driven development with GitHub Spec Kit.

**What exists so far:**
- Full data model (see `docs/data-model.docx`)
- Key architectural decisions (see below)
- Project infrastructure (GitHub, Supabase, Vercel all configured)

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite | PWA with offline support via vite-plugin-pwa |
| Styling | Tailwind CSS | Utility-first, no component library to start |
| Backend / DB | Supabase | Postgres, auth, file storage all in one |
| Hosting | Vercel | Auto-deploys from GitHub main branch |
| Version control | GitHub | Spec Kit workflow lives here |

**Supabase:** Project URL and anon key are in `.env.local` (never commit this file).

---

## Project Structure

```
yarnchive/
├── CLAUDE.md                   ← this file, read every session
├── .env.local                  ← secrets, never commit
├── docs/
│   ├── data-model.docx         ← full entity reference with field definitions
│   └── decisions.md            ← log of architectural decisions and why
├── spec/
│   └── *.md                    ← feature specs (human-readable requirements)
├── plan/
│   └── *.md                    ← technical plans generated from specs
├── tasks/
│   └── *.md                    ← implementation task lists generated from plans
└── src/
    ├── components/             ← React components
    ├── pages/                  ← top-level route pages
    ├── hooks/                  ← custom React hooks
    ├── lib/
    │   ├── supabase.ts         ← Supabase client
    │   └── utils.ts            ← shared utilities
    ├── types/                  ← TypeScript type definitions
    └── styles/                 ← global styles
```

---

## Development Workflow (Spec Kit)

We follow the GitHub Spec Kit four-phase process:

1. **Spec** — write a human-readable feature spec in `spec/`. Describes what the feature does, user stories, edge cases. Written by Emily, refined with Claude.
2. **Plan** — Claude Code generates a technical plan in `plan/`. Architecture decisions, component breakdown, database queries needed.
3. **Tasks** — Claude Code breaks the plan into discrete, testable tasks in `tasks/`. Each task is implementable and verifiable in isolation.
4. **Implement** — Claude Code implements tasks one at a time. Emily reviews each before moving to the next.

**Never skip straight to implementation.** If there is no spec for a feature, write one first.

---

## Data Model Summary

Full field-level reference is in `docs/data-model.docx`. Key entities:

**Pattern Library (shared, no duplicates across users)**
- `pattern` — core pattern record
- `pattern_size` — size variants (XS/S/M/L etc). Every pattern has at least one.
- `pattern_step` — individual steps. Has three instruction fields (before, stitch, after) plus metadata.
- `repeat_group` — groups steps that repeat together as a block
- `stitch_def` — stitch directory. Abbreviations, definitions, images, videos.
- `pattern_yarn` / `pattern_needle` / `pattern_notion` — supply requirements, scoped to size

**User Space (private per user)**
- `user` — app user
- `user_pattern` — join table: user's pattern collection + personal notes
- `stash_yarn` — yarn the user owns
- `stash_needle` — needles the user owns
- `project` — active or completed knitting project
- `project_step_state` — current step + repeat counter + offline step cache
- `project_yarn` — which stash yarns are assigned to a project

---

## Key Architectural Decisions

**Stitch markup format**
Stitch abbreviations in step instructions use `[bracket]` markup, e.g. `[k2tog], [ssk]`. The app parses these tokens and renders them as tappable links to the stitch directory. Numbers within stitch instructions are highlighted in accent color in the UI.

**Three-field instruction structure**
Each step has `instructions_before`, `stitch_instructions`, and `instructions_after`. Any combination can be null. This supports pure prose steps, stitches with qualifiers, context before stitches, and pure notes.

**step_type enum**
- `instruction` — actionable, shown with a completion control
- `note` — informational, displayed differently, no completion action
- `checkpoint` — pauses progress and prompts user confirmation before advancing

**Repeat handling**
Repeating steps are stored once. `project_step_state.current_repeat` tracks which iteration the user is on. The UI renders "Round 3 of 8" and does not advance until all repeats are complete.

**Pattern deduplication**
Patterns live in a shared library. Users collect patterns via `user_pattern` (many-to-many). Personal notes are per-user. Two users knitting the same pattern share one `pattern` record.

**Size as first-class entity**
`pattern_size` allows yarn requirements and steps to differ by size. Patterns without size variants have one record labeled "One Size."

**Offline via PWA**
`project_step_state.cached_steps` holds a JSON snapshot of steps around the current position. A PWA service worker caches the active project screen for offline knitting.

**Yarn matching logic**
Hard filters: `weight_code` equality + `yardage_remaining` >= pattern yardage for selected size.
Soft filter: fiber content.
Post-filter UI: color family, then color name.

**Multi-user ready, single-user first**
All user-owned data is keyed to `user_id`. Auth is handled by Supabase. Currently single-user. Adding multi-user later requires no schema changes.

---

## Development Principles

**Spec-driven, always.** No feature gets built without a spec. This is how we learn the methodology and how we keep the codebase coherent.

**MVP focus.** Build the simplest version that works and can be tested. The core knitting experience (step-by-step view, progress tracking, offline) comes before everything else.

**No goldplating.** Do not add design polish, edge case handling, or "nice to have" features before the core feature works. If it's a good idea, add it to the backlog.

**Test with real patterns.** Every major feature should be validated by actually knitting with it, not just by looking at it in a browser.

**Data model is stable.** The schema in `docs/data-model.docx` was designed to handle the full long-term feature set. Resist the urge to simplify it for the short term — it will require painful refactoring later.

**TypeScript everywhere.** All new code is TypeScript. No `any` types without a comment explaining why.

---

## Backlog (do not build yet)

- Admin interfaces for pattern entry (CSV import works fine for now)
- Advanced search and filtering beyond basic matching
- Social / sharing features
- Time tracking per project
- Cost tracking
- Pattern PDF import / parsing
- Community pattern library
- WIP photos on projects
- Gauge calculator

---

## Conventions

**Naming**
- Database tables: `snake_case`
- TypeScript types: `PascalCase`
- React components: `PascalCase`
- Files: `kebab-case`
- Hooks: `useHookName`

**Enums (use these exact values)**

Yarn weight codes:
`0=Lace, 1=Fingering/Sock, 2=Sport, 3=DK/Light Worsted, 4=Worsted/Aran, 5=Bulky/Chunky, 6=Super Bulky, 7=Jumbo`

Step types: `instruction | note | checkpoint`

Side: `RS | WS | null`

Project status: `Planned | In Progress | Finished | Shelved | Abandoned`

Needle type: `Straight | Circular | DPNs`

Notion type: `Tapestry Needle | Crochet Hook | Stitch Markers | Scissors | Cable Needle | Row Counter | Waste Yarn`

---

*Last updated: March 2026*

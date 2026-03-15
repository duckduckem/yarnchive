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

**Phase:** Active development. Knitting view spec complete and initial tasks built. First full pattern dataset (Tolsta Tee, Size 3 F-cup, DK weight) ready for Supabase import.

**What exists:**
- Full data model (see `docs/data-model.docx`)
- Normalization rules (see `docs/normalization-rules.md`)
- Project infrastructure (GitHub, Supabase, Vercel all configured)
- Knitting view spec (`spec/01-knitting-view.md`) and initial implementation
- Complete test dataset for Tolsta Tee pattern

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
├── CLAUDE.md                    ← this file, read every session
├── .env.local                   ← secrets, never commit
├── docs/
│   ├── data-model.docx          ← full entity reference with field definitions
│   ├── normalization-rules.md   ← rules for entering pattern data consistently
│   └── decisions.md             ← log of architectural decisions and why
├── spec/
│   └── *.md                     ← feature specs (human-readable requirements)
├── plan/
│   └── *.md                     ← technical plans generated from specs
├── tasks/
│   └── *.md                     ← implementation task lists generated from plans
└── src/
    ├── components/              ← React components
    ├── pages/                   ← top-level route pages
    ├── hooks/                   ← custom React hooks
    ├── lib/
    │   ├── supabase.ts          ← Supabase client
    │   └── utils.ts             ← shared utilities
    ├── types/                   ← TypeScript type definitions
    └── styles/                  ← global styles
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
- `pattern_variant` — weight or construction variants of a pattern (e.g. DK vs Worsted)
- `pattern_size` — size variants scoped to a variant. Every pattern has at least one.
- `pattern_step` — individual steps with three instruction fields plus metadata
- `repeat_group` — groups steps that repeat together as a block
- `stitch_def` — stitch directory with abbreviations, definitions, images, videos
- `pattern_yarn` / `pattern_needle` / `pattern_notion` — supply requirements scoped to size

**User Space (private per user)**
- `user` — app user
- `user_pattern` — join table: user's pattern collection + personal notes
- `stash_yarn` — yarn the user owns
- `stash_needle` — needles the user owns
- `project` — active or completed knitting project
- `project_step_state` — current step + repeat counter + offline step cache
- `project_yarn` — which stash yarns are assigned to a project

**Key schema fields on `pattern_step`:**
- `step_type` — `instruction | note | checkpoint`
- `section` — top-level grouping (e.g. "Yoke", "Body", "Sleeves")
- `subsection` — optional detail grouping (e.g. "Neckband", "Raglan Increases")
- `step_label` — nullable text, stores source pattern reference (e.g. "Round 3", "Short Row 1")
- `side` — `RS | WS | null`
- `instructions_before` — prose only, displayed before stitches
- `stitch_instructions` — stitch abbreviations with `[bracket]` markup and `|` line breaks
- `instructions_after` — prose only, displayed after stitches
- `repeat_group_id` — links to `repeat_group` for multi-step repeat blocks
- `repeat_total` — how many times this step repeats (null = measurement-based)
- `repeat_condition` — human-readable stop condition for measurement-based repeats
- `variant_id` — nullable, scopes step to a specific pattern variant
- `size_id` — nullable, scopes step to a specific size

---

## Key Architectural Decisions

**Stitch bracket markup**
Stitch abbreviations use `[bracket]` markup in `stitch_instructions`. The app parses tokens and renders them as tappable links to the stitch directory. See Stitch Bracket Parsing below for full rules.

**Three-field instruction structure**
Each step has `instructions_before`, `stitch_instructions`, and `instructions_after`. Any of the three can be null. `instructions_before` and `instructions_after` are prose only — no stitch abbreviations. `stitch_instructions` contains only stitch content with bracket markup.

**step_type rendering**
- `instruction` — actionable step shown with a completion control
- `note` — informational context displayed differently with no completion action
- `checkpoint` — pauses progress and prompts explicit user confirmation before advancing

**Repeat handling — Model B (expanded steps)**
Repeating steps are stored once in the database with a `repeat_total` field. When a project is created, the app expands all repeats into a flat step list. A step with `repeat_total = 8` becomes 8 steps in the project's step state. The progress counter moves on every tap. The UI also shows secondary repeat context ("Repeat 3 of 8") so the knitter understands the pattern structure. For measurement-based repeats where `repeat_total` is null, the step repeats until the user manually advances past it.

**Pipe separator for long stitch sequences**
Use `|` as a line break separator in `stitch_instructions` to group stitches into logical sets of 3–6 per line. The app renders each pipe-delimited group on its own line. Example:
`[sm], [k1], [pm], [k12], [pm], | [k1], [pm], [k38], [pm], | [k1], [pm], [k12]`

**Stitch bracket parsing rules**
The app resolves bracket tokens in this priority order:
1. **Exact match** on `abbreviation` in `stitch_def` — e.g. `[k]`, `[sm]`, `[m1l]`
2. **Pipe syntax** for multi-word or display-name overrides — `[display text|stitch_def_id]` — e.g. `[Join in the round|join]`, `[Weave in ends|weave-in-ends]`
3. **Strip trailing digits** to find base abbreviation — e.g. `[k12]` strips `12` and looks up `k`

Note: abbreviations that contain digits as part of the name (e.g. `k2tog`) are found by exact match before digit stripping is attempted.

**Typography rendering**
- Bracket tokens matching a stitch_def → monospace font, tappable link to stitch directory
- Prose surrounding stitch tokens → regular font
- All numbers in any instruction field → highlighted in accent color automatically

**Pattern variants**
`pattern_variant` represents distinct versions of a pattern where the actual steps differ (e.g. DK weight vs Worsted weight). `pattern_size` and `pattern_step` both have a nullable `variant_id`. Steps with `variant_id = null` apply to all variants.

**Pattern deduplication**
Patterns live in a shared library. Users collect patterns via `user_pattern` (many-to-many). Personal notes are per-user. Two users knitting the same pattern share one `pattern` record.

**Size as first-class entity**
`pattern_size` is scoped to a `pattern_variant`. Yarn requirements and steps can differ by size. Patterns without size variants have one record labeled "One Size."

**step_label as source reference**
`step_label` stores whatever the source pattern calls a given step — "Round 1", "Row 3", "Short Row 2", "Next Round" etc. This is display reference data only. The app's primary navigation uses `step_num` and the expanded project step list.

**Progress display**
- Primary: global step counter ("Step 47 of 312") — always moves on every tap
- Secondary: repeat context ("Repeat 3 of 11") — shown when inside a repeat group
- Tertiary: section breadcrumb ("Yoke › Raglan Increases")

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

- Admin interfaces for pattern entry (spreadsheet import works fine for now)
- Automated pattern parsing from raw pattern text
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

Yarn weight codes: `0=Lace, 1=Fingering/Sock, 2=Sport, 3=DK/Light Worsted, 4=Worsted/Aran, 5=Bulky/Chunky, 6=Super Bulky, 7=Jumbo`

Step types: `instruction | note | checkpoint`

Side: `RS | WS | null`

Project status: `Planned | In Progress | Finished | Shelved | Abandoned`

Needle type: `Straight | Circular | DPNs`

Notion type: `Tapestry Needle | Crochet Hook | Stitch Markers | Scissors | Cable Needle | Row Counter | Waste Yarn`

**Stitch def ID format**
- Single abbreviations: use the abbreviation as the ID (e.g. `k`, `p`, `sm`, `k2tog`)
- Multi-word entries without abbreviation: use hyphenated lowercase (e.g. `long-tail-cast-on`, `weave-in-ends`, `stockinette`)

---

*Last updated: March 2026*

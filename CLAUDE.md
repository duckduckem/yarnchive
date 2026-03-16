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

**Phase:** Active development. Knitting view spec complete and initial tasks built. Supabase schema finalized. First full pattern dataset (Tolsta Tee, Size 3 F-cup, DK weight) ready to import and test end-to-end.

**What exists:**
- Full schema (`supabase/schema.sql`) — canonical, run this to set up the database
- Data model reference (`docs/data-model.docx`)
- Normalization rules (`docs/normalization-rules.md`)
- Project infrastructure (GitHub, Supabase, Vercel all configured)
- Knitting view spec (`spec/01-knitting-view.md`) and initial implementation
- Test dataset for Tolsta Tee ready to import

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
├── supabase/
│   └── schema.sql               ← canonical schema, run once to set up DB
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

## Database Schema

The canonical schema is in `supabase/schema.sql`. Always refer to that file for the exact column names, types, and relationships. What follows is a summary.

### ID Strategy
- **Pattern library tables** (`pattern`, `pattern_variant`, `pattern_size`, `pattern_step`, `stitch_def`, `repeat_group`) use **TEXT primary keys** — human-readable slugs, e.g. `tolsta`, `tolsta_dk`, `3_f-cup`, `repeat_1`
- **User-space tables** (`users`, `project`, `project_step_state`, etc.) use **UUID primary keys**. `users.id` must match the UUID from Supabase Auth.

### Tables

**Pattern Library (shared, no duplicates across users)**
- `stitch_def` — stitch directory. id=abbreviation or hyphenated slug.
- `pattern` — core pattern record with metadata, ease, sizing guidance
- `pattern_variant` — weight or construction variants (e.g. DK vs Worsted) where steps differ
- `pattern_size` — size variants with finished measurements. Scoped to variant.
- `repeat_group` — groups steps that repeat together as a block. id=`repeat_N`.
- `pattern_step` — individual steps. id=`{pattern_id}-{variant_id}-{size_id}-{step_num}`
- `pattern_yarn` / `pattern_needle` / `pattern_notion` — supply requirements

**User Space (private per user)**
- `users` — app user. id must match Supabase Auth UUID.
- `user_pattern` — user's pattern collection + personal notes
- `stash_yarn` — yarn owned by user
- `stash_needle` — needles owned by user
- `project` — active or completed project. Requires `name` and `status`.
- `project_step_state` — current step, repeat counter, offline cache. One per project.
- `project_yarn` — stash yarns assigned to a project

### Key fields on `pattern_step`
- `step_type` — `instruction | note | checkpoint`
- `section` / `subsection` — grouping for display and navigation
- `step_label` — source pattern reference only (e.g. "Round 1") — not used for navigation
- `side` — `RS | WS | null`
- `instructions_before` — prose only, no stitch markup
- `stitch_instructions` — stitch abbreviations with `[bracket]` markup and `|` line breaks
- `instructions_after` — prose only, no stitch markup
- `repeat_group_id` / `repeat_total` / `repeat_condition` — repeat configuration
- `variant_id` / `size_id` — nullable scope fields

---

## Key Architectural Decisions

**Stitch bracket markup**
Stitch abbreviations use `[bracket]` markup in `stitch_instructions`. Tokens are parsed and rendered as tappable links to `stitch_def`. See Stitch Bracket Parsing below.

**Three-field instruction structure**
`instructions_before` and `instructions_after` are prose only — no stitch abbreviations. `stitch_instructions` contains stitch content with bracket markup only. Any of the three can be null.

**step_type rendering**
- `instruction` — actionable, shown with a completion control
- `note` — informational, displayed differently, no completion action
- `checkpoint` — pauses progress and prompts explicit user confirmation before advancing

**Repeat handling — Model B (expanded steps)**
Repeating steps are stored once with `repeat_total`. When a project is created, the app expands repeats into a flat step list — a step with `repeat_total = 8` becomes 8 steps. Progress counter moves every tap. Secondary UI shows repeat context ("Repeat 3 of 8"). Measurement-based repeats have `repeat_total = null` and repeat until user manually advances.

**Pipe separator for long stitch sequences**
`|` is a line break separator in `stitch_instructions`. Groups of 3–6 stitches per line.
Example: `[sm], [k1], [pm], [k12], [pm], | [k1], [pm], [k38], [pm], | [k1], [pm], [k12]`

**Stitch bracket parsing rules**
1. Exact match on `abbreviation` in `stitch_def` — e.g. `[k]`, `[sm]`, `[m1l]`
2. Pipe syntax for display overrides — `[display text|stitch_def_id]` — e.g. `[Join in the round|join]`
3. Strip trailing digits — e.g. `[k12]` strips `12`, looks up `k`

Abbreviations with embedded digits (e.g. `k2tog`) match exactly before digit stripping is tried.

**Typography rendering**
- Bracket tokens → monospace font, tappable link to stitch directory
- Surrounding prose → regular font
- All numbers in any instruction field → highlighted in accent color automatically

**Pattern variants**
`pattern_variant` is for patterns where the steps themselves differ by variant. `variant_id` is nullable on both `pattern_size` and `pattern_step` — null means applies to all variants.

**step_label as source reference only**
`step_label` stores whatever the source pattern calls a step ("Round 1", "Short Row 2"). It is reference data only — the app navigates by expanded step position, not by step_label.

**Progress display**
- Primary: global step counter ("Step 47 of 312") — moves every tap
- Secondary: repeat context ("Repeat 3 of 11") — shown inside repeat groups
- Tertiary: section breadcrumb ("Yoke › Raglan Increases")

**Offline via PWA**
`project_step_state.cached_steps` holds a JSON snapshot of nearby steps. PWA service worker caches the active project screen.

**Yarn matching logic**
Hard filters: `weight_code` equality + `yardage_remaining` >= pattern yardage for selected size.
Soft filter: fiber content. Post-filter UI: color family, then color name.

**Multi-user ready, single-user first**
All user-owned data is keyed to `user_id`. Auth via Supabase. No schema changes needed to add multi-user later.

---

## Development Principles

**Spec-driven, always.** No feature gets built without a spec.

**MVP focus.** Core knitting experience first. Everything else waits.

**No goldplating.** If it's a good idea but not blocking current work, add it to the backlog.

**Test with real patterns.** Validate features by actually knitting with them.

**Schema is canonical.** `supabase/schema.sql` is the source of truth. If code and schema disagree, fix the code.

**TypeScript everywhere.** No `any` types without a comment explaining why.

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

**ID formats**
- Pattern library text IDs: lowercase, hyphens for multi-word (e.g. `long-tail-cast-on`, `weave-in-ends`)
- Stitch def IDs: abbreviation if one exists (e.g. `k`, `sm`, `k2tog`), otherwise hyphenated slug
- Repeat group IDs: `repeat_` + incrementing integer (e.g. `repeat_1`, `repeat_2`)
- Pattern step IDs: `{pattern_id}-{variant_id}-{size_id}-{step_num}`

---

*Last updated: March 2026*

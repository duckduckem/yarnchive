# Yarnchive — Product

**Last updated:** 2026-09-20

## Vision

Knitting patterns are written inconsistently and are hard to follow on a phone mid-row. Yarnchive turns any pattern into a clear, step-by-step guide you can knit from, one step at a time, never losing your place. Around that core, it keeps your pattern library, yarn and supply stash, and project history in one place, so you can answer "what can I knit with what I have?" and "what size should I make?"

## Who it's for, in phases

1. **Emily only:** personal use. Real knitting drives what gets built.
2. **Beta testers:** a small group with their own accounts and private libraries.
3. **App store subscribers:** iOS and Android via Capacitor, subscription-based.

## Principles

- **The knitting screen is the heart.** Everything else supports it.
- **Build the simplest version that works, then improve it from real use.**
- **Your data is yours.** Every pattern, project, and stash item belongs to a user and is private by default.
- **Respect designers.** Paid patterns are never redistributed. Sharing a paid pattern shares only its name and a link to buy.
- **The look is swappable.** Visual design lives in tokens so it can change without touching screens.

## How to read the catalog

Each feature has an ID (for referencing in specs, commits, and NOW.md), a short description, and the milestone it's planned for (see `ROADMAP.md`). Detail is deliberately uneven: features in the next milestone or two are described fully, later ones briefly. Add detail when a feature's milestone gets close, not before.

| Tier | Milestones |
|---|---|
| Now | M0–M1 |
| Next | M2–M3 |
| Later | M4–M7 |
| Someday | unscheduled |

---

## Patterns (PAT)

| ID | Feature | Detail | When |
|---|---|---|---|
| PAT-01 | Pattern record | Name, designer, free or paid, optional source link, list of sizes. | M1 |
| PAT-02 | CSV import | A spreadsheet template plus a local script that loads a pattern's steps into Supabase and reports row-level errors. Not a UI. | M1 |
| PAT-03 | Original file | The original PDF or HTML stored with the pattern as an appendix, with an "open original" link. Not shown on the knitting screen. | M2 |
| PAT-04 | Cover photo | Default image per pattern, either your own photo or one from the pattern. | M2 |
| PAT-05 | Project photos on pattern | The pattern page shows photos from all your projects of that pattern. | M2 |
| PAT-06 | Parser | Upload PDF or HTML; it converts to structured steps; you review and fix before saving. | M3 |
| PAT-07 | Pattern details | Yarn requirements (quantity may vary by size), needles (size, type, length, what they're for), notions (optional quantity), gauge (stitches and rows, over which stitch, blocked or not). | M4 |
| PAT-08 | Sizes and finished measurements | Each size's finished measurements (which ones depend on the garment type) and the recommended ease. | M4 (size list only in M1) |
| PAT-09 | Personal versions | Save your changes as "Pattern (my version)", linked to the original. The original stays untouched; each project uses one or the other. | M4 |
| PAT-10 | Shared library | A library of free patterns and your own designs available to all users. | Someday |

## Knitting screen (KNIT)

| ID | Feature | Detail | When |
|---|---|---|---|
| KNIT-01 | Step display | Current step prominent, previous and next visible. Shows section, row or round number, and RS/WS where relevant. | M1 |
| KNIT-02 | Stitch tokens | Stitches in an instruction are tappable. Tap to cross one off (strikethrough) as you work it; long-press or tap-and-hold to see its definition. Numbers are highlighted. | M1 |
| KNIT-03 | Size substitution | Steps show only your size's numbers and text. | M1 |
| KNIT-04 | Repeats | Repeat groups with an intro note, a counter ("repeat 3 of 8"), notes that appear only on the last pass, and a checkbox for condition-based repeats ("until piece measures…"). | M1 |
| KNIT-05 | Verify checkpoints | Steps that pause for a stitch-count or measurement check, showing the expected count for your size. | M1 |
| KNIT-06 | Stitch definitions | A global dictionary of short text definitions for stitches and techniques, with per-pattern overrides when a designer defines something differently. | M1 |
| KNIT-07 | Jump to step | Start a project at any step, and jump directly to a step later. | M1 |
| KNIT-08 | Offline | The knitting screen works without a connection. Patterns for active projects are kept on the device; progress and timer sessions save locally and sync when back online. The rest of the app may require a connection. | M2 |
| KNIT-09 | Timer | Runs while the knitting screen is open. Pause button. Auto-stops after a period of no taps (default 10 minutes, adjustable) and counts only up to the last tap. Stored as sessions (start, end). | M2 |
| KNIT-10 | Branching steps | Steps where the knitter chooses a path. Schema supports it from M1; UI later. | Later |
| KNIT-11 | Rich tutorials | Video or diagrams in stitch definitions. Source to be decided. | Someday |
| KNIT-12 | Motif round counter | Track and display which round of a named multi-row stitch pattern (e.g. a 4-round lace or texture repeat) the knitter is on, including through short rows where the row sequence and the motif sequence diverge. | Later |

## Projects (PROJ)

| ID | Feature | Detail | When |
|---|---|---|---|
| PROJ-01 | Create project | Pick a pattern (original or your version) and a size. | M1 |
| PROJ-02 | Save progress | Current step, repeat counters, and checkboxes persist across reloads and devices. | M1 |
| PROJ-03 | Project list | See active projects and open one. A bare list is enough for M1 (two projects). | M1 |
| PROJ-04 | Status and dates | Planned, in progress, finished, shelved, abandoned. Start date and end date. | M2 |
| PROJ-05 | Notes | Free-text notes per project. | M2 |
| PROJ-06 | Photos | Project-level photos. | M2 |
| PROJ-07 | Time and last worked | Total time from timer sessions; "last worked" from the most recent session. No reminders or notifications. | M2 |
| PROJ-08 | Yarn from stash | Optionally assign stash yarn to a project. It shows as "in use" and is only removed from the stash when you confirm at finish. | M5 |

## Fit (FIT)

| ID | Feature | Detail | When |
|---|---|---|---|
| FIT-01 | People and measurements | Profiles for each person you knit for. Measurements stored as individual entries (bust, waist, hip, arm length, foot circumference, foot length, …) so new types can be added without schema changes. | M4 |
| FIT-02 | Size recommendation | Recommends a size from the person's measurements, the pattern's finished measurements, and the desired ease. | M4 |
| FIT-03 | Gauge-based size suggestion | Compare your swatch gauge to the pattern's. If they differ, suggest the size that gives the intended finished measurements at your gauge. No recalculating stitch counts. | M4 |

## Stash (STASH)

| ID | Feature | Detail | When |
|---|---|---|---|
| STASH-01 | Yarn catalog | Brand and line, weight class, yards and grams per skein, fiber. Shared definition that stash items point to. | M5 |
| STASH-02 | Yarn holdings | What you own: yarn, color, dye lot (optional), amount entered in skeins or grams (partial skeins work), yardage calculated. | M5 |
| STASH-03 | Needles | Have or don't have, for fixed and interchangeable needles (size, type, length). | M5 |
| STASH-04 | Notions | Notions with optional quantity. | M5 |
| STASH-05 | Shopping list | What you'd need to buy to knit a given pattern. | Later |

## Search (SRCH)

| ID | Feature | Detail | When |
|---|---|---|---|
| SRCH-01 | Stash match | Patterns you can knit with yarn you have: same weight, enough yardage. | M5 |
| SRCH-02 | Near misses | "You're 80 yards short." | M5 |
| SRCH-03 | Substitutions and fiber | Other weights that still reach gauge; fiber preferences. | M5 |
| SRCH-04 | Other filters | Garment type, difficulty, needles you own, previously knit. | M5 |
| SRCH-05 | Estimated time | Based on your own logged times, once there's enough history. | M5 |

## Platform (PLAT)

| ID | Feature | Detail | When |
|---|---|---|---|
| PLAT-01 | Responsive web | Phone-first layouts from the first screen. | M0 |
| PLAT-02 | Theme tokens | Colors, type, spacing, and radii defined as CSS variables that Tailwind reads. | M0 |
| PLAT-03 | Sign-in (just you) | Supabase Auth, so Row Level Security works from day one. | M0 |
| PLAT-04 | Figma token pipeline | Figma Variables exported as tokens and converted into the app's CSS variables. Switching design systems means swapping the token file. | M6 |
| PLAT-05 | Beta accounts | Sign-up for invited testers; private libraries per user. | M7 |
| PLAT-06 | Mobile apps | Package with Capacitor for iOS and Android. | M7 |
| PLAT-07 | Subscriptions | In-app subscriptions at app store launch. | M7 |
| PLAT-08 | In-app theme picker | Users choose a theme. | Someday |
| PLAT-09 | Backup and export | Export your own data. | Someday |
| PLAT-10 | Sharing | Share a pattern or project. Free patterns can be shared in full; paid patterns share only the name and a purchase link. | Someday |

## Explicitly out of scope

- Reminders and notifications
- Recalculating a pattern's stitch counts for a different gauge

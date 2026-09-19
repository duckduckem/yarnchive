# Yarnchive — Roadmap

**Last updated:** 2026-09-19

## How this works

- Milestones are done in order. Each one ends with something you can actually use while knitting.
- Each task is sized to **one Claude Code session**. Tasks marked **[you]** are done by hand, without Claude Code.
- Feature IDs (PAT-01, KNIT-04, …) refer to `PRODUCT.md`.
- Near milestones are detailed; later ones are outlines. Break a milestone into tasks when it becomes the next one, not before.
- If a task grows beyond one session, split it here and record where you stopped in `NOW.md`.

---

## M0 — Foundation

**Done when:** yarnchive.app shows a sign-in screen, you can sign in on your phone, and a themed placeholder page loads.

| Task | Description |
|---|---|
| M0.1 **[you]** | Archive the old repo, create the new one, commit this doc set, point Vercel at the new repo. Steps in `NOW.md`. |
| M0.2 | Scaffold Vite + React + TypeScript + Tailwind. Set up theme tokens as CSS variables with one default theme (PLAT-02). Phone-first placeholder page (PLAT-01). Confirm the Vercel build and SPA routing work (see the rewrite gotcha in `ARCHITECTURE.md`). |
| M0.3 | New Supabase project. Supabase CLI set up with migrations in `/supabase`. Environment variables locally and in Vercel. |
| M0.4 | Sign-in for you via Supabase Auth (PLAT-03). A protected page that only loads when signed in. Establish the standard RLS policy pattern with one throwaway table, then remove it. |

## M1 — Knit one pattern (two, actually)

**Done when:** you're knitting Nurtured from the app on your phone, progress survives reloads and switching devices, and the socks are imported through the same process with no schema changes (or with changes recorded in `decisions.md`).

| Task | Description |
|---|---|
| M1.1 | **Schema spec** (`specs/schema-v1.md`). Covers patterns, sizes, steps, repeat groups, stitch dictionary with per-pattern overrides, projects, and progress. Must work for both test patterns; resolve the open questions in `DATA-MODEL.md`. Review before any SQL. |
| M1.2 | Migrations and RLS for the spec. Seed the global stitch dictionary with the abbreviations and techniques from both test patterns. |
| M1.3 | CSV template and import script (PAT-02). Local Node script, validates rows, reports errors by row, imports one pattern at a time. Include a short guide to filling in the template. |
| M1.4 **[you]** | Fill in the Nurtured CSV (your size only; see `DATA-MODEL.md`) and import it. Note anything the template made awkward. |
| M1.5 | Knitting screen, part 1: step display, stitch tokens with definitions, size substitution (KNIT-01, 02, 03, 06). |
| M1.6 | Knitting screen, part 2: repeats and verify checkpoints (KNIT-04, 05). |
| M1.7 | Projects: create a project, save progress, start at step N, jump to step, bare project list (PROJ-01, 02, 03, KNIT-07). All progress writes go through one module. |
| M1.8 **[you]** | Fill in and import the socks CSV (both socks). Record any schema or template issues. |
| M1.9 | Fix what M1.4 and M1.8 turned up. Only real problems from real use. |

## M2 — Real knitting companion

**Outline.** Offline knitting screen (KNIT-08), timer (KNIT-09), status and dates (PROJ-04), notes (PROJ-05), project photos and pattern photos (PROJ-06, PAT-04, PAT-05), original file attached (PAT-03), time and last worked (PROJ-07). Needs a short spec for offline sync before building.

## M3 — Parser

**Outline.** PDF or HTML to structured steps, with review-and-fix before saving (PAT-06). Parses into the M1 schema; the Ammi parsed CSV from earlier work and the CSVs you filled in during M1 are validation targets.

**Swing milestone:** if filling in CSVs gets painful, move M3 ahead of M2.

## M4 — Pattern details and fit

**Outline.** Pattern details (PAT-07), sizes with finished measurements (PAT-08), personal versions (PAT-09), people and measurements (FIT-01), size recommendation (FIT-02), gauge-based size suggestion (FIT-03).

## M5 — Stash and search

**Outline.** Yarn catalog and holdings, needles, notions (STASH-01 to 04), yarn assigned to projects (PROJ-08), all search features (SRCH-01 to 05). Shopping list (STASH-05) right after.

## M6 — Design system pipeline

**Outline.** Figma Variables to tokens to CSS variables (PLAT-04). Can start any time after M2, once there are enough screens to judge a theme against.

## M7 — Beta, then app stores

**Outline.** Accounts for beta testers (PLAT-05), then Capacitor packaging (PLAT-06) and subscriptions (PLAT-07).

## Someday

Shared library (PAT-10), rich tutorials (KNIT-11), in-app theme picker (PLAT-08), backup and export (PLAT-09), sharing (PLAT-10).

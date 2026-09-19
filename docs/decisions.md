# Decision Log

A running record of major decisions and why we made them. Add entries at the top. Keep them short: a few sentences each.

Format:
```
## YYYY-MM-DD — Short title
**Decision:** What we chose.
**Why:** Brief reasoning.
**Alternatives considered:** What we didn't pick and why.
```

---

## 2026-09-19 — Tailwind v4 for theme tokens

**Decision:** Use Tailwind v4 (`@tailwindcss/vite`, CSS-native `@theme`) instead of v3 + PostCSS/autoprefixer.

**Why:** Theme tokens are plain CSS variables in `src/styles/theme.css`; Tailwind v4's `@theme inline` maps utility names straight to those variables with no `tailwind.config.js` needed. That file is exactly what M6's Figma pipeline is meant to swap out.

**Alternatives considered:** Tailwind v3. Would work too, but adds a JS config file and a PostCSS step for no benefit here.

---

## 2026-09-19 — True fresh start

**Decision:** Archive the old repo (`yarnchive-archive`), start a new repo and a new Supabase project, and keep Vercel and the domains. The May 2026 start isn't resumed.

**Why:** After a long pause, the state of the old repo and database was unclear. Planning for the end state from a clean slate is faster than reconstructing where things stopped. Earlier design decisions carry forward through `DATA-MODEL.md`, not through old files.

**Alternatives considered:** Resuming the May repo. Rejected because nobody could say what was in it.

---

## 2026-09-19 — Doc set built for re-entry

**Decision:** Split planning into `NOW.md` (read first, updated every session), `PRODUCT.md`, `ROADMAP.md`, `ARCHITECTURE.md`, `DATA-MODEL.md`, and this log. `docs/first-task.md` is retired.

**Why:** The hard part of this project has been restarting after breaks. One file that always names the next task removes that cost.

---

## 2026-09-19 — Test patterns: Nurtured and I'm So Basic Sock

**Decision:** M1 is validated against the two patterns currently on the needles. The sweater is imported first, the socks second.

**Why:** Tolsta is finished. The two patterns stress the schema in different ways (sizes, shaping, stitch patterns, short rows vs. heel construction, color changes). The sweater will be on the needles longer.

---

## 2026-09-19 — CSV import for M1 pattern entry

**Decision:** Patterns are entered by filling in a CSV template and loading it with a local script. Supersedes hand-entering through the Supabase interface.

**Why:** New patterns need to get into the app regularly now. A template plus script is fast enough to keep knitting while the parser waits, and it isn't a data-entry UI.

**Alternatives considered:** Parser first (too big to wait for), hand entry (too slow for two patterns and counting).

---

## 2026-09-19 — Patterns are user-owned; no shared library for now

**Decision:** Every pattern belongs to a user and uses a UUID, with a readable slug as an extra field. Supersedes the earlier plan of a shared library with slugs as IDs.

**Why:** Paid patterns can't be redistributed, so each user's uploads stay private. Personal versions also belong to a user.

**Alternatives considered:** Shared library. Deferred to Someday, limited to free patterns and original designs.

---

## 2026-09-19 — End-state foundations from day one

**Decision:** Build in `user_id` + RLS on every user-owned table, theme tokens as CSS variables, a single module for progress writes, and phone-first responsive layouts, from the first screen.

**Why:** Each is cheap now and expensive to retrofit. They're listed as explicit exceptions to the "no flexibility for cases that don't exist yet" rule in `CLAUDE.md`.

---

## 2026-09-19 — Web first, Capacitor later

**Decision:** Build a responsive web app; package it with Capacitor for the app stores in M7.

**Why:** No rewrite needed to reach the app stores, and nothing about the planned features requires native code.

---

## 2026-09-19 — Offline knitting screen in M2

**Decision:** Offline support covers the knitting screen only and ships in M2. M1 saves progress directly to Supabase, but through one module.

**Why:** Offline isn't needed to prove the schema and screen work. Scoping it to the knitting screen covers the real need (not losing your place) without making the whole app work offline.

---

## 2026-09-19 — Personal pattern versions

**Decision:** Changing a pattern creates a personal version linked to the original. Each project uses either the original or a version.

**Alternatives considered:** Editing the original in place (loses the original and breaks past projects' step history); per-project edits only (doesn't carry changes to the next time you knit it).

---

## 2026-09-19 — Stitch dictionary: global with per-pattern overrides

**Decision:** One global dictionary, with overrides per pattern when a designer defines an abbreviation differently. Short text definitions first; richer tutorials later.

---

## 2026-09-19 — Fit: size recommendation, gauge suggests size

**Decision:** Recommend a size from measurements and ease. When your gauge differs from the pattern's, suggest the size that gives the intended finished measurements. Stitch counts are never recalculated.

**Why:** Recalculating a whole pattern for a new gauge is a very large project, because shaping and stitch patterns don't scale evenly.

---

## 2026-09-19 — Time tracking as sessions

**Decision:** The timer records sessions (start, end) while the knitting screen is open, with pause and auto-stop after inactivity trimmed to the last tap. Project totals and "last worked" come from the sessions.

---

## 2026-09-19 — Stash: catalog plus holdings; reserve, then deduct

**Decision:** Yarn is a catalog entry (brand/line, weight, yards and grams per skein, fiber) plus holdings (color, lot, amount). Yarn assigned to a project is marked in use and only removed when the knitter confirms at finish.

---

## 2026-05-24 — Knitting screen before parser

**Decision:** First milestone is a working knitting screen against real Supabase data, not the parser.

**Why:** Designing the knitting screen against a real pattern forces the data model to confront what the UI actually needs. The parser then has a concrete target to parse into.

**Alternatives considered:** Parser-first. Deferred because we'd be designing the parser's output schema in the abstract, and the schema is the expensive thing to get wrong.

---

## 2026-05-24 — Don't port the Tolsta prototype

**Decision:** Leave the hardcoded `tolsta.html` prototype alone. The new knitting screen is designed fresh from the data model up.

**Why:** The prototype's value was proving the interaction model works; that's done. Porting it would anchor the new UI to prototype-era shortcuts.

---

## 2026-05-24 — Stack: React + Vite + Tailwind + Supabase + Vercel

**Decision:** Continuing with the stack established before this rebuild. TypeScript throughout (confirmed 2026-09-19).

**Why:** Already working, no reason to change.

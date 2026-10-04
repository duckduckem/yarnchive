# NOW

**Coming back after a break? Read only this file.** It says where things stand and the single next thing to do.

**Last updated:** 2026-10-4 (M1.6)

---

## Where things stand

- M0.1 done (2026-09-19): new `yarnchive` repo created with the doc set; old repo archived as `yarnchive-archive`; Vercel pointed at the new repo.
- M0.2 done (2026-09-19): Vite + React + TS scaffolded, Tailwind v4 with theme tokens as CSS variables (`src/styles/theme.css`), phone-first placeholder page, `.env.example`, `vercel.json` SPA rewrite. Merged and confirmed live at yarnchive.app — styling and SPA routing fallback both verified in the browser. (Along the way: yarnchive.app was briefly serving a 9-day-stale cached deployment unrelated to this repo — resolved itself on the next deploy, but worth a glance if a future deploy looks stale.)
- M0.3 done (2026-09-19): Supabase CLI added as a dev dependency (`npx supabase`), `/supabase` initialized and linked to the new project. `@supabase/supabase-js` added with a single client module at `src/lib/supabase.ts`. Migrations workflow confirmed in `docs/ARCHITECTURE.md` (CLI + `/supabase/migrations`, no dashboard edits) and recorded in `docs/decisions.md`.
- M0.4 done (2026-09-20): email/password sign-in via Supabase Auth, gating the app (`src/App.tsx`, `src/components/SignIn.tsx`, `src/components/Home.tsx`); signed-out visitors see only the sign-in form. Standard `user_id` + RLS pattern proven with a throwaway table (created and dropped via migrations) and recorded in `docs/ARCHITECTURE.md` for M1.2 to copy. Password sign-in chosen over magic link/OTP so nothing needs deep-link handling when Capacitor arrives in M7 — see `docs/decisions.md`.
- **M0 is complete.** yarnchive.app shows a sign-in screen, sign-in works on your phone, and a themed placeholder loads once signed in.
- Test patterns for M1: Nurtured (sweater) and I'm So Basic Sock. Being knit from paper for now.
- M1.1 session A done (2026-09-20): resolved all 14 open questions in `DATA-MODEL.md` and agreed the M1 table outline (`patterns`, `pattern_sizes`, `stitch_dictionary`, `pattern_stitch_entries`, `repeat_groups`, `steps`, `projects`, `project_progress`). Decisions recorded in `docs/decisions.md`.
- M1.1 session B done (2026-09-20): wrote `specs/schema-v1.md` — full field/type/relationship/security spec for all 8 M1 tables, exact JSON shapes, M1.3 validation rules, and worked examples against both test patterns. Reviewed and revised: two repeat-group shapes instead of three (count vs. condition), size-varying repeat conditions via a new `repeat_groups.size_params`, a corrected sleeve-increase example, a fixed sock leg-setup example, an "ending row alignment" convention (worked through on the heel flap), and composite foreign keys so a child row's `user_id` can never disagree with its parent's. `docs/DATA-MODEL.md` now points to the spec instead of duplicating table info; added "motif round counter" to `docs/PRODUCT.md` as a Later idea. **M1.1 is complete and reviewed.**
- M1.2 done (2026-09-20): migrations for all 8 M1 tables pushed to Supabase (`patterns`, `pattern_sizes`, `stitch_dictionary`, `pattern_stitch_entries`, `repeat_groups`, `steps`, `projects`, `project_progress`), composite FKs and RLS per `specs/schema-v1.md`. `stitch_dictionary` seeded with 22 entries (11 stitches, 11 techniques) covering both test patterns' abbreviations plus named finishing techniques (Kitchener Stitch, Magic Loop, Pick Up and Knit, Twisted German/Long-Tail Cast On) — read from the actual pattern PDFs, original wording, nothing copied from either glossary. RLS verified against the live project: signed-in reads/writes are scoped to your own rows (cross-user update/delete/insert-as-another-user all blocked), signed-out sees zero rows, `stitch_dictionary` is readable but not writable. TypeScript types generated to `src/types/database.ts` (`kind`/`step_type`/`side` come through as plain `string`, not literal unions — Supabase's generator doesn't narrow on `check` constraints, only real Postgres enums). Two decisions logged in `docs/decisions.md`: check constraints for fixed-value columns vs. import-script validation, and `project_progress.current_step_id` resets to null on delete rather than cascading. **M1.2 is complete.** One heads-up: local `main` and `origin/main` diverged during this session (an unattributed commit appeared and was pushed on its own — I amended its message locally rather than leave `"M1.2"` as the message, now `81d588e`); you'll need to force-push from GitHub Desktop next time you sync.
- M1.3 done (2026-09-19): CSV template (5 files) + filling guide (`scripts/template/`) and the import script (`scripts/import-pattern.ts`, `npm run import -- --dir <folder> [--dry-run] [--replace]`), covering every validation rule in `specs/schema-v1.md` §6 except rule 4 (documented instead, per the spec's own note that it isn't machine-checkable). A tiny made-up "Test Swatch" fixture (`scripts/test/fixture/`) exercises every tricky case from spec §7 and doubles as the guide's worked example and the test input. All 25 tests pass (`npm run test:import`), including the live-DB path (dry run, import, rejected re-import, `--replace`) against the real Supabase project. New dev deps: `tsx`, `csv-parse`, `postgres`, `@types/node`. Two gotchas hit and fixed along the way, worth knowing about: the DB client had no connection/query timeouts, so a bad connection string (a stray space in the password) or a held-open connection during the test's subprocess spawns just hung silently instead of erroring — fixed with `connect_timeout`/`statement_timeout`/`lock_timeout` and by not holding a connection open across subprocess calls; and the real Supabase Auth user (from M0.4) is `emschro@pm.me`, not the email tied to the Claude account used for these sessions — `IMPORT_USER_EMAIL` in `.env.local` is set correctly now. **M1.3 is complete.**
- M1.4 done (partial: sizes 1-4 through join body and sleeves), including two updates to the schema.
- M1.5 done (2026-10-04): knitting screen part 1 — step display, size substitution, tappable moves, definitions; temporary route `/knit/:slug/:size`.
- M1.6 done (2026-10-04): repeats and checkpoints (KNIT-04, 05). Spec `specs/knit-navigation.md`; pure logic `src/lib/knitNav.ts` (13 tests, `npm run test:app`); progress held in memory behind `src/lib/progress.ts` (`useProgress`), in the `project_progress` shape, for M1.7 to persist. Walked Nurtured size 1 in the browser (75 steps): the 7-pass sleeve group, Previous across passes, and the breakdown checkpoint with confirm gating all work. The condition-group display (checkbox, "Repeat 3" with no total) and `last_repeat_note` are covered by unit tests only, not yet seen in the browser — Nurtured has neither; the sock heel flap in M1.8 will be the first real check. Decisions logged in `docs/decisions.md`.

## Next task

**M1.7** — projects: create a project, save progress, start at step N, jump to step, bare project list (PROJ-01, 02, 03, KNIT-07). Start by swapping the key in `src/lib/progress.ts` from `slug:size` to a project id and persisting to `project_progress` from inside that file; `KnitScreen` should not need to change. Per CLAUDE.md, spec first (project creation flow, jump-to-step).

## Open questions (answer when convenient)

- Nurtured size 1 has a body checkpoint (step 71 in the knitting screen) with no `stitch_count`; it shows "⚠ expected count missing". Fill it in the CSV and re-import with `--replace` when convenient.
- The knitting screen assumes a repeat group's steps are contiguous in `step_order`; the importer doesn't check that. Worth a validation rule if M1.8 data ever breaks it.

---

## End-of-session ritual

Before you close any work session, even a 20-minute one, update this file:

1. **Where things stand:** one or two lines on what changed.
2. **Next task:** the single next thing, specific enough to start cold.
3. **Open questions:** anything unresolved.
4. Update the date at the top.

If you stopped mid-task, say exactly where: "M1.3: import script parses rows, validation not written yet."

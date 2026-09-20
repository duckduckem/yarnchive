# NOW

**Coming back after a break? Read only this file.** It says where things stand and the single next thing to do.

**Last updated:** 2026-09-20

---

## Where things stand

- M0.1 done (2026-09-19): new `yarnchive` repo created with the doc set; old repo archived as `yarnchive-archive`; Vercel pointed at the new repo.
- M0.2 done (2026-09-19): Vite + React + TS scaffolded, Tailwind v4 with theme tokens as CSS variables (`src/styles/theme.css`), phone-first placeholder page, `.env.example`, `vercel.json` SPA rewrite. Merged and confirmed live at yarnchive.app — styling and SPA routing fallback both verified in the browser. (Along the way: yarnchive.app was briefly serving a 9-day-stale cached deployment unrelated to this repo — resolved itself on the next deploy, but worth a glance if a future deploy looks stale.)
- M0.3 done (2026-09-19): Supabase CLI added as a dev dependency (`npx supabase`), `/supabase` initialized and linked to the new project. `@supabase/supabase-js` added with a single client module at `src/lib/supabase.ts`. Migrations workflow confirmed in `docs/ARCHITECTURE.md` (CLI + `/supabase/migrations`, no dashboard edits) and recorded in `docs/decisions.md`.
- M0.4 done (2026-09-20): email/password sign-in via Supabase Auth, gating the app (`src/App.tsx`, `src/components/SignIn.tsx`, `src/components/Home.tsx`); signed-out visitors see only the sign-in form. Standard `user_id` + RLS pattern proven with a throwaway table (created and dropped via migrations) and recorded in `docs/ARCHITECTURE.md` for M1.2 to copy. Password sign-in chosen over magic link/OTP so nothing needs deep-link handling when Capacitor arrives in M7 — see `docs/decisions.md`.
- **M0 is complete.** yarnchive.app shows a sign-in screen, sign-in works on your phone, and a themed placeholder loads once signed in.
- Test patterns for M1: Nurtured (sweater) and I'm So Basic Sock. Being knit from paper for now.

## Next task

**M1.1: Schema spec (`specs/schema-v1.md`).** Covers patterns, sizes, steps, repeat groups, stitch dictionary with per-pattern overrides, projects, and progress. Must work for both test patterns; resolve the open questions in `docs/DATA-MODEL.md`. Review before any SQL. See `docs/ROADMAP.md`.

## Open questions (answer when convenient)

_None right now._

---

## End-of-session ritual

Before you close any work session, even a 20-minute one, update this file:

1. **Where things stand:** one or two lines on what changed.
2. **Next task:** the single next thing, specific enough to start cold.
3. **Open questions:** anything unresolved.
4. Update the date at the top.

If you stopped mid-task, say exactly where: "M1.3: import script parses rows, validation not written yet."

# NOW

**Coming back after a break? Read only this file.** It says where things stand and the single next thing to do.

**Last updated:** 2026-09-19

---

## Where things stand

- M0.1 done (2026-09-19): new `yarnchive` repo created with the doc set; old repo archived as `yarnchive-archive`; Vercel pointed at the new repo.
- M0.2 done (2026-09-19): Vite + React + TS scaffolded, Tailwind v4 with theme tokens as CSS variables (`src/styles/theme.css`), phone-first placeholder page, `.env.example`, `vercel.json` SPA rewrite. Merged and confirmed live at yarnchive.app — styling and SPA routing fallback both verified in the browser. (Along the way: yarnchive.app was briefly serving a 9-day-stale cached deployment unrelated to this repo — resolved itself on the next deploy, but worth a glance if a future deploy looks stale.)
- Test patterns for M1: Nurtured (sweater) and I'm So Basic Sock. Being knit from paper for now.

## Next task

**M0.3: New Supabase project.** Supabase CLI set up with migrations in `/supabase`. Environment variables locally and in Vercel. See `docs/ROADMAP.md`.

## Open questions (answer when convenient)

- Anything in the old Supabase project worth keeping? Probably not. Just confirm before deleting it. - Nothing worth keeping

---

## End-of-session ritual

Before you close any work session, even a 20-minute one, update this file:

1. **Where things stand:** one or two lines on what changed.
2. **Next task:** the single next thing, specific enough to start cold.
3. **Open questions:** anything unresolved.
4. Update the date at the top.

If you stopped mid-task, say exactly where: "M1.3: import script parses rows, validation not written yet."

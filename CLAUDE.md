# Working Agreements for Claude Code

This file tells Claude Code how to collaborate on Yarnchive. Read it at the start of every session.

## Start and end of every session

**Start:** Read `NOW.md` first. It names the current task. Then read only the docs that task needs: usually the relevant section of `docs/ROADMAP.md` and any spec in `/specs` it points to.

**End:** Before finishing, propose an update to `NOW.md` (where things stand, next task, open questions) and, if a decision was made, a new entry for `docs/decisions.md`. Show them to me; don't just write them.

**One task per session.** If a task turns out bigger than one session, stop at a clean point, record exactly where in `NOW.md`, and split the task in the roadmap.

## How we work

**Plan before doing.** Default to plan mode: propose what you'll do, wait for approval, then execute.

**Commit after each logical change.** Small, focused commits with clear messages (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).

**Spec before code for anything non-trivial.** New data models, parser rules, multi-step flows: write the spec in `/specs` first, get it approved, then implement. The spec is the source of truth; code follows it.

**Schema changes go through migrations.** Never change the database by hand in the dashboard; write a migration in `/supabase/migrations`.

**Ask before adding dependencies.** New npm packages, Supabase extensions, or services: surface them before installing.

**Ask before major architectural moves.** New top-level folders, patterns, or state management approaches: propose first.

**Don't push or open PRs from the terminal.** Stop after committing and tell me; I push and open PRs with GitHub Desktop.

## What I'm trying to avoid

I have a known tendency to goldplate. Push back when you see it:

- Polishing UI before the feature works end-to-end
- Building data-entry UIs when CSV import or a script would do
- Adding configuration or flexibility for cases that don't exist yet *(except the listed end-state foundations below)*
- Refactoring into reusable components before there's real repetition
- Handling edge cases that haven't come up

If you think I'm goldplating, say so. "Do we need this now, or can we test the simpler version first?" is the right question.

## What's worth doing right

- **Data integrity over efficiency.** Step counts must reflect actual knitting steps. Don't optimize away records the UI needs.
- **Schema decisions.** Expensive to change later; think them through and write them down.
- **Type safety.** TypeScript everywhere. No `any` without a comment explaining why.

### End-state foundations (build these in from the start)

These look like "flexibility for cases that don't exist yet," but they're deliberate. They're cheap now and painful to retrofit:

- **User ownership:** every user-owned table has `user_id` and Row Level Security policies, even while I'm the only user.
- **Theme tokens:** components use Tailwind classes that map to CSS variables (`bg-surface`, `text-accent`). No hard-coded colors, fonts, or spacing values in components.
- **One path for progress writes:** all knitting-progress and timer writes go through a single module, so offline sync can be added in M2 without touching the UI.
- **Responsive web:** every screen works on a phone first; the app will be packaged with Capacitor later.

## Current phase

See `NOW.md` for the exact task and `docs/ROADMAP.md` for the milestone. The broad goal right now: **the smallest thing that lets me knit Nurtured and the socks from real data in the app.** Not "build the app."

## Private files

Never commit anything from `/patterns-private/`. Pattern PDFs are licensed for personal use only.

## When you're unsure

Ask. Short questions are cheap. Wrong assumptions are expensive.

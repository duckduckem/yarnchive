# NOW

**Coming back after a break? Read only this file.** It says where things stand and the single next thing to do.

**Last updated:** 2026-09-19

---

## Where things stand

- Planning is done. The full doc set (this file, README, CLAUDE.md, and everything in `/docs`) was drafted on 2026-09-19.
- Nothing is built in the new repo yet.
- The old repo and the old Supabase project are being retired, not migrated (see `docs/decisions.md`, 2026-09-19 — True fresh start).
- Test patterns for M1: **Nurtured** (sweater) and **I'm So Basic Sock** (socks). Both are already on the needles and being knit from paper for now.

## Next task

**M0.1 — New repo + docs** *(you, no Claude Code, ~30 min)*

1. On GitHub, rename the current repo to `yarnchive-archive`.
2. Create a new empty repo named `yarnchive`.
3. Clone it locally (don't use the web uploader; it flattens folders).
4. Copy in this doc set, keeping the folder structure.
5. Create `/patterns-private/` locally, add it to `.gitignore`, and put the two pattern PDFs there. Pattern PDFs never get committed.
6. Commit and push.
7. In Vercel, point the existing project at the new repo. It's fine if the build fails until M0.2.

**Then:** M0.2 — scaffold the app (see `docs/ROADMAP.md`).

## Open questions (answer when convenient)

- Which size are you knitting for Nurtured, and which for the socks? M1 only needs your sizes entered.
- Roughly where are you in each pattern? It decides how far "start at step N" needs to jump.
- Anything in the old Supabase project worth keeping? Probably not. Just confirm before deleting it.

---

## End-of-session ritual

Before you close any work session, even a 20-minute one, update this file:

1. **Where things stand:** one or two lines on what changed.
2. **Next task:** the single next thing, specific enough to start cold.
3. **Open questions:** anything unresolved.
4. Update the date at the top.

If you stopped mid-task, say exactly where: "M1.3: import script parses rows, validation not written yet."

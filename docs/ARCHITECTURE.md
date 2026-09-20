# Yarnchive — Architecture

**Last updated:** 2026-09-19

Items marked **(proposed)** are the plan but haven't been confirmed in practice yet. Confirm or change them in the milestone noted, and record the outcome in `decisions.md`.

## Services and accounts

| Service | Used for | Notes |
|---|---|---|
| GitHub | Code and docs | Repo `yarnchive`. Old repo renamed `yarnchive-archive`. Clone and push locally; the web uploader flattens folders. |
| Vercel | Hosting | Deploys from `main`. Preview deploys for branches. |
| Supabase | Postgres database, Auth, file Storage | New project created in M0.3; old project retired. |
| Porkbun | Domains and DNS | yarnchive.app and yarnchive.com, both pointed at Vercel. |
| Figma | Design system and tokens | From M6. |
| Apple / Google developer accounts | App store distribution | From M7. |

## Frontend

- React + Vite + TypeScript + Tailwind CSS.
- Phone-first, responsive layouts. The same code will run in a Capacitor wrapper later, so avoid anything that only works in a desktop browser.
- Single-page app with client-side routing.

## Theming

- Every visual value (colors, fonts, font sizes, spacing, radii, shadows) is a CSS variable, defined once per theme.
- Tailwind is configured to read those variables, so components use names like `bg-surface`, `text-accent`, `rounded-card`. Components never contain raw colors or pixel values for themeable properties.
- M0 ships one default theme, written by hand.
- **M6:** Figma Variables (one mode or collection per theme) export as a tokens file, and a small build step turns that file into the CSS variables. Switching design systems means swapping the token file. An in-app theme picker later just switches which set of variables is active.

## Data and auth

- Supabase Postgres. Schema is defined in `specs/` and implemented as **migrations in `/supabase/migrations`** via the Supabase CLI. No manual schema edits in the dashboard.
- Every user-owned table has a `user_id` column that defaults to the signed-in user, plus Row Level Security policies limiting rows to their owner.
- IDs are UUIDs. Patterns also have a readable `slug` field.
- Shared reference data (the global stitch dictionary) is readable by all signed-in users and editable only through migrations or seeds.
- Auth: Supabase Auth, email + password (`signInWithPassword`). M0 has one user (you). Beta testers and public sign-up come in M7. Chosen over magic link and email-OTP because it needs no redirect URL or deep-link handling — that machinery would otherwise have to be rebuilt for Capacitor's custom URL scheme in M7.

### Standard RLS pattern

Confirmed working in M0.4 with a throwaway table, then dropped. Every user-owned table (starting with M1.2) copies this shape:

```sql
create table example (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- ...other columns
  created_at timestamptz not null default now()
);

alter table example enable row level security;

create policy "select own rows" on example
  for select using (auth.uid() = user_id);

create policy "insert own rows" on example
  for insert with check (auth.uid() = user_id);

create policy "update own rows" on example
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own rows" on example
  for delete using (auth.uid() = user_id);
```

The `default auth.uid()` on `user_id` means inserts never need to pass it explicitly — the client just inserts the row's own data. Signed out (no JWT), every select returns zero rows rather than erroring, since `auth.uid()` is null and matches nothing.

## File storage

- Supabase Storage, private buckets **(proposed, confirm in M2)**:
  - `pattern-files`: original PDFs and HTML
  - `photos`: project photos and pattern cover photos
- Access controlled per user, like the tables.
- Pattern files are never committed to Git. Locally they live in `/patterns-private/` (gitignored).

## Pattern entry

- **M1:** CSV template filled in by hand, loaded with a local Node script in `/scripts` that validates each row and reports errors.
- **M3:** Parser, which converts PDF or HTML into the same structure, with a review step.

## Offline (M2)

- Scope: the knitting screen only. Patterns for active projects are cached on the device; progress, checkboxes, and timer sessions are written locally first and synced when a connection returns.
- Everything else (library, stash, search) may require a connection.
- Preparation from M1: all progress and timer writes go through one module, so this can be added without changing the UI.
- The storage library and conflict rules get a short spec at the start of M2.

## Mobile (M7)

- Package the web app with Capacitor for iOS and Android. No rewrite.
- Subscriptions via the app stores' in-app purchase systems; details at M7.

## Environments and configuration

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local`, Vercel | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env.local`, Vercel | Public client key (safe in the browser; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` only, never in Vercel frontend vars | Used by the local import script. Never committed, never shipped to the browser. |

`.env.example` lists the names with no values.

## Known gotchas

- **Vercel rewrites:** a catch-all SPA rewrite in `vercel.json` intercepts static files unless explicit exceptions are listed before the catch-all.
- **GitHub web uploader** flattens folder structure. Always clone and push locally.
- **Vercel builds fail** until a Vite project exists in the repo. Expected between M0.1 and M0.2.

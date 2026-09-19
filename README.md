# Yarnchive

A knitting pattern companion: follow any pattern step by step while you knit, and manage your patterns, stash, and projects around that.

**Live app:** [yarnchive.app](https://yarnchive.app) (also yarnchive.com)

## Start here

| If you want to know… | Read |
|---|---|
| Where things stand and what to do next | [`NOW.md`](NOW.md) |
| Everything the app will do, with priorities | [`docs/PRODUCT.md`](docs/PRODUCT.md) |
| The order we're building it in | [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| How it's built, hosted, and configured | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Data model decisions and open schema questions | [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) |
| Why things are the way they are | [`docs/decisions.md`](docs/decisions.md) |
| How Claude Code should work in this repo | [`CLAUDE.md`](CLAUDE.md) |

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Storage)
- **Hosting:** Vercel
- **Domains:** Porkbun (registrar + DNS), pointing to Vercel
- **Later:** Capacitor to package the web app for iOS and Android

## Getting started

```bash
npm install
npm run dev
```

Environment variables (see `.env.example`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Project structure

```
NOW.md              Where things stand + next task (read first)
CLAUDE.md           Working agreements for Claude Code
/docs               Product, roadmap, architecture, data model, decision log
/specs              Design specs, written before the code they describe
/src                App source
/supabase           Database migrations (from M0.3)
/scripts            Local scripts, e.g. CSV pattern import (from M1.3)
/patterns-private   Pattern PDFs and CSVs, local only, gitignored
```

## Pattern files are never committed

Paid patterns are licensed for personal use. Keep PDFs and filled-in CSVs in `/patterns-private/`, which is gitignored.

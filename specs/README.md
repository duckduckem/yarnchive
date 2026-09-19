# Specs

Design specs for major decisions, written before the code they describe.

Each spec is a markdown file describing what something does, how it's structured, and why. Specs are the source of truth: code follows the spec, not the other way around.

Things that get specs:
- Data models (pattern schema, project schema)
- Parser rules (stitch token resolution, repeat handling)
- Multi-step flows (creating a project, navigating the knitting screen)
- Offline sync (M2)

Things that don't:
- Single-component UI tweaks
- Bug fixes
- Refactors that don't change behavior

First spec to write: `schema-v1.md` (roadmap task M1.1), using `docs/DATA-MODEL.md` as input.

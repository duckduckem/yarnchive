import type { DictionaryEntry } from "./model.ts";

export interface TokenResolution {
  token: string;
  resolved: boolean;
  /** "pattern" when matched in this pattern's own stitch_entries.csv, "global" for stitch_dictionary. */
  source?: "pattern" | "global";
}

function lookup(
  abbreviation: string,
  patternEntries: DictionaryEntry[],
  globalEntries: DictionaryEntry[],
): { source: "pattern" | "global" } | null {
  if (patternEntries.some((e) => e.abbreviation === abbreviation)) return { source: "pattern" };
  if (globalEntries.some((e) => e.abbreviation === abbreviation)) return { source: "global" };
  return null;
}

const PIPE_SYNTAX = /^\[(.+)\|(.+)\]$/;

/**
 * Resolution order (specs/schema-v1.md §1): exact match, checking this
 * pattern's own entries before the shared dictionary -> pipe syntax
 * `[display|id]` -> trailing-digit stripping (`k12` looks up `k`).
 * `token` should already be lowercased/trimmed (lib/normalize.ts).
 */
export function resolveToken(
  token: string,
  patternEntries: DictionaryEntry[],
  globalEntries: DictionaryEntry[],
): TokenResolution {
  const exact = lookup(token, patternEntries, globalEntries);
  if (exact) return { token, resolved: true, source: exact.source };

  const pipeMatch = token.match(PIPE_SYNTAX);
  if (pipeMatch) {
    const id = pipeMatch[2].trim();
    const viaPipe = lookup(id, patternEntries, globalEntries);
    if (viaPipe) return { token, resolved: true, source: viaPipe.source };
  }

  const stripped = token.replace(/\d+$/, "");
  if (stripped !== token && stripped.length > 0) {
    const viaStrip = lookup(stripped, patternEntries, globalEntries);
    if (viaStrip) return { token, resolved: true, source: viaStrip.source };
  }

  return { token, resolved: false };
}

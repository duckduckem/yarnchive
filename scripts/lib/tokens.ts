import { PLAIN_ACTIONS } from "./actions.ts";
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
 * Lookup is case-insensitive: `token` is lowercased here, and `token` in the
 * result is returned as given.
 */
export function resolveToken(
  rawToken: string,
  patternEntries: DictionaryEntry[],
  globalEntries: DictionaryEntry[],
): TokenResolution {
  const token = rawToken.trim().toLowerCase();
  const exact = lookup(token, patternEntries, globalEntries);
  if (exact) return { token: rawToken, resolved: true, source: exact.source };

  const pipeMatch = token.match(PIPE_SYNTAX);
  if (pipeMatch) {
    const id = pipeMatch[2].trim();
    const viaPipe = lookup(id, patternEntries, globalEntries);
    if (viaPipe) return { token: rawToken, resolved: true, source: viaPipe.source };
  }

  // A trailing `{NAME}` placeholder counts as a number, so `k{a}` resolves like `k12`.
  const stripped = token.replace(/(\d+|\{[^{}]+\})$/, "");
  if (stripped !== token && stripped.length > 0) {
    const viaStrip = lookup(stripped, patternEntries, globalEntries);
    if (viaStrip) return { token: rawToken, resolved: true, source: viaStrip.source };
  }

  return { token: rawToken, resolved: false };
}

export interface MoveClassification {
  /** "abbreviation": leading abbreviation resolved; "action": allowlisted plain action; "unknown": neither (a warning). */
  kind: "abbreviation" | "action" | "unknown";
  /** The leading unit that was looked up: the first whitespace-delimited word, or a leading `[display|id]`. */
  firstWord: string;
  source?: "pattern" | "global";
}

/**
 * Classifies one move from `stitch_instructions` by its first word
 * (specs/schema-v1.md §1): a known abbreviation wins, then the plain-action
 * allowlist, otherwise unknown. Case-insensitive; the move text is untouched.
 */
export function classifyMove(
  move: string,
  patternEntries: DictionaryEntry[],
  globalEntries: DictionaryEntry[],
): MoveClassification {
  const trimmed = move.trim();
  const firstWord = trimmed.startsWith("[")
    ? (trimmed.match(/^\[[^\]]*\]/)?.[0] ?? trimmed.split(/\s+/)[0])
    : trimmed.split(/\s+/)[0];

  const resolution = resolveToken(firstWord, patternEntries, globalEntries);
  if (resolution.resolved) return { kind: "abbreviation", firstWord, source: resolution.source };
  if (PLAIN_ACTIONS.has(firstWord.toLowerCase())) return { kind: "action", firstWord };
  return { kind: "unknown", firstWord };
}

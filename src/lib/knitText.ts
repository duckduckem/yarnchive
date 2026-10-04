// Pure logic for the knitting screen (specs/schema-v1.md §1 and §5): size
// filtering, placeholder substitution, and move/abbreviation lookup. No React.
// The lookup rules mirror scripts/lib/tokens.ts, which lives outside `src`.
import type { Database, Json } from "../types/database.ts";

export type Step = Database["public"]["Tables"]["steps"]["Row"];

export interface Definition {
  abbreviation: string;
  name: string;
  definition: string;
  link: string | null;
  source: "pattern" | "global";
}

export interface DictionaryRow {
  abbreviation: string;
  name: string;
  definition: string;
  link: string | null;
}

export interface Dictionary {
  pattern: Map<string, Definition>;
  global: Map<string, Definition>;
}

/** A run of text, or a `{NAME}` placeholder with no value for the chosen size. */
export type Segment =
  | { kind: "text"; text: string }
  | { kind: "missing"; name: string };

/** A segment with numbers split out, for highlighting. */
export type Piece =
  | { kind: "text" | "number"; text: string }
  | { kind: "missing"; name: string };

export interface MoveWord {
  pieces: Piece[];
  /** Set when this word is a recognized abbreviation. */
  definition: Definition | null;
}

/** Steps that apply to the chosen size, in step_order. Null/empty applies_to_sizes means every size. */
export function stepsForSize(steps: Step[], size: string): Step[] {
  return steps
    .filter((s) => !s.applies_to_sizes || s.applies_to_sizes.length === 0 || s.applies_to_sizes.includes(size))
    .sort((a, b) => a.step_order - b.step_order);
}

const PLACEHOLDER = /\{([^{}]+)\}/g;

function paramValue(sizeParams: Json | null, name: string, size: string): string | null {
  if (!sizeParams || typeof sizeParams !== "object" || Array.isArray(sizeParams)) return null;
  const perSize = sizeParams[name];
  if (!perSize || typeof perSize !== "object" || Array.isArray(perSize)) return null;
  const value = perSize[size];
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

/** Fills `{NAME}` from size_params for the size. Names are case-sensitive; a missing value becomes a visible `missing` segment. */
export function fillPlaceholders(text: string, sizeParams: Json | null, size: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(PLACEHOLDER)) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    const value = paramValue(sizeParams, m[1], size);
    out.push(value === null ? { kind: "missing", name: m[1] } : { kind: "text", text: value });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** Splits digit runs out of text segments so the UI can highlight them. Missing placeholders are left alone. */
export function highlightNumbers(segments: Segment[]): Piece[] {
  const out: Piece[] = [];
  for (const seg of segments) {
    if (seg.kind === "missing") {
      out.push(seg);
      continue;
    }
    for (const part of seg.text.split(/(\d+)/)) {
      if (part === "") continue;
      out.push({ kind: /^\d+$/.test(part) ? "number" : "text", text: part });
    }
  }
  return out;
}

/** Plain-text form for previews; a missing value shows as `{NAME}`. */
export function segmentsToPlain(segments: Segment[]): string {
  return segments.map((s) => (s.kind === "missing" ? `{${s.name}}` : s.text)).join("");
}

/** Comma-separated moves, trimmed, empties dropped, case preserved. */
export function splitMoves(stitchInstructions: string | null): string[] {
  if (!stitchInstructions) return [];
  return stitchInstructions
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m !== "");
}

export function buildDictionary(patternEntries: DictionaryRow[], globalEntries: DictionaryRow[]): Dictionary {
  const toMap = (rows: DictionaryRow[], source: Definition["source"]) =>
    new Map(rows.map((r) => [r.abbreviation.toLowerCase(), { ...r, source } satisfies Definition]));
  return { pattern: toMap(patternEntries, "pattern"), global: toMap(globalEntries, "global") };
}

function lookupExact(key: string, dict: Dictionary): Definition | null {
  return dict.pattern.get(key) ?? dict.global.get(key) ?? null;
}

const PIPE_SYNTAX = /^\[(.+)\|(.+)\]$/;

/**
 * Resolution order (spec §1): exact -> pipe `[display|id]` (looks up `id`) ->
 * trailing digits or `{NAME}` stripped (`k12`, `k{a}` look up `k`). Pattern
 * entries before the global dictionary; case-insensitive.
 */
export function lookupWord(rawWord: string, dict: Dictionary): Definition | null {
  const token = rawWord.trim().toLowerCase();
  const exact = lookupExact(token, dict);
  if (exact) return exact;

  const pipe = token.match(PIPE_SYNTAX);
  if (pipe) {
    const viaPipe = lookupExact(pipe[2].trim(), dict);
    if (viaPipe) return viaPipe;
  }

  const stripped = token.replace(/(\d+|\{[^{}]+\})$/, "");
  if (stripped !== token && stripped.length > 0) return lookupExact(stripped, dict);
  return null;
}

// A `[display|id]` unit stays one word even though it could contain spaces.
const WORD = /\[[^\]]*\]\S*|\S+/g;

/**
 * Breaks one move into words. Lookup runs on the unsubstituted text (spec §1:
 * placeholders are not filled for exact/pipe-id matching); display text then
 * has placeholders filled and numbers split out. Every recognized word gets
 * its own definition, not only the first.
 */
export function moveWords(move: string, sizeParams: Json | null, size: string, dict: Dictionary): MoveWord[] {
  const words = move.match(WORD) ?? [];
  return words.map((raw) => {
    const pipe = raw.match(PIPE_SYNTAX);
    const display = pipe ? pipe[1] : raw;
    return {
      pieces: highlightNumbers(fillPlaceholders(display, sizeParams, size)),
      definition: lookupWord(raw, dict),
    };
  });
}

/** One-line plain-text version of a step for the previous/next previews. */
export function stepPreview(step: Step, size: string): string {
  const fill = (t: string | null) => (t ? segmentsToPlain(fillPlaceholders(t, step.size_params, size)) : "");
  const moves = splitMoves(step.stitch_instructions).map((m) => segmentsToPlain(fillPlaceholders(m, step.size_params, size)).replace(/\[([^\]|]*)\|[^\]]*\]/g, "$1"));
  return [fill(step.instructions_before), moves.join(", "), fill(step.instructions_after)]
    .filter((p) => p !== "")
    .join(" ");
}

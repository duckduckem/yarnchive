// Parsed, validated in-memory shapes for one pattern import — one step removed
// from the CSVs (dynamic per-size columns already folded into nested objects,
// numbers/booleans parsed) and one step removed from the DB rows (still keyed
// by readable group_key/size label, not by uuid — see lib/build.ts for that
// last step). Mirrors specs/schema-v1.md §3.

export type SizeLabel = string;
export type StitchKind = "stitch" | "technique";
export type StepType = "instruction" | "note" | "checkpoint";
export type Side = "RS" | "WS";

export interface ParsedPattern {
  slug: string;
  name: string;
  designer: string;
  isPaid: boolean;
  sourceLink: string | null;
}

export interface ParsedSize {
  row: number;
  label: SizeLabel;
  displayOrder: number;
}

export interface ParsedStitchEntry {
  row: number;
  kind: StitchKind;
  abbreviation: string;
  name: string;
  definition: string;
  link: string | null;
}

export interface ParsedRepeatGroup {
  row: number;
  groupKey: string;
  repeatCondition: string | null;
  lastRepeatNote: string | null;
  /** size label -> count. Null when this is a condition group. */
  repeatCount: Record<SizeLabel, number> | null;
  /** placeholder -> size label -> value, filling {PLACEHOLDER} tokens in repeatCondition. */
  sizeParams: Record<string, Record<SizeLabel, string>>;
}

export interface ParsedStep {
  row: number;
  stepOrder: number;
  stepType: StepType;
  section: string;
  subsection: string | null;
  rowOrRound: string | null;
  side: Side | null;
  /** Empty array means "every size in the pattern." */
  appliesToSizes: SizeLabel[];
  instructionsBefore: string | null;
  stitchInstructions: string | null;
  instructionsAfter: string | null;
  repeatGroupKey: string | null;
  repeatStepNumber: number | null;
  link: string | null;
  errataNote: string | null;
  /** placeholder -> size label -> value, filling {PLACEHOLDER} tokens in this row's own text. */
  sizeParams: Record<string, Record<SizeLabel, string>>;
  /** label -> size label -> value. Only meaningful when stepType === "checkpoint". */
  stitchCount: Record<string, Record<SizeLabel, number>>;
}

export interface ParsedPatternFile {
  pattern: ParsedPattern;
  sizes: ParsedSize[];
  stitchEntries: ParsedStitchEntry[];
  repeatGroups: ParsedRepeatGroup[];
  steps: ParsedStep[];
}

export interface DictionaryEntry {
  abbreviation: string;
  kind: StitchKind;
}

export interface Issue {
  file: string;
  /** 1-based, matching the row as it appears in a spreadsheet (header is row 1). */
  row: number | null;
  message: string;
}

// Parses the 5 CSVs into the model types (scripts/lib/model.ts) and enforces
// specs/schema-v1.md §6, except rule 4 (repeat_count's N-vs-N+1 convention),
// which the spec itself says isn't recoverable from the number alone --
// that one lives only in scripts/template/GUIDE.md, as data-entry guidance.

import { field, readCsv } from "./csv.ts";
import { extractSizeSuffixed, extractSubkeySizeSuffixed } from "./columns.ts";
import { normalizeStitchInstructions, toTitleCase, tokenize } from "./normalize.ts";
import { resolveToken } from "./tokens.ts";
import type {
  DictionaryEntry,
  Issue,
  ParsedPattern,
  ParsedPatternFile,
  ParsedRepeatGroup,
  ParsedSize,
  ParsedStep,
  ParsedStitchEntry,
  Side,
  StepType,
  StitchKind,
} from "./model.ts";

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
  data: ParsedPatternFile | null;
}

const STEP_TYPES: StepType[] = ["instruction", "note", "checkpoint"];
const SIDES: Side[] = ["RS", "WS"];
const KINDS: StitchKind[] = ["stitch", "technique"];

export function parseAndValidate(dir: string, globalDictionary: DictionaryEntry[]): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  const patternRows = readCsv(dir, "pattern.csv");
  const sizeRows = readCsv(dir, "sizes.csv");
  const stitchEntryRows = readCsv(dir, "stitch_entries.csv");
  const repeatGroupRows = readCsv(dir, "repeat_groups.csv");
  const stepRows = readCsv(dir, "steps.csv");

  const pattern = parsePattern(patternRows, errors);
  const sizes = parseSizes(sizeRows, errors);
  const sizeLabels = new Set(sizes.map((s) => s.label));

  const stitchEntries = parseStitchEntries(stitchEntryRows, globalDictionary, errors, warnings);
  const patternDictionary: DictionaryEntry[] = stitchEntries.map((e) => ({
    abbreviation: e.abbreviation,
    kind: e.kind,
  }));

  const repeatGroups = parseRepeatGroups(repeatGroupRows, sizeLabels, errors);
  const groupKeys = new Set(repeatGroups.map((g) => g.groupKey));

  const steps = parseSteps(stepRows, sizeLabels, groupKeys, patternDictionary, globalDictionary, errors);

  crossValidateStepOrder(steps, sizeLabels, errors);
  crossValidateRepeatGroups(repeatGroups, steps, errors);

  if (!pattern || sizes.length === 0 || stepRows.length === 0) {
    return { errors, warnings, data: null };
  }

  return {
    errors,
    warnings,
    data: { pattern, sizes, stitchEntries, repeatGroups, steps },
  };
}

function parsePattern(rows: ReturnType<typeof readCsv>, errors: Issue[]): ParsedPattern | null {
  if (rows.length === 0) {
    errors.push({ file: "pattern.csv", row: null, message: "no data row found" });
    return null;
  }
  if (rows.length > 1) {
    errors.push({ file: "pattern.csv", row: rows[1].row, message: "pattern.csv must have exactly one data row" });
  }
  const { row, fields } = rows[0];
  const slug = field(fields, "slug");
  const name = field(fields, "name");
  const designer = field(fields, "designer");
  if (!slug) errors.push({ file: "pattern.csv", row, message: "slug is required" });
  if (!name) errors.push({ file: "pattern.csv", row, message: "name is required" });
  if (!designer) errors.push({ file: "pattern.csv", row, message: "designer is required" });

  const isPaidRaw = (field(fields, "is_paid") ?? "false").trim().toLowerCase();
  const truthy = new Set(["true", "1", "yes"]);
  const falsy = new Set(["false", "0", "no", ""]);
  if (!truthy.has(isPaidRaw) && !falsy.has(isPaidRaw)) {
    errors.push({ file: "pattern.csv", row, message: `is_paid must be TRUE or FALSE, got "${isPaidRaw}"` });
  }

  if (!slug || !name || !designer) return null;
  return {
    slug,
    name,
    designer,
    isPaid: truthy.has(isPaidRaw),
    sourceLink: field(fields, "source_link"),
  };
}

function parseSizes(rows: ReturnType<typeof readCsv>, errors: Issue[]): ParsedSize[] {
  if (rows.length === 0) {
    errors.push({ file: "sizes.csv", row: null, message: "at least one size is required" });
    return [];
  }
  const sizes: ParsedSize[] = [];
  const seen = new Map<string, number>();
  for (const { row, fields } of rows) {
    const label = field(fields, "label");
    const displayOrderRaw = field(fields, "display_order");
    if (!label) {
      errors.push({ file: "sizes.csv", row, message: "label is required" });
      continue;
    }
    if (seen.has(label)) {
      errors.push({ file: "sizes.csv", row, message: `duplicate size label "${label}" (also row ${seen.get(label)})` });
      continue;
    }
    const displayOrder = displayOrderRaw === null ? NaN : Number(displayOrderRaw);
    if (!Number.isInteger(displayOrder)) {
      errors.push({ file: "sizes.csv", row, message: `display_order must be an integer, got "${displayOrderRaw ?? ""}"` });
      continue;
    }
    seen.set(label, row);
    sizes.push({ row, label, displayOrder });
  }
  return sizes;
}

function parseStitchEntries(
  rows: ReturnType<typeof readCsv>,
  globalDictionary: DictionaryEntry[],
  errors: Issue[],
  warnings: Issue[],
): ParsedStitchEntry[] {
  const entries: ParsedStitchEntry[] = [];
  const seen = new Map<string, number>();
  for (const { row, fields } of rows) {
    const kindRaw = (field(fields, "kind") ?? "").trim().toLowerCase() as StitchKind;
    const abbreviation = field(fields, "abbreviation")?.trim().toLowerCase() ?? null;
    const name = field(fields, "name");
    const definition = field(fields, "definition");

    if (!KINDS.includes(kindRaw)) {
      errors.push({ file: "stitch_entries.csv", row, message: `kind must be "stitch" or "technique", got "${kindRaw}"` });
      continue;
    }
    if (!abbreviation) {
      errors.push({ file: "stitch_entries.csv", row, message: "abbreviation is required" });
      continue;
    }
    if (!name || !definition) {
      errors.push({ file: "stitch_entries.csv", row, message: "name and definition are required" });
      continue;
    }
    if (seen.has(abbreviation)) {
      errors.push({
        file: "stitch_entries.csv",
        row,
        message: `duplicate abbreviation "${abbreviation}" (also row ${seen.get(abbreviation)})`,
      });
      continue;
    }
    seen.set(abbreviation, row);

    const shadowed = globalDictionary.find((e) => e.abbreviation === abbreviation);
    if (shadowed && shadowed.kind !== kindRaw) {
      warnings.push({
        file: "stitch_entries.csv",
        row,
        message: `"${abbreviation}" shadows a global stitch_dictionary entry of a different kind (global: ${shadowed.kind}, here: ${kindRaw})`,
      });
    }

    entries.push({ row, kind: kindRaw, abbreviation, name, definition, link: field(fields, "link") });
  }
  return entries;
}

function parseRepeatGroups(
  rows: ReturnType<typeof readCsv>,
  sizeLabels: Set<string>,
  errors: Issue[],
): ParsedRepeatGroup[] {
  const groups: ParsedRepeatGroup[] = [];
  const seen = new Map<string, number>();
  for (const { row, fields } of rows) {
    const groupKey = field(fields, "group_key");
    if (!groupKey) {
      errors.push({ file: "repeat_groups.csv", row, message: "group_key is required" });
      continue;
    }
    if (seen.has(groupKey)) {
      errors.push({ file: "repeat_groups.csv", row, message: `duplicate group_key "${groupKey}" (also row ${seen.get(groupKey)})` });
      continue;
    }
    seen.set(groupKey, row);

    const repeatCondition = field(fields, "repeat_condition");
    const rawCounts = extractSizeSuffixed(fields, "repeat_count");
    for (const size of Object.keys(rawCounts)) {
      if (!sizeLabels.has(size)) {
        errors.push({ file: "repeat_groups.csv", row, message: `unknown size label "${size}" in a repeat_count_* column` });
      }
    }
    const repeatCount: Record<string, number> = {};
    let hasCountError = false;
    for (const [size, raw] of Object.entries(rawCounts)) {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1) {
        errors.push({ file: "repeat_groups.csv", row, message: `repeat_count_${size} must be a positive integer, got "${raw}"` });
        hasCountError = true;
        continue;
      }
      repeatCount[size] = n;
    }

    const sizeParams = extractSubkeySizeSuffixed(fields, "param");
    for (const [placeholder, bySize] of Object.entries(sizeParams)) {
      for (const size of Object.keys(bySize)) {
        if (!sizeLabels.has(size)) {
          errors.push({
            file: "repeat_groups.csv",
            row,
            message: `unknown size label "${size}" in param_${placeholder}_* column`,
          });
        }
      }
    }

    const hasCount = Object.keys(repeatCount).length > 0;
    const hasCondition = repeatCondition !== null;
    if (hasCount === hasCondition) {
      errors.push({
        file: "repeat_groups.csv",
        row,
        message: hasCount
          ? "exactly one of repeat_condition / repeat_count_* must be set, found both"
          : "exactly one of repeat_condition / repeat_count_* must be set, found neither",
      });
      continue;
    }
    if (hasCountError) continue;

    groups.push({
      row,
      groupKey,
      repeatCondition,
      lastRepeatNote: field(fields, "last_repeat_note"),
      repeatCount: hasCount ? repeatCount : null,
      sizeParams,
    });
  }
  return groups;
}

function parseSteps(
  rows: ReturnType<typeof readCsv>,
  sizeLabels: Set<string>,
  groupKeys: Set<string>,
  patternDictionary: DictionaryEntry[],
  globalDictionary: DictionaryEntry[],
  errors: Issue[],
): ParsedStep[] {
  const steps: ParsedStep[] = [];
  for (const { row, fields } of rows) {
    const stepOrderRaw = field(fields, "step_order");
    const stepOrder = stepOrderRaw === null ? NaN : Number(stepOrderRaw);
    if (!Number.isInteger(stepOrder)) {
      errors.push({ file: "steps.csv", row, message: `step_order must be an integer, got "${stepOrderRaw ?? ""}"` });
      continue;
    }

    const stepTypeRaw = (field(fields, "step_type") ?? "").trim().toLowerCase() as StepType;
    if (!STEP_TYPES.includes(stepTypeRaw)) {
      errors.push({ file: "steps.csv", row, message: `step_type must be one of ${STEP_TYPES.join(", ")}, got "${stepTypeRaw}"` });
      continue;
    }

    const sectionRaw = field(fields, "section");
    if (!sectionRaw) {
      errors.push({ file: "steps.csv", row, message: "section is required" });
      continue;
    }
    const section = toTitleCase(sectionRaw);
    const subsectionRaw = field(fields, "subsection");
    const subsection = subsectionRaw ? toTitleCase(subsectionRaw) : null;
    const rowOrRoundRaw = field(fields, "row_or_round");
    const rowOrRound = rowOrRoundRaw ? toTitleCase(rowOrRoundRaw) : null;

    const sideRaw = field(fields, "side");
    const side = sideRaw ? (sideRaw.trim().toUpperCase() as Side) : null;
    if (side !== null && !SIDES.includes(side)) {
      errors.push({ file: "steps.csv", row, message: `side must be RS or WS, got "${sideRaw}"` });
    }

    const appliesToSizesRaw = field(fields, "applies_to_sizes");
    const appliesToSizes = appliesToSizesRaw
      ? appliesToSizesRaw.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
      : [];
    for (const size of appliesToSizes) {
      if (!sizeLabels.has(size)) {
        errors.push({ file: "steps.csv", row, message: `unknown size label "${size}" in applies_to_sizes` });
      }
    }

    const stitchInstructionsRaw = field(fields, "stitch_instructions");
    let stitchInstructions: string | null = null;
    if (stitchInstructionsRaw) {
      stitchInstructions = normalizeStitchInstructions(stitchInstructionsRaw);
      for (const token of tokenize(stitchInstructions)) {
        const resolution = resolveToken(token, patternDictionary, globalDictionary);
        if (!resolution.resolved) {
          errors.push({ file: "steps.csv", row, message: `unresolvable stitch token "${token}"` });
        }
      }
    }

    const repeatGroupKey = field(fields, "repeat_group_key");
    if (repeatGroupKey && !groupKeys.has(repeatGroupKey)) {
      errors.push({ file: "steps.csv", row, message: `unknown repeat_group_key "${repeatGroupKey}" (not in repeat_groups.csv)` });
    }
    const repeatStepNumberRaw = field(fields, "repeat_step_number");
    let repeatStepNumber: number | null = null;
    if (repeatStepNumberRaw !== null) {
      const n = Number(repeatStepNumberRaw);
      if (!Number.isInteger(n) || n < 1) {
        errors.push({ file: "steps.csv", row, message: `repeat_step_number must be a positive integer, got "${repeatStepNumberRaw}"` });
      } else {
        repeatStepNumber = n;
      }
    }
    if (repeatStepNumber !== null && !repeatGroupKey) {
      errors.push({ file: "steps.csv", row, message: "repeat_step_number is set but repeat_group_key is not" });
    }

    const sizeParams = extractSubkeySizeSuffixed(fields, "param");
    for (const [placeholder, bySize] of Object.entries(sizeParams)) {
      for (const size of Object.keys(bySize)) {
        if (!sizeLabels.has(size)) {
          errors.push({ file: "steps.csv", row, message: `unknown size label "${size}" in param_${placeholder}_* column` });
        }
      }
    }

    const rawStitchCount = extractSubkeySizeSuffixed(fields, "count");
    const stitchCountLabels = Object.keys(rawStitchCount);
    if (stitchCountLabels.length > 0 && stepTypeRaw !== "checkpoint") {
      errors.push({ file: "steps.csv", row, message: "stitch count (count_*) columns are only valid on checkpoint steps" });
    }
    const stitchCount: Record<string, Record<string, number>> = {};
    if (stitchCountLabels.length > 0) {
      const sizeSets = stitchCountLabels.map((label) => Object.keys(rawStitchCount[label]).sort().join(","));
      if (new Set(sizeSets).size > 1) {
        errors.push({
          file: "steps.csv",
          row,
          message: "every stitch-count label must have values for the same set of sizes",
        });
      }
      for (const [label, bySize] of Object.entries(rawStitchCount)) {
        for (const [size, raw] of Object.entries(bySize)) {
          if (!sizeLabels.has(size)) {
            errors.push({ file: "steps.csv", row, message: `unknown size label "${size}" in count_${label}_* column` });
            continue;
          }
          const n = Number(raw);
          if (!Number.isInteger(n)) {
            errors.push({ file: "steps.csv", row, message: `count_${label}_${size} must be an integer, got "${raw}"` });
            continue;
          }
          (stitchCount[label] ??= {})[size] = n;
        }
      }
    }

    steps.push({
      row,
      stepOrder,
      stepType: stepTypeRaw,
      section,
      subsection,
      rowOrRound,
      side: side && SIDES.includes(side) ? side : null,
      appliesToSizes,
      instructionsBefore: field(fields, "instructions_before"),
      stitchInstructions,
      instructionsAfter: field(fields, "instructions_after"),
      repeatGroupKey,
      repeatStepNumber,
      link: field(fields, "link"),
      errataNote: field(fields, "errata_note"),
      sizeParams,
      stitchCount,
    });
  }
  return steps;
}

/** Rule 2: at a given step_order, every size resolves to exactly one row, or none. */
function crossValidateStepOrder(steps: ParsedStep[], sizeLabels: Set<string>, errors: Issue[]): void {
  const allSizes = [...sizeLabels];
  const byOrder = new Map<number, ParsedStep[]>();
  for (const step of steps) {
    const rowsAtOrder = byOrder.get(step.stepOrder);
    if (rowsAtOrder) {
      rowsAtOrder.push(step);
    } else {
      byOrder.set(step.stepOrder, [step]);
    }
  }
  for (const [stepOrder, rows] of byOrder) {
    if (rows.length < 2) continue;
    const claimed = new Map<string, number>(); // size -> row that claims it
    for (const step of rows) {
      const sizes = step.appliesToSizes.length > 0 ? step.appliesToSizes : allSizes;
      for (const size of sizes) {
        if (claimed.has(size)) {
          errors.push({
            file: "steps.csv",
            row: step.row,
            message: `step_order ${stepOrder}: size "${size}" is also claimed by row ${claimed.get(size)}`,
          });
        } else {
          claimed.set(size, step.row);
        }
      }
    }
  }
}

/** Rules 5 and 11: every repeat group has exactly one intro note step, and every other member step has a repeat_step_number. */
function crossValidateRepeatGroups(groups: ParsedRepeatGroup[], steps: ParsedStep[], errors: Issue[]): void {
  for (const group of groups) {
    const members = steps.filter((s) => s.repeatGroupKey === group.groupKey);
    const intros = members.filter((s) => s.repeatStepNumber === null);
    if (intros.length === 0) {
      errors.push({
        file: "repeat_groups.csv",
        row: group.row,
        message: `repeat group "${group.groupKey}" has no intro note step in steps.csv (need exactly one, with repeat_step_number blank)`,
      });
    } else if (intros.length > 1) {
      for (const intro of intros) {
        errors.push({
          file: "steps.csv",
          row: intro.row,
          message: `repeat group "${group.groupKey}" has more than one intro note step (repeat_step_number blank)`,
        });
      }
    } else if (intros[0].stepType !== "note") {
      errors.push({
        file: "steps.csv",
        row: intros[0].row,
        message: `repeat group "${group.groupKey}"'s intro step (repeat_step_number blank) must have step_type "note"`,
      });
    }
  }
}

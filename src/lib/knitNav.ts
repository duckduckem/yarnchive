// Pure navigation logic for repeat groups and checkpoints (specs/knit-navigation.md).
// No React, no I/O. Position is the project_progress shape (spec §1).
import type { Database, Json } from "../types/database.ts";
import type { Step } from "./knitText.ts";

export type RepeatGroup = Database["public"]["Tables"]["repeat_groups"]["Row"];

export interface Progress {
  /** null = not started: resume at the first step. */
  current_step_id: string | null;
  /** group id -> current pass, 1-based. */
  repeat_pass_counts: Record<string, number>;
  /** group id -> whether the current pass's condition checkbox is ticked. */
  checkbox_states: Record<string, boolean>;
}

export const emptyProgress = (): Progress => ({ current_step_id: null, repeat_pass_counts: {}, checkbox_states: {} });

interface GroupSpan {
  group: RepeatGroup;
  /** Indices into steps of the pass body, ordered by repeat_step_number. */
  body: number[];
}

export interface Nav {
  steps: Step[];
  size: string;
  spans: Map<string, GroupSpan>;
}

/** `steps` must already be size-filtered and in step_order (`stepsForSize`). */
export function createNav(steps: Step[], groups: Map<string, RepeatGroup>, size: string): Nav {
  const spans = new Map<string, GroupSpan>();
  steps.forEach((s, i) => {
    if (!s.repeat_group_id || s.repeat_step_number === null) return;
    const group = groups.get(s.repeat_group_id);
    if (!group) return;
    const span = spans.get(group.id) ?? { group, body: [] };
    span.body.push(i);
    spans.set(group.id, span);
  });
  for (const span of spans.values()) {
    span.body.sort((a, b) => (steps[a].repeat_step_number ?? 0) - (steps[b].repeat_step_number ?? 0));
  }
  return { steps, size, spans };
}

/** A whole number of passes >= 1 for the size, or null when missing or not usable. */
export function repeatCountFor(group: RepeatGroup, size: string): number | null {
  const rc = group.repeat_count;
  if (!rc || typeof rc !== "object" || Array.isArray(rc)) return null;
  const v = rc[size];
  return typeof v === "number" && Number.isInteger(v) && v >= 1 ? v : null;
}

export const isConditionGroup = (g: RepeatGroup) => g.repeat_condition !== null && g.repeat_count === null;

export interface View {
  index: number;
  step: Step;
  group: RepeatGroup | null;
  role: "plain" | "intro" | "body";
  /** Current pass for body steps. */
  pass: number | null;
  /** Total passes: null for condition groups and for a missing count. */
  total: number | null;
  countMissing: boolean;
  isEndOfPass: boolean;
  conditionTicked: boolean;
  showLastRepeatNote: boolean;
}

function indexOfCurrent(nav: Nav, p: Progress): number {
  const i = nav.steps.findIndex((s) => s.id === p.current_step_id);
  return i === -1 ? 0 : i;
}

function spanOf(nav: Nav, step: Step): GroupSpan | null {
  const span = step.repeat_group_id ? nav.spans.get(step.repeat_group_id) : undefined;
  return span && span.body.length > 0 ? span : null;
}

export function view(nav: Nav, p: Progress): View {
  const index = indexOfCurrent(nav, p);
  const step = nav.steps[index];
  const span = spanOf(nav, step);
  const base = {
    index, step, group: null, pass: null, total: null, countMissing: false,
    isEndOfPass: false, conditionTicked: false, showLastRepeatNote: false,
  };
  if (!span) return { ...base, role: "plain" };

  const group = span.group;
  if (step.repeat_step_number === null) return { ...base, group, role: "intro", total: isConditionGroup(group) ? null : repeatCountFor(group, nav.size), countMissing: !isConditionGroup(group) && repeatCountFor(group, nav.size) === null };

  const condition = isConditionGroup(group);
  const total = condition ? null : repeatCountFor(group, nav.size);
  const pass = p.repeat_pass_counts[group.id] ?? 1;
  const isEndOfPass = index === span.body[span.body.length - 1];
  const conditionTicked = condition && (p.checkbox_states[group.id] ?? false);
  const hasNote = group.last_repeat_note !== null && group.last_repeat_note !== "";
  const finalPass = condition ? conditionTicked && isEndOfPass : total !== null && pass >= total;
  return {
    ...base, group, role: "body", pass, total, countMissing: !condition && total === null,
    isEndOfPass, conditionTicked, showLastRepeatNote: hasNote && finalPass,
  };
}

const at = (nav: Nav, p: Progress, index: number): Progress => ({ ...p, current_step_id: nav.steps[index].id });

/** Moves to `index`; if that is a group's last body step (re-entered from after the group), restores its final pass. */
function land(nav: Nav, p: Progress, index: number): Progress {
  const step = nav.steps[index];
  const span = spanOf(nav, step);
  if (!span || step.repeat_step_number === null || index !== span.body[span.body.length - 1]) return at(nav, p, index);
  const id = span.group.id;
  const pass = p.repeat_pass_counts[id] ?? repeatCountFor(span.group, nav.size) ?? 1;
  return { ...at(nav, p, index), repeat_pass_counts: { ...p.repeat_pass_counts, [id]: pass } };
}

const withPass = (p: Progress, id: string, pass: number): Progress => ({
  ...p,
  repeat_pass_counts: { ...p.repeat_pass_counts, [id]: pass },
  checkbox_states: { ...p.checkbox_states, [id]: false },
});

/** Progress after Next, or null on the pattern's last step. */
export function next(nav: Nav, p: Progress): Progress | null {
  const v = view(nav, p);
  if (v.role === "plain") return v.index + 1 < nav.steps.length ? at(nav, p, v.index + 1) : null;

  const span = spanOf(nav, v.step)!;
  const id = span.group.id;
  if (v.role === "intro") return at(nav, withPass(p, id, 1), span.body[0]);

  const pos = span.body.indexOf(v.index);
  if (pos < span.body.length - 1) return at(nav, p, span.body[pos + 1]);

  const again = isConditionGroup(span.group) ? !v.conditionTicked : v.total !== null && v.pass! < v.total;
  if (again) return at(nav, withPass(p, id, v.pass! + 1), span.body[0]);
  const after = v.index + 1;
  return after < nav.steps.length ? at(nav, p, after) : null;
}

/** Progress after Previous, or null on the pattern's first step. */
export function prev(nav: Nav, p: Progress): Progress | null {
  const v = view(nav, p);
  if (v.role !== "body") return v.index > 0 ? land(nav, p, v.index - 1) : null;

  const span = spanOf(nav, v.step)!;
  const pos = span.body.indexOf(v.index);
  if (pos > 0) return at(nav, p, span.body[pos - 1]);
  if (v.pass! > 1) return at(nav, withPass(p, span.group.id, v.pass! - 1), span.body[span.body.length - 1]);
  return v.index > 0 ? land(nav, p, v.index - 1) : null;
}

/** For a group body step: the pass range a jump can target (max null = no upper bound). Null for any other step. */
export function passRange(nav: Nav, index: number): { max: number | null } | null {
  const step = nav.steps[index];
  const span = spanOf(nav, step);
  if (!span || step.repeat_step_number === null) return null;
  return { max: isConditionGroup(span.group) ? null : repeatCountFor(span.group, nav.size) };
}

/**
 * Jump to `index` (specs/projects.md §3). Repeat state is rewritten wholesale:
 * cleared, then a body step's group gets the chosen pass (clamped to the
 * group's range) with its checkbox unticked.
 */
export function jumpTo(nav: Nav, index: number, pass = 1): Progress {
  const base: Progress = { current_step_id: nav.steps[index].id, repeat_pass_counts: {}, checkbox_states: {} };
  const range = passRange(nav, index);
  if (!range) return base;
  const wanted = Number.isInteger(pass) ? pass : 1;
  const clamped = Math.max(1, range.max === null ? wanted : Math.min(wanted, range.max));
  const groupId = nav.steps[index].repeat_group_id!;
  return { ...base, repeat_pass_counts: { [groupId]: clamped }, checkbox_states: { [groupId]: false } };
}

export function setCheckbox(p: Progress, groupId: string, ticked: boolean): Progress {
  return { ...p, checkbox_states: { ...p.checkbox_states, [groupId]: ticked } };
}

export interface CheckpointCount {
  /** Display label: underscores shown as spaces. */
  label: string;
  /** null = no value for the chosen size. */
  value: string | null;
}

/** Expected counts for the size, `total` first. null when the step has no usable stitch_count at all. */
export function checkpointCounts(stitchCount: Json | null, size: string): CheckpointCount[] | null {
  if (!stitchCount || typeof stitchCount !== "object" || Array.isArray(stitchCount)) return null;
  const keys = Object.keys(stitchCount);
  if (keys.length === 0) return null;
  keys.sort((a, b) => Number(b === "total") - Number(a === "total"));
  return keys.map((key) => {
    const perSize = stitchCount[key];
    const raw = perSize && typeof perSize === "object" && !Array.isArray(perSize) ? perSize[size] : null;
    const value = raw === null || raw === undefined || raw === "" ? null : String(raw);
    return { label: key.replace(/_/g, " "), value };
  });
}

// Keeping a project's place across `--replace` (specs/projects.md §5). Pure:
// matches each project's old position to the new steps by step_order, and
// refuses (a "block") whenever the match isn't clearly the same step.

import type { ParsedStep } from "./model.ts";

/** One project_progress row on the pattern being replaced, as read before any delete. */
export interface Anchor {
  progressId: string;
  projectId: string;
  size: string;
  /** null = not started; nothing to remap. */
  step: { stepOrder: number; section: string; subsection: string | null; rowOrRound: string | null; groupId: string | null } | null;
  /** Old repeat group id -> step_orders of that group's steps. */
  groupOrders: Record<string, number[]>;
  passCounts: Record<string, number>;
  checkboxes: Record<string, boolean>;
}

export type Remap =
  | { kind: "untouched"; anchor: Anchor }
  | {
      kind: "keep";
      anchor: Anchor;
      /** step_order of the new current step (looked up again by size when applying). */
      stepOrder: number;
      /** Old group id -> new group_key, only for groups that could be mapped. */
      groupKeys: Record<string, string>;
    }
  | { kind: "block"; anchor: Anchor; reason: string };

export const stepLabel = (s: { section: string; subsection: string | null; rowOrRound: string | null }) =>
  `${s.section}${s.subsection ? ` › ${s.subsection}` : ""}${s.rowOrRound ? ` · ${s.rowOrRound}` : ""}`;

/** The row at `stepOrder` that applies to `size`, or undefined. */
export function stepAt(steps: ParsedStep[], stepOrder: number, size: string): ParsedStep | undefined {
  return steps.find((s) => s.stepOrder === stepOrder && (s.appliesToSizes.length === 0 || s.appliesToSizes.includes(size)));
}

export function planRemap(anchors: Anchor[], newSteps: ParsedStep[], newSizes: string[]): Remap[] {
  return anchors.map((anchor): Remap => {
    const old = anchor.step;
    if (!old) return { kind: "untouched", anchor };
    const block = (reason: string): Remap => ({ kind: "block", anchor, reason });

    if (!newSizes.includes(anchor.size)) return block(`size "${anchor.size}" is no longer in the pattern`);
    const now = stepAt(newSteps, old.stepOrder, anchor.size);
    if (!now) return block(`no step at step_order ${old.stepOrder} for size "${anchor.size}" in the new data`);
    if (now.section !== old.section || now.subsection !== old.subsection || now.rowOrRound !== old.rowOrRound) {
      return block(`step_order ${old.stepOrder} is now "${stepLabel(now)}"`);
    }
    if (old.groupId && !now.repeatGroupKey) return block(`step_order ${old.stepOrder} is no longer in a repeat group`);

    const groupKeys: Record<string, string> = {};
    for (const groupId of new Set([...Object.keys(anchor.passCounts), ...Object.keys(anchor.checkboxes)])) {
      for (const order of anchor.groupOrders[groupId] ?? []) {
        const key = stepAt(newSteps, order, anchor.size)?.repeatGroupKey;
        if (key) {
          groupKeys[groupId] = key;
          break;
        }
      }
    }
    // The current step's own group is whatever group the matched new step is in.
    // State for other groups that can't be mapped is dropped.
    if (old.groupId && now.repeatGroupKey) groupKeys[old.groupId] = now.repeatGroupKey;
    return { kind: "keep", anchor, stepOrder: old.stepOrder, groupKeys };
  });
}

/** New pass and checkbox maps with old group ids swapped for new ones; unmapped groups dropped. */
export function rekey<T>(map: Record<string, T>, groupIds: Record<string, string>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [oldId, value] of Object.entries(map)) {
    const next = groupIds[oldId];
    if (next) out[next] = value;
  }
  return out;
}

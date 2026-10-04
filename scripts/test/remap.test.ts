import { test } from "node:test";
import assert from "node:assert/strict";
import { planRemap, rekey, type Anchor } from "../lib/remap.ts";
import type { ParsedStep } from "../lib/model.ts";

const step = (stepOrder: number, extra: Partial<ParsedStep> = {}): ParsedStep =>
  ({
    row: stepOrder, stepOrder, stepType: "instruction", section: "Body", subsection: "Setup", rowOrRound: `Row ${stepOrder}`,
    side: null, appliesToSizes: [], instructionsBefore: null, stitchInstructions: null, instructionsAfter: null,
    repeatGroupKey: null, repeatStepNumber: null, link: null, errataNote: null, sizeParams: {}, stitchCount: {}, ...extra,
  }) as ParsedStep;

// Placeholder-only: 1 plain, 2 size-specific (S and M rows), 3 intro of "inc", 4-5 body of "inc", 6 plain.
const steps = [
  step(1),
  step(2, { appliesToSizes: ["S"], rowOrRound: "Row 2" }),
  step(2, { appliesToSizes: ["M"], rowOrRound: "Row 2" }),
  step(3, { repeatGroupKey: "inc" }),
  step(4, { repeatGroupKey: "inc", repeatStepNumber: 1 }),
  step(5, { repeatGroupKey: "inc", repeatStepNumber: 2 }),
  step(6),
];

const at = (n: number, extra: Partial<NonNullable<Anchor["step"]>> = {}) => ({
  stepOrder: n, section: "Body", subsection: "Setup", rowOrRound: `Row ${n}`, groupId: null, ...extra,
});
const anchor = (extra: Partial<Anchor> = {}): Anchor => ({
  progressId: "pp", projectId: "pr", size: "S", step: at(1), groupOrders: {}, passCounts: {}, checkboxes: {}, ...extra,
});

test("a not-started project is untouched", () => {
  const [r] = planRemap([anchor({ step: null })], steps, ["S", "M"]);
  assert.equal(r.kind, "untouched");
});

test("same step_order and label keeps the place; size-specific rows resolve by size", () => {
  const [a, b] = planRemap([anchor({ step: at(2) }), anchor({ step: at(2), size: "M" })], steps, ["S", "M"]);
  assert.equal(a.kind, "keep");
  assert.equal(b.kind, "keep");
});

test("a group step keeps its place and re-keys pass counts to the new group key", () => {
  const a = anchor({
    step: at(5, { groupId: "oldG" }), groupOrders: { oldG: [3, 4, 5] }, passCounts: { oldG: 3 }, checkboxes: { oldG: false },
  });
  const [r] = planRemap([a], steps, ["S"]);
  assert.equal(r.kind, "keep");
  assert.deepEqual(r.kind === "keep" && r.groupKeys, { oldG: "inc" });
  assert.deepEqual(rekey(a.passCounts, { oldG: "new-uuid" }), { "new-uuid": 3 });
});

test("state for a group that can no longer be mapped is dropped, not blocking", () => {
  const a = anchor({ step: at(1), groupOrders: { gone: [40] }, passCounts: { gone: 2 } });
  const [r] = planRemap([a], steps, ["S"]);
  assert.equal(r.kind, "keep");
  assert.deepEqual(r.kind === "keep" && r.groupKeys, {});
});

test("blocks: label changed (rows inserted), step_order gone, size gone, group lost", () => {
  const shifted = steps.map((s) => (s.stepOrder >= 2 ? { ...s, stepOrder: s.stepOrder + 1 } : s));
  const [label] = planRemap([anchor({ step: at(2) })], shifted, ["S", "M"]);
  assert.equal(label.kind, "block");
  const [gone] = planRemap([anchor({ step: at(9) })], steps, ["S"]);
  assert.equal(gone.kind, "block");
  const [size] = planRemap([anchor({ size: "XL" })], steps, ["S", "M"]);
  assert.equal(size.kind, "block");
  const [group] = planRemap([anchor({ step: at(6, { groupId: "oldG" }) })], steps, ["S"]);
  assert.equal(group.kind, "block");
});

test("a step_order that doesn't apply to the project's size blocks", () => {
  const onlyS = steps.filter((s) => !(s.stepOrder === 2 && s.appliesToSizes.includes("M")));
  const [r] = planRemap([anchor({ step: at(2), size: "M" })], onlyS, ["S", "M"]);
  assert.equal(r.kind, "block");
});

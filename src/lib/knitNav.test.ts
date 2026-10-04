import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkpointCounts, createNav, emptyProgress, jumpTo, next, passRange, prev, repeatCountFor, setCheckbox, view,
  type Nav, type Progress, type RepeatGroup,
} from "./knitNav.ts";
import { stepsForSize, type Step } from "./knitText.ts";

// Placeholder-only pattern: plain, count group G1, plain, condition group G2, checkpoint, plain.
const G1 = { id: "G1", repeat_count: { S: 3 }, repeat_condition: null, last_repeat_note: "Last one." } as unknown as RepeatGroup;
const G2 = { id: "G2", repeat_count: null, repeat_condition: "Until {LEN}.", last_repeat_note: "Flap done." } as unknown as RepeatGroup;
const groups = new Map([[G1.id, G1], [G2.id, G2]]);

const mk = (n: number, extra: Partial<Step> = {}) =>
  ({ id: `s${n}`, step_order: n, step_type: "instruction", applies_to_sizes: null, repeat_group_id: null, repeat_step_number: null, ...extra }) as Step;
const note = (n: number, g: string) => mk(n, { step_type: "note", repeat_group_id: g });
const body = (n: number, g: string, num: number, extra: Partial<Step> = {}) => mk(n, { repeat_group_id: g, repeat_step_number: num, ...extra });

const all: Step[] = [
  mk(1),
  note(2, "G1"), body(3, "G1", 1), body(4, "G1", 2),
  mk(5),
  note(6, "G2"), body(7, "G2", 1), body(8, "G2", 2),
  mk(9, { step_type: "checkpoint", stitch_count: { total: { S: 100 }, sleeve: { S: 20 }, front_back: { S: 30 } } }),
  mk(10),
];

const navFor = (size: string): Nav => createNav(stepsForSize(all, size), groups, size);

/** Label for a position: step id plus pass for group body steps. */
const where = (nav: Nav, p: Progress) => {
  const v = view(nav, p);
  return v.pass === null ? v.step.id : `${v.step.id}/p${v.pass}`;
};

/** Walks Next until the end, ticking the G2 checkbox on its `tickOnPass`. */
function walk(nav: Nav, tickOnPass: number) {
  let p = emptyProgress();
  const path = [{ p, label: where(nav, p) }];
  for (let guard = 0; guard < 100; guard++) {
    const v = view(nav, p);
    if (v.group?.id === "G2" && v.isEndOfPass && v.pass === tickOnPass) {
      p = setCheckbox(p, "G2", true);
      path[path.length - 1] = { p, label: where(nav, p) };
    }
    const n = next(nav, p);
    if (!n) return path;
    p = n;
    path.push({ p, label: where(nav, p) });
  }
  throw new Error("walk did not terminate");
}

test("count group: every pass is stepped through, then Next continues past the group", () => {
  const labels = walk(navFor("S"), 2).map((x) => x.label);
  assert.deepEqual(labels.slice(0, 11), ["s1", "s2", "s3/p1", "s4/p1", "s3/p2", "s4/p2", "s3/p3", "s4/p3", "s5", "s6", "s7/p1"]);
});

test("condition group: unticked starts another pass, ticked leaves; counter has no total", () => {
  const nav = navFor("S");
  const labels = walk(nav, 2).map((x) => x.label);
  assert.deepEqual(labels.slice(9), ["s6", "s7/p1", "s8/p1", "s7/p2", "s8/p2", "s9", "s10"]);
  const v = view(nav, walk(nav, 2).find((x) => x.label === "s7/p1")!.p);
  assert.equal(v.total, null);
  assert.equal(v.countMissing, false);
});

test("condition checkbox resets to unticked when a new pass starts", () => {
  const nav = navFor("S");
  const path = walk(nav, 2);
  const p2 = path.find((x) => x.label === "s7/p2")!.p;
  assert.equal(view(nav, p2).conditionTicked, false);
});

test("last_repeat_note: count group shows it on the final pass only", () => {
  const nav = navFor("S");
  const shown = walk(nav, 2).filter((x) => view(nav, x.p).showLastRepeatNote).map((x) => x.label);
  assert.deepEqual(shown.filter((l) => l.startsWith("s3") || l.startsWith("s4")), ["s3/p3", "s4/p3"]);
});

test("last_repeat_note: condition group shows it only once the checkbox is ticked", () => {
  const nav = navFor("S");
  const path = walk(nav, 2);
  const flap = path.filter((x) => x.label.startsWith("s7") || x.label.startsWith("s8"));
  assert.deepEqual(flap.filter((x) => view(nav, x.p).showLastRepeatNote).map((x) => x.label), ["s8/p2"]);
});

test("missing repeat_count: flagged, and Next leaves the group after one pass", () => {
  const nav = navFor("M");
  const labels = walk(nav, 1).map((x) => x.label);
  assert.deepEqual(labels.slice(0, 6), ["s1", "s2", "s3/p1", "s4/p1", "s5", "s6"]);
  const at3 = walk(nav, 1).find((x) => x.label === "s3/p1")!.p;
  assert.equal(view(nav, at3).countMissing, true);
  assert.equal(view(nav, at3).total, null);
  assert.equal(repeatCountFor(G1, "M"), null);
  assert.equal(repeatCountFor(G1, "S"), 3);
});

test("previous retraces the forward path exactly, across pass and group boundaries", () => {
  const nav = navFor("S");
  const path = walk(nav, 2);
  for (let i = path.length - 1; i > 0; i--) {
    const back = prev(nav, path[i].p)!;
    assert.equal(where(nav, back), path[i - 1].label, `back from ${path[i].label}`);
  }
  assert.equal(prev(nav, path[0].p), null);
});

test("previous: pass boundary, intro, and re-entering a finished group keeps its final pass and tick", () => {
  const nav = navFor("S");
  const path = walk(nav, 2);
  const p = (label: string) => path.find((x) => x.label === label)!.p;
  assert.equal(where(nav, prev(nav, p("s3/p3"))!), "s4/p2");
  assert.equal(where(nav, prev(nav, p("s3/p1"))!), "s2");
  const back = prev(nav, p("s9"))!;
  assert.equal(where(nav, back), "s8/p2");
  assert.equal(view(nav, back).conditionTicked, true);
  assert.equal(where(nav, prev(nav, p("s5"))!), "s4/p3");
});

test("re-entering a group through its intro restarts at pass 1", () => {
  const nav = navFor("S");
  const path = walk(nav, 2);
  const atIntro = path.find((x) => x.label === "s2")!.p;
  const entered = next(nav, { ...path.find((x) => x.label === "s5")!.p, current_step_id: "s2" })!;
  assert.equal(where(nav, entered), "s3/p1");
  assert.equal(where(nav, next(nav, atIntro)!), "s3/p1");
});

test("a size-specific step inside a group changes which step ends the pass", () => {
  const steps: Step[] = [note(1, "G1"), body(2, "G1", 1), body(3, "G1", 2, { applies_to_sizes: ["L"] }), mk(4)];
  const small = createNav(stepsForSize(steps, "S"), groups, "S");
  const large = createNav(stepsForSize(steps, "L"), groups, "L");
  const two = { ...emptyProgress(), current_step_id: "s2", repeat_pass_counts: { G1: 1 } };
  assert.equal(view(small, two).isEndOfPass, true);
  assert.equal(view(large, two).isEndOfPass, false);
});

test("an unknown current_step_id falls back to the first step", () => {
  const nav = navFor("S");
  assert.equal(view(nav, { ...emptyProgress(), current_step_id: "nope" }).step.id, "s1");
  assert.equal(next(nav, emptyProgress())!.current_step_id, "s2");
});

test("next is null on the last step, prev is null on the first", () => {
  const nav = navFor("S");
  assert.equal(next(nav, { ...emptyProgress(), current_step_id: "s10" }), null);
  assert.equal(prev(nav, emptyProgress()), null);
});

test("checkpointCounts: total first, every label, underscores as spaces, missing values flagged", () => {
  assert.deepEqual(checkpointCounts(all[8].stitch_count, "S"), [
    { label: "total", value: "100" }, { label: "sleeve", value: "20" }, { label: "front back", value: "30" },
  ]);
  const withGap = checkpointCounts({ sleeve: { S: 5 }, total: { S: 9, M: 10 } }, "M")!;
  assert.deepEqual(withGap, [{ label: "total", value: "10" }, { label: "sleeve", value: null }]);
  assert.equal(checkpointCounts(null, "S"), null);
  assert.equal(checkpointCounts({}, "S"), null);
});

test("jumpTo a plain step or an intro clears all repeat state", () => {
  const nav = navFor("S");
  for (const id of ["s1", "s2", "s5", "s6"]) {
    const p = jumpTo(nav, nav.steps.findIndex((s) => s.id === id));
    assert.equal(p.current_step_id, id);
    assert.deepEqual(p.repeat_pass_counts, {});
    assert.deepEqual(p.checkbox_states, {});
  }
});

test("jumpTo a body step sets that group's pass, defaults to 1, and clamps to the count", () => {
  const nav = navFor("S");
  const i = nav.steps.findIndex((s) => s.id === "s4");
  assert.equal(where(nav, jumpTo(nav, i)), "s4/p1");
  assert.equal(where(nav, jumpTo(nav, i, 2)), "s4/p2");
  assert.equal(where(nav, jumpTo(nav, i, 99)), "s4/p3");
  assert.equal(where(nav, jumpTo(nav, i, 0)), "s4/p1");
  assert.equal(where(nav, jumpTo(nav, i, 1.5)), "s4/p1");
  assert.deepEqual(jumpTo(nav, i, 2).repeat_pass_counts, { G1: 2 });
});

test("jumpTo a condition-group body step has no upper bound and an unticked checkbox", () => {
  const nav = navFor("S");
  const i = nav.steps.findIndex((s) => s.id === "s8");
  const p = jumpTo(nav, i, 12);
  assert.equal(where(nav, p), "s8/p12");
  assert.equal(view(nav, p).conditionTicked, false);
  assert.deepEqual(p.checkbox_states, { G2: false });
});

test("jumping into a group then stepping continues normally and back out lands on the final pass", () => {
  const nav = navFor("S");
  const p = jumpTo(nav, nav.steps.findIndex((s) => s.id === "s3"), 3);
  assert.equal(where(nav, next(nav, p)!), "s4/p3");
  assert.equal(where(nav, next(nav, next(nav, p)!)!), "s5");
  // Jump past G1 having visited it earlier, then Previous: final pass, not a stale one.
  const past = jumpTo(nav, nav.steps.findIndex((s) => s.id === "s5"));
  assert.equal(where(nav, prev(nav, past)!), "s4/p3");
});

test("passRange: null outside group bodies, count max for count groups, null max for condition groups", () => {
  const nav = navFor("S");
  const at = (id: string) => nav.steps.findIndex((s) => s.id === id);
  assert.equal(passRange(nav, at("s1")), null);
  assert.equal(passRange(nav, at("s2")), null);
  assert.deepEqual(passRange(nav, at("s3")), { max: 3 });
  assert.deepEqual(passRange(nav, at("s7")), { max: null });
});

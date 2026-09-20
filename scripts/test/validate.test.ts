import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseAndValidate } from "../lib/validate.ts";
import type { DictionaryEntry } from "../lib/model.ts";

const FIXTURE_DIR = join(import.meta.dirname, "fixture");

// Mirrors the subset of the real seeded stitch_dictionary
// (supabase/migrations/20260920021600_seed_stitch_dictionary.sql) that the
// fixture pattern's stitch_instructions actually use.
const GLOBAL_DICT: DictionaryEntry[] = [
  { abbreviation: "k", kind: "stitch" },
  { abbreviation: "p", kind: "stitch" },
  { abbreviation: "m1l", kind: "stitch" },
  { abbreviation: "m1r", kind: "stitch" },
  { abbreviation: "sl", kind: "stitch" },
  { abbreviation: "ssk", kind: "stitch" },
  { abbreviation: "k2tog", kind: "stitch" },
  { abbreviation: "co", kind: "technique" },
];

test("fixture pattern validates cleanly and parses as expected", () => {
  const { errors, warnings, data } = parseAndValidate(FIXTURE_DIR, GLOBAL_DICT);

  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].message, /"co" shadows a global stitch_dictionary entry/);

  assert.ok(data);
  assert.equal(data.pattern.slug, "test-swatch");
  assert.equal(data.sizes.length, 2);
  assert.equal(data.stitchEntries.length, 2);
  assert.equal(data.repeatGroups.length, 2);
  assert.equal(data.steps.length, 17);

  const sleeveInc = data.repeatGroups.find((g) => g.groupKey === "sleeve_inc");
  assert.deepEqual(sleeveInc?.repeatCount, { S: 2, M: 3 });
  assert.equal(sleeveInc?.repeatCondition, null);

  const flap = data.repeatGroups.find((g) => g.groupKey === "flap");
  assert.equal(flap?.repeatCount, null);
  assert.deepEqual(flap?.sizeParams, { LEN: { S: '1.5"/4 cm', M: '1.75"/4.5 cm' } });

  const checkpoint = data.steps.find((s) => s.stepType === "checkpoint");
  assert.deepEqual(checkpoint?.stitchCount, {
    total: { S: 40, M: 48 },
    partA: { S: 20, M: 24 },
    partB: { S: 20, M: 24 },
  });
});

function makePatternDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "yarnchive-import-test-"));
  const base = {
    "pattern.csv": "slug,name,designer,is_paid,source_link\ntest,Test,Someone,FALSE,\n",
    "sizes.csv": "label,display_order\nS,1\nM,2\n",
    "stitch_entries.csv": "kind,abbreviation,name,definition,link\n",
    "repeat_groups.csv": "group_key,repeat_condition,last_repeat_note\n",
    "steps.csv": "step_order,step_type,section,subsection,row_or_round,side,applies_to_sizes,instructions_before,stitch_instructions,instructions_after,repeat_group_key,repeat_step_number,link,errata_note\n",
  };
  for (const [name, content] of Object.entries({ ...base, ...files })) {
    writeFileSync(join(dir, name), content);
  }
  return dir;
}

test("rule 1: unknown size label in applies_to_sizes is an error", () => {
  const dir = makePatternDir({
    "steps.csv":
      "step_order,step_type,section,subsection,row_or_round,side,applies_to_sizes,instructions_before,stitch_instructions,instructions_after,repeat_group_key,repeat_step_number,link,errata_note\n" +
      "1,instruction,Body,,,,XL,Turn.,k,,,,,\n",
  });
  const { errors } = parseAndValidate(dir, GLOBAL_DICT);
  assert.ok(errors.some((e) => /unknown size label "XL"/.test(e.message)));
});

test("rule 2: two rows can't claim the same size at the same step_order", () => {
  const dir = makePatternDir({
    "steps.csv":
      "step_order,step_type,section,subsection,row_or_round,side,applies_to_sizes,instructions_before,stitch_instructions,instructions_after,repeat_group_key,repeat_step_number,link,errata_note\n" +
      "1,instruction,Body,,,,S,First.,,,,,,\n" +
      "1,instruction,Body,,,,S,Second.,,,,,,\n",
  });
  const { errors } = parseAndValidate(dir, GLOBAL_DICT);
  assert.ok(errors.some((e) => /also claimed by row/.test(e.message)));
});

test("rule 3: a repeat group needs exactly one of repeat_condition / repeat_count_*", () => {
  const neither = makePatternDir({
    "repeat_groups.csv": "group_key,repeat_condition,last_repeat_note\nempty_group,,\n",
  });
  assert.ok(
    parseAndValidate(neither, GLOBAL_DICT).errors.some((e) => /found neither/.test(e.message)),
  );

  const both = makePatternDir({
    "repeat_groups.csv": "group_key,repeat_condition,last_repeat_note,repeat_count_S\nboth_group,Some condition,,2\n",
  });
  assert.ok(
    parseAndValidate(both, GLOBAL_DICT).errors.some((e) => /found both/.test(e.message)),
  );
});

test("rule 6: stitch_count columns are rejected on a non-checkpoint step", () => {
  const dir = makePatternDir({
    "steps.csv":
      "step_order,step_type,section,subsection,row_or_round,side,applies_to_sizes,instructions_before,stitch_instructions,instructions_after,repeat_group_key,repeat_step_number,link,errata_note,count_total_S\n" +
      "1,instruction,Body,,,,,Check.,,,,,,,40\n",
  });
  const { errors } = parseAndValidate(dir, GLOBAL_DICT);
  assert.ok(errors.some((e) => /only valid on checkpoint steps/.test(e.message)));
});

test("rule 7: every stitch-count label needs the same set of sizes", () => {
  const dir = makePatternDir({
    "steps.csv":
      "step_order,step_type,section,subsection,row_or_round,side,applies_to_sizes,instructions_before,stitch_instructions,instructions_after,repeat_group_key,repeat_step_number,link,errata_note,count_total_S,count_total_M,count_partA_S\n" +
      "1,checkpoint,Body,,,,,Check.,,,,,,,40,48,20\n",
  });
  const { errors } = parseAndValidate(dir, GLOBAL_DICT);
  assert.ok(errors.some((e) => /same set of sizes/.test(e.message)));
});

test("rule 11: a repeat group referenced with no intro note step is an error", () => {
  const dir = makePatternDir({
    "repeat_groups.csv": "group_key,repeat_condition,last_repeat_note,repeat_count_S,repeat_count_M\ng,,,2,2\n",
    "steps.csv":
      "step_order,step_type,section,subsection,row_or_round,side,applies_to_sizes,instructions_before,stitch_instructions,instructions_after,repeat_group_key,repeat_step_number,link,errata_note\n" +
      "1,instruction,Body,,,,,Round.,,,g,1,,\n",
  });
  const { errors } = parseAndValidate(dir, GLOBAL_DICT);
  assert.ok(errors.some((e) => /no intro note step/.test(e.message)));
});

test("an unresolvable stitch token is an error naming the token", () => {
  const dir = makePatternDir({
    "steps.csv":
      "step_order,step_type,section,subsection,row_or_round,side,applies_to_sizes,instructions_before,stitch_instructions,instructions_after,repeat_group_key,repeat_step_number,link,errata_note\n" +
      "1,instruction,Body,,,,,,zzqq,,,,,\n",
  });
  const { errors } = parseAndValidate(dir, GLOBAL_DICT);
  assert.ok(errors.some((e) => /unresolvable stitch token "zzqq"/.test(e.message)));
});

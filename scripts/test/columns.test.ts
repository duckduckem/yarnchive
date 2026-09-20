import { test } from "node:test";
import assert from "node:assert/strict";
import { extractSizeSuffixed, extractSubkeySizeSuffixed } from "../lib/columns.ts";

test("extractSizeSuffixed pulls prefix_SIZE columns, skipping blanks and other prefixes", () => {
  const fields = { repeat_count_S: "2", repeat_count_M: "3", repeat_count_L: "", param_LEN_S: "1\"", other: "x" };
  assert.deepEqual(extractSizeSuffixed(fields, "repeat_count"), { S: "2", M: "3" });
});

test("extractSubkeySizeSuffixed splits on the last underscore", () => {
  const fields = { param_LEN_S: "1\"", param_LEN_M: "2\"", param_N_S: "12", count_total_S: "40" };
  assert.deepEqual(extractSubkeySizeSuffixed(fields, "param"), {
    LEN: { S: "1\"", M: "2\"" },
    N: { S: "12" },
  });
});

test("extractSubkeySizeSuffixed ignores a column with no size part", () => {
  const fields = { param_LEN: "oops" };
  assert.deepEqual(extractSubkeySizeSuffixed(fields, "param"), {});
});

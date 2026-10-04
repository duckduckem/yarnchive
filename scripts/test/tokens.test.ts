import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveToken } from "../lib/tokens.ts";
import type { DictionaryEntry } from "../lib/model.ts";

const globalDict: DictionaryEntry[] = [
  { abbreviation: "k", kind: "stitch" },
  { abbreviation: "k2tog", kind: "stitch" },
  { abbreviation: "co", kind: "technique" },
];
const patternDict: DictionaryEntry[] = [{ abbreviation: "co", kind: "stitch" }];

test("resolves an exact match against the pattern's own entries before the global dictionary", () => {
  const result = resolveToken("co", patternDict, globalDict);
  assert.deepEqual(result, { token: "co", resolved: true, source: "pattern" });
});

test("resolves an exact match against the global dictionary", () => {
  const result = resolveToken("k2tog", [], globalDict);
  assert.equal(result.resolved, true);
  assert.equal(result.source, "global");
});

test("resolves pipe syntax [display|id] via the id", () => {
  const result = resolveToken("[dec evenly|k2tog]", [], globalDict);
  assert.equal(result.resolved, true);
  assert.equal(result.source, "global");
});

test("resolves trailing-digit stripping", () => {
  const result = resolveToken("k12", [], globalDict);
  assert.equal(result.resolved, true);
  assert.equal(result.source, "global");
});

test("a trailing {placeholder} resolves like a number", () => {
  const result = resolveToken("k{a}", [], globalDict);
  assert.equal(result.resolved, true);
  assert.equal(result.source, "global");
  assert.equal(resolveToken("k{LEN}", [], globalDict).resolved, true);
});

test("a placeholder doesn't make an unknown stitch resolve", () => {
  assert.equal(resolveToken("zz{a}", [], globalDict).resolved, false);
  assert.equal(resolveToken("{a}", [], globalDict).resolved, false);
});

test("reports an unresolvable token", () => {
  const result = resolveToken("xyz99", [], globalDict);
  assert.equal(result.resolved, false);
});

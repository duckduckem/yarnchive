import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyMove, resolveToken } from "../lib/tokens.ts";
import type { DictionaryEntry } from "../lib/model.ts";

const globalDict: DictionaryEntry[] = [
  { abbreviation: "k", kind: "stitch" },
  { abbreviation: "k2tog", kind: "stitch" },
  { abbreviation: "co", kind: "technique" },
  { abbreviation: "bo", kind: "technique" },
  { abbreviation: "turn", kind: "technique" },
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

test("resolveToken is case-insensitive", () => {
  assert.equal(resolveToken("K2TOG", [], globalDict).resolved, true);
  assert.equal(resolveToken("[Dec Evenly|K2tog]", [], globalDict).resolved, true);
});

test("classifyMove: abbreviation with connector text resolves on the first word", () => {
  assert.equal(classifyMove("BO {a} sts", [], globalDict).kind, "abbreviation");
  assert.equal(classifyMove("k to last {a} sts", [], globalDict).kind, "abbreviation");
});

test("classifyMove: abbreviation lookup is case-insensitive", () => {
  for (const move of ["BO {a} sts", "bo {a} sts", "Bo {a} sts", "K2TOG"]) {
    assert.equal(classifyMove(move, [], globalDict).kind, "abbreviation", move);
  }
});

test("classifyMove: a placeholder first word resolves like a number", () => {
  assert.equal(classifyMove("k{a} then more", [], globalDict).kind, "abbreviation");
  assert.equal(classifyMove("zz{a} sts", [], globalDict).kind, "unknown");
});

test("classifyMove: a leading pipe unit is the leading abbreviation", () => {
  const result = classifyMove("[dec evenly|k2tog] across the row", [], globalDict);
  assert.equal(result.kind, "abbreviation");
  assert.equal(result.firstWord, "[dec evenly|k2tog]");
  assert.equal(classifyMove("[dec evenly|zzqq] across", [], globalDict).kind, "unknown");
});

test("classifyMove: an allowlisted plain action is valid display text", () => {
  assert.equal(classifyMove("remove BOR marker", [], globalDict).kind, "action");
  assert.equal(classifyMove("Place marker", [], globalDict).kind, "action");
});

test("classifyMove: a known abbreviation wins over the allowlist", () => {
  assert.equal(classifyMove("turn work", [], globalDict).kind, "abbreviation");
});

test("classifyMove: any other first word is unknown", () => {
  const result = classifyMove("Frobnicate the yarn", [], globalDict);
  assert.deepEqual(result, { kind: "unknown", firstWord: "Frobnicate" });
});

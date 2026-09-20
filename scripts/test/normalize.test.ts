import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeStitchInstructions, toTitleCase, tokenize } from "../lib/normalize.ts";

test("toTitleCase capitalizes each word but keeps minor words lowercase mid-phrase", () => {
  assert.equal(toTitleCase("join sleeves and body"), "Join Sleeves and Body");
  assert.equal(toTitleCase("increases"), "Increases");
});

test("toTitleCase capitalizes a minor word when it's the first word", () => {
  assert.equal(toTitleCase("and then some"), "And Then Some");
});

test("normalizeStitchInstructions lowercases, trims, and drops empty tokens", () => {
  assert.equal(normalizeStitchInstructions(" K1,  M1L ,k1, m1r,k1"), "k1, m1l, k1, m1r, k1");
});

test("tokenize splits a normalized instruction string back into tokens", () => {
  assert.deepEqual(tokenize("k1, m1l, k1"), ["k1", "m1l", "k1"]);
});

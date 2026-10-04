import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeStitchInstructions, splitMoves, toTitleCase } from "../lib/normalize.ts";

test("toTitleCase capitalizes each word but keeps minor words lowercase mid-phrase", () => {
  assert.equal(toTitleCase("join sleeves and body"), "Join Sleeves and Body");
  assert.equal(toTitleCase("increases"), "Increases");
});

test("toTitleCase capitalizes a minor word when it's the first word", () => {
  assert.equal(toTitleCase("and then some"), "And Then Some");
});

test("normalizeStitchInstructions trims and drops empty moves but preserves case", () => {
  assert.equal(normalizeStitchInstructions(" K1,  M1L ,,k to last {a} sts, BO {A} sts"), "K1, M1L, k to last {a} sts, BO {A} sts");
});

test("splitMoves splits an instruction string back into moves", () => {
  assert.deepEqual(splitMoves("k1, BO {a} sts, remove marker"), ["k1", "BO {a} sts", "remove marker"]);
});

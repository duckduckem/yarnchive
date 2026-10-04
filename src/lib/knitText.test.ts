import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDictionary, fillPlaceholders, highlightNumbers, lookupWord, moveWords,
  splitMoves, stepsForSize, type Step,
} from "./knitText.ts";

const row = (abbreviation: string, definition: string) => ({ abbreviation, name: abbreviation, definition, link: null });
const dict = buildDictionary(
  [row("mfsp", "pattern stitch"), row("k", "pattern knit")],
  [row("k", "global knit"), row("sl", "slip"), row("wyif", "with yarn in front"), row("bo", "bind off")],
);

const step = (step_order: number, applies_to_sizes: string[] | null) =>
  ({ step_order, applies_to_sizes }) as Step;

test("stepsForSize keeps null/empty and matching rows, in step_order", () => {
  const out = stepsForSize([step(3, ["M"]), step(1, null), step(2, []), step(4, ["S", "XL"])], "S");
  assert.deepEqual(out.map((s) => s.step_order), [1, 2, 4]);
});

const params = { N: { S: 4, M: 6 }, LEN: { S: '6"/15 cm', M: "" } };

test("fillPlaceholders fills the chosen size", () => {
  assert.deepEqual(fillPlaceholders("k to last {N} sts", params, "S"), [{ kind: "text", text: "k to last " }, { kind: "text", text: "4" }, { kind: "text", text: " sts" }]);
});

test("fillPlaceholders marks missing values (absent key, blank, absent size, null params); names are case-sensitive", () => {
  const missing = (t: string, p: typeof params | null, size: string) => fillPlaceholders(t, p, size).filter((s) => s.kind === "missing");
  assert.equal(missing("{X}", params, "S").length, 1);
  assert.equal(missing("{LEN}", params, "M").length, 1);
  assert.equal(missing("{N}", params, "XL").length, 1);
  assert.equal(missing("{N}", null, "S").length, 1);
  assert.equal(missing("{n}", params, "S").length, 1);
});

test("highlightNumbers splits digits and leaves missing placeholders alone", () => {
  const pieces = highlightNumbers(fillPlaceholders("k{N}, {X}", params, "S"));
  assert.deepEqual(pieces, [{ kind: "text", text: "k" }, { kind: "number", text: "4" }, { kind: "text", text: ", " }, { kind: "missing", name: "X" }]);
});

test("splitMoves splits on commas, trims, drops empties, keeps case", () => {
  assert.deepEqual(splitMoves(" K2tog ,, sl1 wyif,  "), ["K2tog", "sl1 wyif"]);
  assert.deepEqual(splitMoves(null), []);
});

test("lookupWord: pattern entries beat global, case-insensitive", () => {
  assert.equal(lookupWord("K", dict)?.definition, "pattern knit");
  assert.equal(lookupWord("BO", dict)?.source, "global");
});

test("lookupWord: digit and placeholder stripping, pipe id, no match", () => {
  assert.equal(lookupWord("sl1", dict)?.abbreviation, "sl");
  assert.equal(lookupWord("k{a}", dict)?.abbreviation, "k");
  assert.equal(lookupWord("[mfs|mfsp]", dict)?.abbreviation, "mfsp");
  assert.equal(lookupWord("3", dict), null);
  assert.equal(lookupWord("sts", dict), null);
});

test("moveWords: every recognized word gets a definition, not just the first", () => {
  const words = moveWords("sl1 wyif", null, "S", dict);
  assert.deepEqual(words.map((w) => w.definition?.abbreviation), ["sl", "wyif"]);
});

test("moveWords: lookup uses unsubstituted text, display is substituted; pipe shows display part", () => {
  const [first, , , , last] = moveWords("k{N} to last {X} sts", params, "S", dict);
  assert.equal(first.definition?.abbreviation, "k");
  assert.ok(first.pieces.some((p) => p.kind === "number" && p.text === "4"));
  assert.equal(last.definition, null);
  const [piped] = moveWords("[mfs|mfsp]", null, "S", dict);
  assert.equal(piped.pieces[0].kind === "text" && piped.pieces[0].text, "mfs");
  assert.equal(piped.definition?.abbreviation, "mfsp");
});

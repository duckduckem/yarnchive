// Mechanical fixes the import script applies rather than rejecting
// (specs/schema-v1.md §6, rule 9): Title Case for section/subsection/
// row_or_round, lowercase comma-separated tokens for stitch_instructions.

const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "if", "in",
  "nor", "of", "on", "or", "so", "the", "to", "up", "yet",
]);

export function toTitleCase(text: string): string {
  const words = text.split(" ");
  return words
    .map((word, i) => {
      if (word === "") return word;
      const lower = word.toLowerCase();
      if (i !== 0 && i !== words.length - 1 && MINOR_WORDS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/** Splits on commas, trims, lowercases, drops empty tokens, rejoins with ", ". */
export function normalizeStitchInstructions(text: string): string {
  return text
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0)
    .join(", ");
}

export function tokenize(normalizedInstructions: string): string[] {
  return normalizedInstructions
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

// Mechanical fixes the import script applies rather than rejecting
// (specs/schema-v1.md §6, rule 9): Title Case for section/subsection/
// row_or_round, comma-separated moves (case preserved) for stitch_instructions.

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

/** Splits on commas, trims, drops empty moves, rejoins with ", ". Case is preserved (spec §1). */
export function normalizeStitchInstructions(text: string): string {
  return text
    .split(",")
    .map((move) => move.trim())
    .filter((move) => move.length > 0)
    .join(", ");
}

export function splitMoves(normalizedInstructions: string): string[] {
  return normalizedInstructions
    .split(",")
    .map((move) => move.trim())
    .filter((move) => move.length > 0);
}

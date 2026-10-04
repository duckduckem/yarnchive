// Plain-action first words that make a stitch_instructions move valid display
// text without a dictionary definition (specs/schema-v1.md §1, rule 13).
// Lowercase; lookup is case-insensitive. Extend as real patterns need it.
export const PLAIN_ACTIONS: ReadonlySet<string> = new Set([
  "knit", "purl", "work", "place", "remove", "cut", "slip", "turn",
  "bind", "cast", "increase", "decrease", "join", "repeat", "continue",
  "pick", "use", "switch", "change", "wrap", "transfer", "sew", "weave",
  "thread", "graft", "move", "hold", "drop", "pass", "end", "begin",
  "divide", "set", "rejoin", "slide", "break", "finish", "start",
]);

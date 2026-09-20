// Dynamic per-size column parsing (scripts/template/GUIDE.md, "No JSON, no
// UUIDs"). Column names look like `<prefix>_<SIZE>` or
// `<prefix>_<SUBKEY>_<SIZE>`; the guide requires size labels and sub-keys to
// contain no underscores, which is what makes splitting on `_` unambiguous.

/** Every column named `<prefix>_<SIZE>` with a non-blank value, as {size: value}. */
export function extractSizeSuffixed(
  fields: Record<string, string>,
  prefix: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  const withUnderscore = `${prefix}_`;
  for (const [key, value] of Object.entries(fields)) {
    if (!value || !key.startsWith(withUnderscore)) continue;
    const size = key.slice(withUnderscore.length);
    if (size.length === 0) continue;
    result[size] = value;
  }
  return result;
}

/**
 * Every column named `<prefix>_<SUBKEY>_<SIZE>` with a non-blank value, as
 * {subkey: {size: value}}. Splits on the LAST underscore, so the sub-key
 * (a placeholder name or a stitch-count label) can't itself contain one.
 */
export function extractSubkeySizeSuffixed(
  fields: Record<string, string>,
  prefix: string,
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  const withUnderscore = `${prefix}_`;
  for (const [key, value] of Object.entries(fields)) {
    if (!value || !key.startsWith(withUnderscore)) continue;
    const rest = key.slice(withUnderscore.length);
    const splitAt = rest.lastIndexOf("_");
    if (splitAt <= 0 || splitAt === rest.length - 1) continue; // no subkey or no size part
    const subkey = rest.slice(0, splitAt);
    const size = rest.slice(splitAt + 1);
    (result[subkey] ??= {})[size] = value;
  }
  return result;
}

/** Column names actually used by any of the three dynamic conventions above. */
export function isDynamicColumn(key: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => key.startsWith(`${prefix}_`));
}

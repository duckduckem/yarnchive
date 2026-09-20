import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";

export interface CsvRow {
  /** 1-based, matching the row as it appears in a spreadsheet (header is row 1). */
  row: number;
  fields: Record<string, string>;
}

/** Reads and parses one CSV file. Returns [] if the file doesn't exist (the optional tabs). */
export function readCsv(dir: string, filename: string): CsvRow[] {
  const path = join(dir, filename);
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf-8");
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as Record<string, string>[];
  return records.map((fields, i) => ({ row: i + 2, fields }));
}

/** A field value, or null when blank/absent — CSVs have no way to distinguish "" from missing. */
export function field(fields: Record<string, string>, name: string): string | null {
  const value = fields[name];
  return value === undefined || value === "" ? null : value;
}

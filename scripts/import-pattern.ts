#!/usr/bin/env -S npx tsx
// M1.3 import script. Usage:
//   npm run import -- --dir patterns-private/nurtured [--dry-run] [--replace]
//
// Validates a pattern folder's 5 CSVs (specs/schema-v1.md §6) and, unless
// --dry-run, writes patterns/pattern_sizes/pattern_stitch_entries/
// repeat_groups/steps in one transaction. See scripts/template/GUIDE.md for
// the file format and scripts/lib/db.ts for why this connects to Postgres
// directly instead of going through @supabase/supabase-js.

import { parseArgs } from "node:util";
import { existsSync } from "node:fs";
import { connect, fetchGlobalDictionary, findExistingPatternId, resolveUserId, writeImport } from "./lib/db.ts";
import { parseAndValidate } from "./lib/validate.ts";
import type { Issue } from "./lib/model.ts";

function printIssues(heading: string, issues: Issue[]): void {
  if (issues.length === 0) return;
  console.log(`\n${heading}:`);
  const byFile = new Map<string, Issue[]>();
  for (const issue of issues) {
    const fileIssues = byFile.get(issue.file);
    if (fileIssues) {
      fileIssues.push(issue);
    } else {
      byFile.set(issue.file, [issue]);
    }
  }
  for (const [file, fileIssues] of byFile) {
    console.log(`  ${file}:`);
    for (const issue of fileIssues) {
      const where = issue.row === null ? "" : `row ${issue.row}: `;
      console.log(`    ${where}${issue.message}`);
    }
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      dir: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      replace: { type: "boolean", default: false },
    },
  });

  if (!values.dir) {
    console.error("Usage: npm run import -- --dir <pattern-folder> [--dry-run] [--replace]");
    process.exitCode = 1;
    return;
  }
  if (!existsSync(values.dir)) {
    console.error(`Directory not found: ${values.dir}`);
    process.exitCode = 1;
    return;
  }

  process.loadEnvFile(".env.local");
  const databaseUrl = process.env.SUPABASE_DB_URL;
  const userEmail = process.env.IMPORT_USER_EMAIL;
  if (!databaseUrl) {
    console.error("SUPABASE_DB_URL is not set in .env.local (Project Settings > Database > Connection string > URI).");
    process.exitCode = 1;
    return;
  }
  if (!userEmail) {
    console.error("IMPORT_USER_EMAIL is not set in .env.local.");
    process.exitCode = 1;
    return;
  }

  const sql = connect(databaseUrl);
  try {
    const [userId, globalDictionary] = await Promise.all([
      resolveUserId(sql, userEmail),
      fetchGlobalDictionary(sql),
    ]);

    const { errors, warnings, data } = parseAndValidate(values.dir, globalDictionary);

    let existingPatternId: string | null = null;
    if (data) {
      existingPatternId = await findExistingPatternId(sql, userId, data.pattern.slug);
      if (existingPatternId && !values.replace) {
        errors.push({
          file: "pattern.csv",
          row: null,
          message: `a pattern with slug "${data.pattern.slug}" already exists -- pass --replace to update it`,
        });
      }
    }

    printIssues("Errors", errors);
    printIssues("Warnings", warnings);

    if (errors.length > 0 || !data) {
      console.log(`\n${errors.length} error(s). Nothing was written.`);
      process.exitCode = 1;
      return;
    }

    const action = existingPatternId ? "replace" : "import";
    if (values["dry-run"]) {
      console.log(
        `\nDry run OK -- would ${action}: 1 pattern ("${data.pattern.name}"), ${data.sizes.length} size(s), ` +
          `${data.stitchEntries.length} stitch entr${data.stitchEntries.length === 1 ? "y" : "ies"}, ` +
          `${data.repeatGroups.length} repeat group(s), ${data.steps.length} step(s). Nothing was written.`,
      );
      return;
    }

    const summary = await writeImport(sql, userId, data, { existingPatternId });
    console.log(
      `\n${summary.replaced ? "Replaced" : "Imported"} pattern ${summary.patternId} -- ` +
        `${summary.sizes} size(s), ${summary.stitchEntries} stitch entry/entries, ` +
        `${summary.repeatGroups} repeat group(s), ${summary.steps} step(s).`,
    );
  } finally {
    await sql.end({ timeout: 3 });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

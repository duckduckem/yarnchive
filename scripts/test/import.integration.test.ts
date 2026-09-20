// Exercises the real CLI (scripts/import-pattern.ts) against a live Postgres
// connection: dry-run, a real import, a rejected re-import, then --replace.
// Needs SUPABASE_DB_URL and IMPORT_USER_EMAIL in .env.local -- skips itself
// (not a failure) when they aren't set, since that's local, personal
// configuration this repo never ships a value for.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import postgres from "postgres";

const REPO_ROOT = join(import.meta.dirname, "..", "..");
const FIXTURE_DIR = join(import.meta.dirname, "fixture");

try {
  process.loadEnvFile(join(REPO_ROOT, ".env.local"));
} catch {
  // No .env.local -- env vars may already be set another way (e.g. CI).
}

const databaseUrl = process.env.SUPABASE_DB_URL;
const userEmail = process.env.IMPORT_USER_EMAIL;
const canRun = Boolean(databaseUrl && userEmail);
const skipReason = canRun
  ? false
  : "SUPABASE_DB_URL / IMPORT_USER_EMAIL not set in .env.local -- fill those in to exercise the live import path";

function runImportCli(args: string[]): { status: number | null; output: string } {
  const result = spawnSync("node", ["--import", "tsx", "scripts/import-pattern.ts", ...args], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

test("import-pattern.ts against the fixture pattern", { skip: skipReason }, async (t) => {
  // eslint/TS can't see that `skip` above already guarantees these -- they're
  // only read when canRun is true.
  const sql = postgres(databaseUrl as string, { max: 1 });
  const userRows = await sql<{ id: string }[]>`select id from auth.users where email = ${userEmail as string}`;
  assert.ok(userRows.length > 0, `no auth.users row for "${userEmail}"`);
  const userId = userRows[0].id;

  const countPatterns = async (): Promise<number> => {
    const rows = await sql<{ n: string }[]>`
      select count(*)::text as n from patterns where user_id = ${userId} and slug = 'test-swatch'
    `;
    return Number(rows[0].n);
  };
  const countSteps = async (): Promise<number> => {
    const rows = await sql<{ n: string }[]>`
      select count(*)::text as n from steps s
      join patterns p on p.id = s.pattern_id
      where p.user_id = ${userId} and p.slug = 'test-swatch'
    `;
    return Number(rows[0].n);
  };
  const cleanup = async (): Promise<void> => {
    await sql`delete from patterns where user_id = ${userId} and slug = 'test-swatch'`;
  };

  await cleanup();
  t.after(async () => {
    await cleanup();
    await sql.end();
  });

  await t.test("dry run reports success and writes nothing", async () => {
    const result = runImportCli(["--dir", FIXTURE_DIR, "--dry-run"]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Dry run OK/);
    assert.equal(await countPatterns(), 0);
  });

  await t.test("a real import writes the pattern and all its children", async () => {
    const result = runImportCli(["--dir", FIXTURE_DIR]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Imported pattern/);
    assert.equal(await countPatterns(), 1);
    assert.equal(await countSteps(), 17);
  });

  await t.test("importing again without --replace fails and writes nothing new", async () => {
    const result = runImportCli(["--dir", FIXTURE_DIR]);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /already exists/);
    assert.equal(await countPatterns(), 1);
  });

  await t.test("--replace keeps the pattern id but refreshes its children", async () => {
    const before = await sql<{ id: string }[]>`
      select id from patterns where user_id = ${userId} and slug = 'test-swatch'
    `;
    const result = runImportCli(["--dir", FIXTURE_DIR, "--replace"]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Replaced pattern/);
    const after = await sql<{ id: string }[]>`
      select id from patterns where user_id = ${userId} and slug = 'test-swatch'
    `;
    assert.equal(after[0].id, before[0].id, "pattern id must survive a --replace");
    assert.equal(await countSteps(), 17);
  });
});

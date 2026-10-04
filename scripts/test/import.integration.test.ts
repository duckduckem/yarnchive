// Exercises the real CLI (scripts/import-pattern.ts) against a live Postgres
// connection: dry-run, a real import, a rejected re-import, then --replace.
// Needs SUPABASE_DB_URL and IMPORT_USER_EMAIL in .env.local -- skips itself
// (not a failure) when they aren't set, since that's local, personal
// configuration this repo never ships a value for.
//
// Every DB check below opens its own short-lived connection and closes it
// immediately (withDb), rather than holding one open for the whole test --
// each `spawnSync` below launches import-pattern.ts as a *separate* process
// that opens its own connection, and Supabase's session pooler (port 5432)
// reserves a dedicated backend connection per client for its whole session.
// Keeping a parent connection open the entire time needlessly ties up a pool
// slot while those child connections are also trying to connect.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

/** Opens a connection, runs `fn`, and always closes it again before returning -- see file header. */
async function withDb<T>(fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(databaseUrl as string, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    connection: { statement_timeout: 15_000, lock_timeout: 10_000 },
  });
  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 3 });
  }
}

test("import-pattern.ts against the fixture pattern", { skip: skipReason }, async (t) => {
  const userId = await withDb(async (sql) => {
    const rows = await sql<{ id: string }[]>`select id from auth.users where email = ${userEmail as string}`;
    assert.ok(rows.length > 0, `no auth.users row for "${userEmail}"`);
    return rows[0].id;
  });

  const countPatterns = (): Promise<number> =>
    withDb(async (sql) => {
      const rows = await sql<{ n: string }[]>`
        select count(*)::text as n from patterns where user_id = ${userId} and slug = 'test-swatch'
      `;
      return Number(rows[0].n);
    });

  const countSteps = (): Promise<number> =>
    withDb(async (sql) => {
      const rows = await sql<{ n: string }[]>`
        select count(*)::text as n from steps s
        join patterns p on p.id = s.pattern_id
        where p.user_id = ${userId} and p.slug = 'test-swatch'
      `;
      return Number(rows[0].n);
    });

  const patternId = (): Promise<string | null> =>
    withDb(async (sql) => {
      const rows = await sql<{ id: string }[]>`
        select id from patterns where user_id = ${userId} and slug = 'test-swatch'
      `;
      return rows[0]?.id ?? null;
    });

  const cleanup = (): Promise<void> =>
    withDb(async (sql) => {
      await sql`delete from patterns where user_id = ${userId} and slug = 'test-swatch'`;
    });

  await cleanup();
  t.after(cleanup);

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
    assert.equal(await countSteps(), 20);
  });

  await t.test("importing again without --replace fails and writes nothing new", async () => {
    const result = runImportCli(["--dir", FIXTURE_DIR]);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /already exists/);
    assert.equal(await countPatterns(), 1);
  });

  await t.test("--replace keeps the pattern id but refreshes its children", async () => {
    const before = await patternId();
    const result = runImportCli(["--dir", FIXTURE_DIR, "--replace"]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Replaced pattern/);
    assert.equal(await patternId(), before, "pattern id must survive a --replace");
    assert.equal(await countSteps(), 20);
  });
});

test("--replace keeps a project's place, blocks when it can't, and --reset-progress resets", { skip: skipReason }, async (t) => {
  const userId = await withDb(async (sql) => (await sql<{ id: string }[]>`select id from auth.users where email = ${userEmail as string}`)[0].id);
  const cleanup = (): Promise<void> =>
    withDb(async (sql) => {
      await sql`delete from patterns where user_id = ${userId} and slug = 'test-swatch'`;
    });
  await cleanup();
  const scratch = mkdtempSync(join(tmpdir(), "yarnchive-replace-"));
  t.after(async () => {
    await cleanup();
    rmSync(scratch, { recursive: true, force: true });
  });

  assert.equal(runImportCli(["--dir", FIXTURE_DIR]).status, 0);

  // A project sitting on pass 2 of the sleeve repeat group (fixture step_order 6).
  const progress = () =>
    withDb(async (sql) => {
      const rows = await sql<
        { id: string; current_step_id: string | null; repeat_pass_counts: Record<string, number>; step_order: number | null; repeat_group_id: string | null }[]
      >`
        select pp.id, pp.current_step_id, pp.repeat_pass_counts, s.step_order, s.repeat_group_id
        from project_progress pp
        join projects pr on pr.id = pp.project_id
        join patterns p on p.id = pr.pattern_id
        left join steps s on s.id = pp.current_step_id
        where p.user_id = ${userId} and p.slug = 'test-swatch'
      `;
      return rows[0];
    });
  await withDb(async (sql) => {
    const [pattern] = await sql<{ id: string }[]>`select id from patterns where user_id = ${userId} and slug = 'test-swatch'`;
    const [step] = await sql<{ id: string; repeat_group_id: string }[]>`
      select id, repeat_group_id from steps where pattern_id = ${pattern.id} and step_order = 6
    `;
    const [project] = await sql<{ id: string }[]>`
      insert into projects (user_id, pattern_id, size_label) values (${userId}, ${pattern.id}, 'S') returning id
    `;
    await sql`
      insert into project_progress (user_id, project_id, current_step_id, repeat_pass_counts)
      values (${userId}, ${project.id}, ${step.id}, ${sql.json({ [step.repeat_group_id]: 2 })})
    `;
  });
  const before = await progress();

  await t.test("--replace with unchanged data keeps the place and re-keys the pass count", async () => {
    const dry = runImportCli(["--dir", FIXTURE_DIR, "--replace", "--dry-run"]);
    assert.equal(dry.status, 0, dry.output);
    assert.match(dry.output, /1 would keep their place, 0 would be reset/);

    const result = runImportCli(["--dir", FIXTURE_DIR, "--replace"]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /1 kept their place, 0 reset/);
    const after = await progress();
    assert.equal(after.step_order, 6);
    assert.notEqual(after.current_step_id, before.current_step_id, "steps were recreated, so the id changes");
    assert.deepEqual(after.repeat_pass_counts, { [after.repeat_group_id as string]: 2 });
  });

  // Same data but step_order 6 relabeled: the place can no longer be trusted.
  for (const file of readdirSync(FIXTURE_DIR)) cpSync(join(FIXTURE_DIR, file), join(scratch, file));
  writeFileSync(join(scratch, "steps.csv"), readFileSync(join(scratch, "steps.csv"), "utf-8").replace("6,instruction,Sleeve,Increases,Round 2,", "6,instruction,Sleeve,Increases,Round 9,"));
  const stepsBefore = await withDb(async (sql) => Number((await sql<{ n: string }[]>`select count(*)::text as n from steps s join patterns p on p.id = s.pattern_id where p.user_id = ${userId} and p.slug = 'test-swatch'`)[0].n));

  await t.test("a mismatch fails before deleting anything", async () => {
    const kept = await progress();
    const result = runImportCli(["--dir", scratch, "--replace"]);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /Nothing was written/);
    assert.match(result.output, /--reset-progress/);
    assert.match(result.output, /Round 2/);
    const after = await progress();
    assert.equal(after.current_step_id, kept.current_step_id, "same step row, untouched");
    assert.equal(
      await withDb(async (sql) => Number((await sql<{ n: string }[]>`select count(*)::text as n from steps s join patterns p on p.id = s.pattern_id where p.user_id = ${userId} and p.slug = 'test-swatch'`)[0].n)),
      stepsBefore,
    );
  });

  await t.test("--reset-progress goes ahead and resets only that project to not started", async () => {
    const result = runImportCli(["--dir", scratch, "--replace", "--reset-progress"]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /0 kept their place, 1 reset/);
    const after = await progress();
    assert.equal(after.current_step_id, null);
    assert.deepEqual(after.repeat_pass_counts, {});
  });
});

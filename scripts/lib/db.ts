// Direct Postgres access for the import script (service-role connection
// string, not the app's usual @supabase/supabase-js + RLS path) -- needed for
// a real cross-table transaction. See docs/decisions.md, M1.3.

import { randomUUID } from "node:crypto";
import postgres from "postgres";
import type { DictionaryEntry, ParsedPatternFile } from "./model.ts";

export function connect(databaseUrl: string): postgres.Sql {
  return postgres(databaseUrl, {
    max: 1,
    connect_timeout: 10, // seconds -- fail fast instead of hanging on a bad connection
    idle_timeout: 5, // seconds
    connection: {
      statement_timeout: 15_000, // ms -- fail fast instead of hanging on a stuck query
      lock_timeout: 10_000, // ms -- fail fast instead of hanging on a held row lock
    },
  });
}

export async function resolveUserId(sql: postgres.Sql, email: string): Promise<string> {
  const rows = await sql<{ id: string }[]>`select id from auth.users where email = ${email}`;
  if (rows.length === 0) {
    throw new Error(`no auth.users row found for email "${email}" -- check IMPORT_USER_EMAIL in .env.local`);
  }
  return rows[0].id;
}

export async function fetchGlobalDictionary(sql: postgres.Sql): Promise<DictionaryEntry[]> {
  const rows = await sql<{ abbreviation: string; kind: string }[]>`
    select abbreviation, kind from stitch_dictionary
  `;
  return rows.map((r) => ({ abbreviation: r.abbreviation, kind: r.kind as DictionaryEntry["kind"] }));
}

export async function findExistingPatternId(sql: postgres.Sql, userId: string, slug: string): Promise<string | null> {
  const rows = await sql<{ id: string }[]>`
    select id from patterns where user_id = ${userId} and slug = ${slug}
  `;
  return rows[0]?.id ?? null;
}

export interface ImportSummary {
  patternId: string;
  replaced: boolean;
  sizes: number;
  stitchEntries: number;
  repeatGroups: number;
  steps: number;
}

export async function writeImport(
  outerSql: postgres.Sql,
  userId: string,
  data: ParsedPatternFile,
  options: { existingPatternId: string | null },
): Promise<ImportSummary> {
  return outerSql.begin(async (sql) => {
    let patternId = options.existingPatternId;

    if (patternId) {
      await sql`
        update patterns
        set name = ${data.pattern.name}, designer = ${data.pattern.designer},
            is_paid = ${data.pattern.isPaid}, source_link = ${data.pattern.sourceLink}
        where id = ${patternId} and user_id = ${userId}
      `;
      // FK-safe delete order: steps reference repeat_groups.
      await sql`delete from steps where pattern_id = ${patternId} and user_id = ${userId}`;
      await sql`delete from repeat_groups where pattern_id = ${patternId} and user_id = ${userId}`;
      await sql`delete from pattern_stitch_entries where pattern_id = ${patternId} and user_id = ${userId}`;
      await sql`delete from pattern_sizes where pattern_id = ${patternId} and user_id = ${userId}`;
    } else {
      patternId = randomUUID();
      await sql`
        insert into patterns (id, user_id, slug, name, designer, is_paid, source_link)
        values (${patternId}, ${userId}, ${data.pattern.slug}, ${data.pattern.name},
                ${data.pattern.designer}, ${data.pattern.isPaid}, ${data.pattern.sourceLink})
      `;
    }

    for (const size of data.sizes) {
      await sql`
        insert into pattern_sizes (id, user_id, pattern_id, label, display_order)
        values (${randomUUID()}, ${userId}, ${patternId}, ${size.label}, ${size.displayOrder})
      `;
    }

    for (const entry of data.stitchEntries) {
      await sql`
        insert into pattern_stitch_entries (id, user_id, pattern_id, kind, abbreviation, name, definition, link)
        values (${randomUUID()}, ${userId}, ${patternId}, ${entry.kind}, ${entry.abbreviation},
                ${entry.name}, ${entry.definition}, ${entry.link})
      `;
    }

    const groupIds = new Map<string, string>();
    for (const group of data.repeatGroups) {
      const id = randomUUID();
      groupIds.set(group.groupKey, id);
      const hasSizeParams = Object.keys(group.sizeParams).length > 0;
      await sql`
        insert into repeat_groups (id, user_id, pattern_id, repeat_count, repeat_condition, size_params, last_repeat_note)
        values (${id}, ${userId}, ${patternId},
                ${group.repeatCount ? sql.json(group.repeatCount) : null},
                ${group.repeatCondition},
                ${hasSizeParams ? sql.json(group.sizeParams) : null},
                ${group.lastRepeatNote})
      `;
    }

    for (const step of data.steps) {
      const repeatGroupId = step.repeatGroupKey ? (groupIds.get(step.repeatGroupKey) ?? null) : null;
      const hasSizeParams = Object.keys(step.sizeParams).length > 0;
      const hasStitchCount = Object.keys(step.stitchCount).length > 0;
      await sql`
        insert into steps (
          id, user_id, pattern_id, step_order, step_type, section, subsection, row_or_round, side,
          instructions_before, stitch_instructions, instructions_after, size_params, stitch_count,
          applies_to_sizes, repeat_group_id, repeat_step_number, link, errata_note
        ) values (
          ${randomUUID()}, ${userId}, ${patternId}, ${step.stepOrder}, ${step.stepType}, ${step.section},
          ${step.subsection}, ${step.rowOrRound}, ${step.side},
          ${step.instructionsBefore}, ${step.stitchInstructions}, ${step.instructionsAfter},
          ${hasSizeParams ? sql.json(step.sizeParams) : null},
          ${hasStitchCount ? sql.json(step.stitchCount) : null},
          ${step.appliesToSizes.length ? sql.array(step.appliesToSizes) : null},
          ${repeatGroupId}, ${step.repeatStepNumber}, ${step.link}, ${step.errataNote}
        )
      `;
    }

    return {
      patternId,
      replaced: options.existingPatternId !== null,
      sizes: data.sizes.length,
      stitchEntries: data.stitchEntries.length,
      repeatGroups: data.repeatGroups.length,
      steps: data.steps.length,
    };
  });
}

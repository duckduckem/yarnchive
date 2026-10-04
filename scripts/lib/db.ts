// Direct Postgres access for the import script (service-role connection
// string, not the app's usual @supabase/supabase-js + RLS path) -- needed for
// a real cross-table transaction. See docs/decisions.md, M1.3.

import { randomUUID } from "node:crypto";
import postgres from "postgres";
import type { DictionaryEntry, ParsedPatternFile } from "./model.ts";
import { rekey, stepAt, type Anchor, type Remap } from "./remap.ts";

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

/** Every project's saved position on a pattern, read before `--replace` deletes anything. */
export async function readAnchors(sql: postgres.Sql, userId: string, patternId: string): Promise<Anchor[]> {
  const rows = await sql<
    {
      progress_id: string;
      project_id: string;
      size_label: string;
      repeat_pass_counts: Record<string, number>;
      checkbox_states: Record<string, boolean>;
      step_order: number | null;
      section: string | null;
      subsection: string | null;
      row_or_round: string | null;
      repeat_group_id: string | null;
    }[]
  >`
    select pp.id as progress_id, pp.project_id, p.size_label, pp.repeat_pass_counts, pp.checkbox_states,
           s.step_order, s.section, s.subsection, s.row_or_round, s.repeat_group_id
    from project_progress pp
    join projects p on p.id = pp.project_id and p.user_id = pp.user_id
    left join steps s on s.id = pp.current_step_id
    where p.pattern_id = ${patternId} and p.user_id = ${userId}
    order by p.created_at
  `;
  const groupRows = await sql<{ repeat_group_id: string; step_order: number }[]>`
    select repeat_group_id, step_order from steps
    where pattern_id = ${patternId} and user_id = ${userId} and repeat_group_id is not null
  `;
  const groupOrders: Record<string, number[]> = {};
  for (const g of groupRows) (groupOrders[g.repeat_group_id] ??= []).push(g.step_order);

  return rows.map((r) => ({
    progressId: r.progress_id,
    projectId: r.project_id,
    size: r.size_label,
    step:
      r.step_order === null
        ? null
        : { stepOrder: r.step_order, section: r.section as string, subsection: r.subsection, rowOrRound: r.row_or_round, groupId: r.repeat_group_id },
    groupOrders,
    passCounts: r.repeat_pass_counts,
    checkboxes: r.checkbox_states,
  }));
}

export interface ImportSummary {
  patternId: string;
  replaced: boolean;
  progressKept: number;
  progressReset: number;
  sizes: number;
  stitchEntries: number;
  repeatGroups: number;
  steps: number;
}

export async function writeImport(
  outerSql: postgres.Sql,
  userId: string,
  data: ParsedPatternFile,
  options: { existingPatternId: string | null; remaps?: Remap[]; resetBlocked?: boolean },
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

    const stepIds = new Map<(typeof data.steps)[number], string>();
    for (const step of data.steps) {
      const stepId = randomUUID();
      stepIds.set(step, stepId);
      const repeatGroupId = step.repeatGroupKey ? (groupIds.get(step.repeatGroupKey) ?? null) : null;
      const hasSizeParams = Object.keys(step.sizeParams).length > 0;
      const hasStitchCount = Object.keys(step.stitchCount).length > 0;
      await sql`
        insert into steps (
          id, user_id, pattern_id, step_order, step_type, section, subsection, row_or_round, side,
          instructions_before, stitch_instructions, instructions_after, size_params, stitch_count,
          applies_to_sizes, repeat_group_id, repeat_step_number, link, errata_note
        ) values (
          ${stepId}, ${userId}, ${patternId}, ${step.stepOrder}, ${step.stepType}, ${step.section},
          ${step.subsection}, ${step.rowOrRound}, ${step.side},
          ${step.instructionsBefore}, ${step.stitchInstructions}, ${step.instructionsAfter},
          ${hasSizeParams ? sql.json(step.sizeParams) : null},
          ${hasStitchCount ? sql.json(step.stitchCount) : null},
          ${step.appliesToSizes.length ? sql.array(step.appliesToSizes) : null},
          ${repeatGroupId}, ${step.repeatStepNumber}, ${step.link}, ${step.errataNote}
        )
      `;
    }

    // Put each project back where it was (specs/projects.md §5). Blocked ones
    // only get here when the caller passed --reset-progress.
    let progressKept = 0;
    let progressReset = 0;
    for (const remap of options.remaps ?? []) {
      if (remap.kind === "untouched") continue;
      if (remap.kind === "keep") {
        const target = stepAt(data.steps, remap.stepOrder, remap.anchor.size);
        const newStepId = target ? stepIds.get(target) : undefined;
        if (newStepId) {
          const groupUuids: Record<string, string> = {};
          for (const [oldId, key] of Object.entries(remap.groupKeys)) {
            const uuid = groupIds.get(key);
            if (uuid) groupUuids[oldId] = uuid;
          }
          await sql`
            update project_progress
            set current_step_id = ${newStepId},
                repeat_pass_counts = ${sql.json(rekey(remap.anchor.passCounts, groupUuids))},
                checkbox_states = ${sql.json(rekey(remap.anchor.checkboxes, groupUuids))},
                updated_at = now()
            where id = ${remap.anchor.progressId} and user_id = ${userId}
          `;
          progressKept += 1;
          continue;
        }
      }
      if (!options.resetBlocked) throw new Error(`project ${remap.anchor.projectId} could not keep its place; nothing was written`);
      await sql`
        update project_progress
        set current_step_id = null, repeat_pass_counts = '{}'::jsonb, checkbox_states = '{}'::jsonb, updated_at = now()
        where id = ${remap.anchor.progressId} and user_id = ${userId}
      `;
      progressReset += 1;
    }

    return {
      patternId,
      progressKept,
      progressReset,
      replaced: options.existingPatternId !== null,
      sizes: data.sizes.length,
      stitchEntries: data.stitchEntries.length,
      repeatGroups: data.repeatGroups.length,
      steps: data.steps.length,
    };
  });
}

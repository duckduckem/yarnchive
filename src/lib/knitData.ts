// Read-only loader for the knitting screen. Everything goes through the
// signed-in Supabase client, so RLS scopes patterns, steps, and entries to
// the user; stitch_dictionary is global-read.
import { errorMessage } from "./errors";
import { supabase } from "./supabase";
import type { Dictionary, Step } from "./knitText";
import type { RepeatGroup } from "./knitNav";
import { buildDictionary } from "./knitText";

export type KnitData =
  | { status: "ok"; patternName: string; size: string; steps: Step[]; groups: Map<string, RepeatGroup>; dictionary: Dictionary }
  | { status: "no-pattern" }
  | { status: "no-size"; sizes: string[] }
  | { status: "error"; message: string };

const PAGE = 1000; // Supabase's default max rows per request.

async function loadSteps(patternId: string): Promise<Step[]> {
  const all: Step[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("steps")
      .select("*")
      .eq("pattern_id", patternId)
      .order("step_order")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}

export interface ProjectInfo {
  id: string;
  patternId: string;
  size: string;
}

/** The project row, or null when it doesn't exist (or isn't mine: RLS hides it). */
export async function loadProject(projectId: string): Promise<ProjectInfo | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, pattern_id, size_label")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, patternId: data.pattern_id, size: data.size_label } : null;
}

export async function loadKnitData(patternId: string, size: string): Promise<KnitData> {
  try {
    const { data: pattern, error } = await supabase
      .from("patterns")
      .select("id, name")
      .eq("id", patternId)
      .maybeSingle();
    if (error) throw error;
    if (!pattern) return { status: "no-pattern" };

    const [sizes, steps, groups, entries, globals] = await Promise.all([
      supabase.from("pattern_sizes").select("label").eq("pattern_id", pattern.id).order("display_order"),
      loadSteps(pattern.id),
      supabase.from("repeat_groups").select("*").eq("pattern_id", pattern.id),
      supabase.from("pattern_stitch_entries").select("abbreviation, name, definition, link").eq("pattern_id", pattern.id),
      supabase.from("stitch_dictionary").select("abbreviation, name, definition, link"),
    ]);
    if (sizes.error) throw sizes.error;
    if (groups.error) throw groups.error;
    if (entries.error) throw entries.error;
    if (globals.error) throw globals.error;

    const labels = sizes.data.map((s) => s.label);
    if (!labels.includes(size)) return { status: "no-size", sizes: labels };

    return {
      status: "ok",
      patternName: pattern.name,
      size,
      steps,
      groups: new Map(groups.data.map((g) => [g.id, g])),
      dictionary: buildDictionary(entries.data, globals.data),
    };
  } catch (e) {
    return { status: "error", message: errorMessage(e) };
  }
}

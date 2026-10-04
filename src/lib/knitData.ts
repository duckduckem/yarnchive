// Read-only loader for the knitting screen. Everything goes through the
// signed-in Supabase client, so RLS scopes patterns, steps, and entries to
// the user; stitch_dictionary is global-read.
import { supabase } from "./supabase";
import type { Dictionary, Step } from "./knitText";
import { buildDictionary } from "./knitText";

export type KnitData =
  | { status: "ok"; patternName: string; size: string; steps: Step[]; dictionary: Dictionary }
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

export async function loadKnitData(slug: string, size: string): Promise<KnitData> {
  try {
    const { data: pattern, error } = await supabase
      .from("patterns")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!pattern) return { status: "no-pattern" };

    const [sizes, steps, entries, globals] = await Promise.all([
      supabase.from("pattern_sizes").select("label").eq("pattern_id", pattern.id).order("display_order"),
      loadSteps(pattern.id),
      supabase.from("pattern_stitch_entries").select("abbreviation, name, definition, link").eq("pattern_id", pattern.id),
      supabase.from("stitch_dictionary").select("abbreviation, name, definition, link"),
    ]);
    if (sizes.error) throw sizes.error;
    if (entries.error) throw entries.error;
    if (globals.error) throw globals.error;

    const labels = sizes.data.map((s) => s.label);
    if (!labels.includes(size)) return { status: "no-size", sizes: labels };

    return {
      status: "ok",
      patternName: pattern.name,
      size,
      steps,
      dictionary: buildDictionary(entries.data, globals.data),
    };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

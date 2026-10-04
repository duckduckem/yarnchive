// The one place knitting progress is read or written (CLAUDE.md: one path for
// progress writes; specs/projects.md §2). Keyed by project id, held in memory
// for the screen, and saved to project_progress on every change. Last write
// wins. A failed save is surfaced through `save`, never swallowed, and the
// in-memory position is kept. M2 adds offline by changing this file only.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { errorMessage } from "./errors";
import { supabase } from "./supabase";
import { emptyProgress, type Progress } from "./knitNav";

export type SaveState = { status: "idle" | "saving" } | { status: "failed"; message: string };

interface Entry {
  /** null while loading or when the load failed. */
  progress: Progress | null;
  loadError: string | null;
  save: SaveState;
}

const LOADING: Entry = { progress: null, loadError: null, save: { status: "idle" } };
const entries = new Map<string, Entry>();
/** Per project: changes not yet sent, and whether a save is in flight. */
const pending = new Map<string, { dirty: boolean; inFlight: boolean }>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(id: string, patch: Partial<Entry>) {
  entries.set(id, { ...(entries.get(id) ?? LOADING), ...patch });
  listeners.forEach((l) => l());
}

const flags = (id: string) => {
  let f = pending.get(id);
  if (!f) {
    f = { dirty: false, inFlight: false };
    pending.set(id, f);
  }
  return f;
};


/** Row JSON -> Progress, tolerating anything the database might hold. */
function parseRow(row: { current_step_id: string | null; repeat_pass_counts: unknown; checkbox_states: unknown }): Progress {
  const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  const passes: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(row.repeat_pass_counts))) if (typeof v === "number" && Number.isInteger(v) && v >= 1) passes[k] = v;
  const boxes: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(obj(row.checkbox_states))) if (typeof v === "boolean") boxes[k] = v;
  return { current_step_id: row.current_step_id, repeat_pass_counts: passes, checkbox_states: boxes };
}

async function load(projectId: string) {
  try {
    const { data, error } = await supabase
      .from("project_progress")
      .select("current_step_id, repeat_pass_counts, checkbox_states")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw error;
    publish(projectId, { progress: data ? parseRow(data) : emptyProgress(), loadError: null });
  } catch (e) {
    publish(projectId, { progress: null, loadError: errorMessage(e) });
  }
}

async function flush(projectId: string) {
  const f = flags(projectId);
  if (f.inFlight || !f.dirty) return;
  const progress = entries.get(projectId)?.progress;
  if (!progress) return;
  f.dirty = false;
  f.inFlight = true;
  publish(projectId, { save: { status: "saving" } });
  let failure: string | null = null;
  try {
    const { error } = await supabase.from("project_progress").upsert(
      {
        project_id: projectId,
        current_step_id: progress.current_step_id,
        repeat_pass_counts: progress.repeat_pass_counts,
        checkbox_states: progress.checkbox_states,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    );
    if (error) throw error;
  } catch (e) {
    failure = errorMessage(e);
  }
  f.inFlight = false;
  if (failure !== null) {
    f.dirty = true; // still unsaved; a Retry or the next change sends the latest state
    publish(projectId, { save: { status: "failed", message: failure } });
    return;
  }
  if (f.dirty) {
    void flush(projectId); // changed while saving: send the latest
  } else {
    publish(projectId, { save: { status: "idle" } });
  }
}

function writeProgress(projectId: string, progress: Progress) {
  flags(projectId).dirty = true;
  publish(projectId, { progress });
  void flush(projectId);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    for (const f of pending.values()) {
      if (f.dirty || f.inFlight) {
        e.preventDefault();
        return;
      }
    }
  });
}

export function useProgress(projectId: string) {
  const entry = useSyncExternalStore(subscribe, () => entries.get(projectId) ?? LOADING);

  useEffect(() => {
    if (!entries.has(projectId)) void load(projectId);
  }, [projectId]);

  const set = useCallback((p: Progress) => writeProgress(projectId, p), [projectId]);
  const retry = useCallback(() => void flush(projectId), [projectId]);
  const reload = useCallback(() => void load(projectId), [projectId]);
  return { progress: entry.progress, loadError: entry.loadError, save: entry.save, set, retry, reload };
}

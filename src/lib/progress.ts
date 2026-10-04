// The one place knitting progress is read or written (CLAUDE.md: one path for
// progress writes). In memory for now, keyed by `slug:size`. M1.7 swaps the key
// for a project id and persists to project_progress from inside this file, so
// the UI keeps calling useProgress unchanged.
import { useCallback, useSyncExternalStore } from "react";
import { emptyProgress, type Progress } from "./knitNav";

const NOT_STARTED = emptyProgress();
const store = new Map<string, Progress>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function writeProgress(key: string, progress: Progress) {
  store.set(key, progress);
  listeners.forEach((l) => l());
}

export function useProgress(key: string): [Progress, (progress: Progress) => void] {
  const progress = useSyncExternalStore(subscribe, () => store.get(key) ?? NOT_STARTED);
  const set = useCallback((p: Progress) => writeProgress(key, p), [key]);
  return [progress, set];
}

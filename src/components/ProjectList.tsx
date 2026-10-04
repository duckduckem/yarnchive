import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface Row {
  id: string;
  size_label: string;
  patternName: string;
}

// Two plain queries rather than an embed: projects -> patterns is a composite FK.
async function loadRows(): Promise<Row[]> {
  const [projects, patterns] = await Promise.all([
    supabase.from("projects").select("id, size_label, pattern_id").order("created_at", { ascending: false }),
    supabase.from("patterns").select("id, name"),
  ]);
  if (projects.error) throw projects.error;
  if (patterns.error) throw patterns.error;
  const names = new Map(patterns.data.map((p) => [p.id, p.name]));
  return projects.data.map((p) => ({ id: p.id, size_label: p.size_label, patternName: names.get(p.pattern_id) ?? "Unknown pattern" }));
}

export default function ProjectList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRows().then(setRows, (e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-background px-4 py-4 font-sans text-text">
      <h1 className="text-xl font-semibold text-accent">Projects</h1>
      {error && <p role="alert" className="text-danger">Couldn't load projects: {error}</p>}
      {!rows && !error && <p className="text-text-muted">Loading…</p>}
      {rows && rows.length === 0 && <p className="text-text-muted">No projects yet. Start one with New project.</p>}
      {rows && rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id}>
              <a href={`/projects/${r.id}`} className="block rounded-card border border-border bg-surface px-4 py-4 text-lg text-text">
                {r.patternName} <span className="text-text-muted">· size {r.size_label}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <a href="/projects/new" className="rounded-card bg-accent py-4 text-center text-lg font-medium text-accent-foreground">
        New project
      </a>
      <button type="button" onClick={() => supabase.auth.signOut()} className="rounded-card border border-border px-3 py-2 text-sm font-medium text-text">
        Sign out
      </button>
    </div>
  );
}

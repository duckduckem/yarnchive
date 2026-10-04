import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { loadKnitData, type KnitData } from "../lib/knitData";
import { createNav, jumpTo, type Progress } from "../lib/knitNav";
import { stepsForSize } from "../lib/knitText";
import StepPicker from "./StepPicker";

interface PatternRow {
  id: string;
  name: string;
}

export default function NewProject() {
  const [patterns, setPatterns] = useState<PatternRow[] | null>(null);
  const [patternId, setPatternId] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const [size, setSize] = useState("");
  const [start, setStart] = useState<Progress | null>(null);
  const [picking, setPicking] = useState(false);
  const [steps, setSteps] = useState<KnitData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase
      .from("patterns")
      .select("id, name")
      .order("name")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setPatterns(data);
      });
  }, []);

  const choosePattern = async (id: string) => {
    setPatternId(id);
    setSize("");
    setSizes([]);
    setStart(null);
    setSteps(null);
    if (!id) return;
    const { data, error } = await supabase.from("pattern_sizes").select("label").eq("pattern_id", id).order("display_order");
    if (error) setError(error.message);
    else setSizes(data.map((s) => s.label));
  };

  const chooseSize = (label: string) => {
    setSize(label);
    setStart(null);
    setSteps(null);
  };

  const openPicker = async () => {
    setError(null);
    const d = steps ?? (await loadKnitData(patternId, size));
    setSteps(d);
    if (d.status === "ok") setPicking(true);
    else setError("Couldn't load this pattern's steps.");
  };

  const nav = useMemo(
    () => (steps?.status === "ok" ? createNav(stepsForSize(steps.steps, size), steps.groups, size) : null),
    [steps, size],
  );
  const startLabel = start && nav ? (() => {
    const s = nav.steps.find((x) => x.id === start.current_step_id);
    return s ? `${s.section}${s.subsection ? ` › ${s.subsection}` : ""}${s.row_or_round ? ` · ${s.row_or_round}` : ""}` : null;
  })() : null;

  const create = async () => {
    setCreating(true);
    setError(null);
    const { data, error } = await supabase.rpc("create_project", {
      p_pattern_id: patternId,
      p_size_label: size,
      p_current_step_id: start?.current_step_id ?? undefined,
      p_repeat_pass_counts: start?.repeat_pass_counts ?? {},
    });
    if (error || !data) {
      setError(error?.message ?? "Couldn't create the project.");
      setCreating(false);
      return;
    }
    window.location.assign(`/projects/${data}`);
  };

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-background px-4 py-4 font-sans text-text">
      <h1 className="text-xl font-semibold text-accent">New project</h1>
      {error && <p role="alert" className="text-danger">{error}</p>}

      <label className="flex flex-col gap-1 text-lg">
        Pattern
        <select value={patternId} onChange={(e) => void choosePattern(e.target.value)} className="rounded-card border border-border bg-surface px-3 py-3 text-text">
          <option value="">{patterns ? "Choose a pattern" : "Loading…"}</option>
          {patterns?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      {patternId && (
        <label className="flex flex-col gap-1 text-lg">
          Size
          <select value={size} onChange={(e) => chooseSize(e.target.value)} className="rounded-card border border-border bg-surface px-3 py-3 text-text">
            <option value="">Choose a size</option>
            {sizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      )}

      {size && !picking && (
        <div className="flex flex-col gap-2">
          <p className="text-lg">
            Start at: {start ? <span className="font-semibold text-accent">{startLabel ?? "chosen step"}{Object.values(start.repeat_pass_counts)[0] ? `, pass ${Object.values(start.repeat_pass_counts)[0]}` : ""}</span> : "the beginning"}
          </p>
          <button type="button" onClick={() => void openPicker()} className="rounded-card border border-border px-3 py-3 text-lg text-text">
            Choose a starting step
          </button>
          {start && (
            <button type="button" onClick={() => setStart(null)} className="rounded-card border border-border px-3 py-2 text-text">
              Start at the beginning instead
            </button>
          )}
        </div>
      )}

      {picking && nav && (
        <StepPicker
          nav={nav}
          onCancel={() => setPicking(false)}
          onPick={(i, pass) => {
            setStart(jumpTo(nav, i, pass));
            setPicking(false);
          }}
        />
      )}

      <button
        type="button"
        disabled={!patternId || !size || creating || picking}
        onClick={() => void create()}
        className="rounded-card bg-accent py-4 text-lg font-medium text-accent-foreground disabled:opacity-50"
      >
        {creating ? "Creating…" : "Create project"}
      </button>
      <a href="/" className="text-center text-text-muted underline">Cancel</a>
    </div>
  );
}

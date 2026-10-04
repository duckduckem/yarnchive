import { useState } from "react";
import { passRange, type Nav } from "../lib/knitNav";

// Plain list of the size-filtered steps (specs/projects.md §3). Picking a
// group body step asks which pass; anything else picks immediately.
export default function StepPicker({
  nav,
  currentIndex,
  onPick,
  onCancel,
}: {
  nav: Nav;
  currentIndex?: number;
  onPick: (index: number, pass: number) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [pass, setPass] = useState("1");

  const choose = (i: number) => {
    if (passRange(nav, i)) {
      setSelected(i);
      setPass("1");
    } else {
      onPick(i, 1);
    }
  };

  const range = selected === null ? null : passRange(nav, selected);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-accent">Choose a step</p>
        <button type="button" onClick={onCancel} className="rounded-card border border-border px-3 py-2 text-text">
          Cancel
        </button>
      </div>
      <ol className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
        {nav.steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => choose(i)}
              className={`w-full rounded-card border px-3 py-2 text-left text-sm text-text ${selected === i ? "border-accent" : "border-border"}`}
            >
              <span className="text-text-muted">{i + 1}.</span> {s.section}
              {s.subsection ? ` › ${s.subsection}` : ""}
              {s.row_or_round ? ` · ${s.row_or_round}` : ""}
              {s.repeat_group_id ? <span className="text-text-muted">{s.repeat_step_number === null ? " (repeat intro)" : " (repeat)"}</span> : null}
              {i === currentIndex ? <span className="font-semibold text-accent"> ← you are here</span> : null}
            </button>
            {selected === i && range && (
              <div className="mt-1 flex items-center gap-2 px-3 py-2">
                <label className="flex items-center gap-2 text-lg text-text">
                  Pass
                  <input
                    type="number"
                    min={1}
                    max={range.max ?? undefined}
                    inputMode="numeric"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    className="w-20 rounded-card border border-border bg-background px-2 py-2 text-text"
                  />
                </label>
                {range.max !== null && <span className="text-sm text-text-muted">of {range.max}</span>}
                <button
                  type="button"
                  onClick={() => onPick(i, Number(pass))}
                  className="ml-auto rounded-card bg-accent px-4 py-2 text-lg font-medium text-accent-foreground"
                >
                  Go
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

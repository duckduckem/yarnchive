import { useEffect, useMemo, useState } from "react";
import { loadKnitData, type KnitData } from "../lib/knitData";
import { fillPlaceholders, stepPreview, stepsForSize, type Step } from "../lib/knitText";
import Moves, { PieceText } from "./Moves";

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans text-text">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6">
        <h1 className="text-lg font-semibold text-accent">{title}</h1>
        <div className="mt-2 text-sm text-text-muted">{children}</div>
      </div>
    </div>
  );
}

function Preview({ label, step, size }: { label: string; step: Step | undefined; size: string }) {
  if (!step) return null;
  return (
    <div className="rounded-card border border-border px-4 py-3 text-sm text-text-muted">
      <p className="font-semibold">{label}{step.row_or_round ? ` · ${step.row_or_round}` : ""}</p>
      <p className="line-clamp-2">{stepPreview(step, size)}</p>
    </div>
  );
}

function Prose({ text, step, size }: { text: string | null; step: Step; size: string }) {
  if (!text) return null;
  return (
    <p className="text-lg text-text">
      <PieceText pieces={fillPlaceholders(text, step.size_params, size)} />
    </p>
  );
}

export default function KnitScreen({ slug, size }: { slug: string; size: string }) {
  const [data, setData] = useState<KnitData | null>(null);
  const [pos, setPos] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadKnitData(slug, size).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, size]);

  const steps = useMemo(() => (data?.status === "ok" ? stepsForSize(data.steps, size) : []), [data, size]);

  if (!data) return <Message title="Loading…" />;
  if (data.status === "error") return <Message title="Couldn't load the pattern">{data.message}</Message>;
  if (data.status === "no-pattern") return <Message title="Pattern not found">No pattern with slug “{slug}”.</Message>;
  if (data.status === "no-size") {
    return <Message title="Size not found">Size “{size}” isn't in this pattern. Available: {data.sizes.join(", ")}.</Message>;
  }
  if (steps.length === 0) return <Message title="No steps">This pattern has no steps for size {size}.</Message>;

  const step = steps[pos];
  const side = step.side;

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-text">
      <main className="flex flex-1 flex-col gap-4 px-4 py-4">
        <header className="text-sm text-text-muted">
          <p>
            {data.patternName} · size {size} · step {pos + 1} of {steps.length}
          </p>
        </header>

        <Preview label="Previous" step={steps[pos - 1]} size={size} />

        <article key={step.id} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
          <div>
            <p className="text-sm text-text-muted">
              {step.section}
              {step.subsection ? ` › ${step.subsection}` : ""}
            </p>
            <p className="flex items-center gap-2 text-xl font-semibold text-accent">
              {step.step_type !== "instruction" && <span className="text-sm uppercase text-text-muted">{step.step_type}</span>}
              {step.row_or_round}
              {side && <span className="rounded-card border border-border px-2 text-sm text-text">{side}</span>}
            </p>
          </div>
          <Prose text={step.instructions_before} step={step} size={size} />
          <Moves step={step} size={size} dictionary={data.dictionary} />
          <Prose text={step.instructions_after} step={step} size={size} />
          {step.errata_note && (
            <p className="text-sm text-text">
              <span className="font-semibold text-danger">Errata: </span>
              {step.errata_note}
            </p>
          )}
          {step.link && (
            <a href={step.link} target="_blank" rel="noreferrer" className="text-sm text-accent underline">
              {step.link}
            </a>
          )}
        </article>

        <Preview label="Next" step={steps[pos + 1]} size={size} />
      </main>

      <nav className="sticky bottom-0 flex gap-2 border-t border-border bg-surface p-4">
        <button
          type="button"
          disabled={pos === 0}
          onClick={() => setPos(pos - 1)}
          className="flex-1 rounded-card border border-border py-4 text-lg font-medium text-text disabled:text-text-muted"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={pos === steps.length - 1}
          onClick={() => setPos(pos + 1)}
          className="flex-1 rounded-card bg-accent py-4 text-lg font-medium text-accent-foreground disabled:opacity-50"
        >
          Next
        </button>
      </nav>
    </div>
  );
}

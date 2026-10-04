import { useEffect, useMemo, useState } from "react";
import { loadKnitData, loadProject, type KnitData } from "../lib/knitData";
import { fillPlaceholders, stepPreview, stepsForSize, type Step } from "../lib/knitText";
import { checkpointCounts, createNav, jumpTo, next, prev, setCheckbox, view, type Nav, type Progress, type View } from "../lib/knitNav";
import { useProgress, type SaveState } from "../lib/progress";
import Moves, { PieceText } from "./Moves";
import StepPicker from "./StepPicker";

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

const Missing = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-card border border-danger px-1 text-danger">⚠ {children}</span>
);

function Counter({ v }: { v: View }) {
  if (v.role !== "body") return null;
  return (
    <p className="text-sm font-semibold text-text">
      Repeat {v.pass}
      {v.group && v.group.repeat_condition === null && <> of {v.total ?? <Missing>missing</Missing>}</>}
    </p>
  );
}

function GroupIntro({ v, size }: { v: View; size: string }) {
  const g = v.group;
  if (v.role !== "intro" || !g) return null;
  return (
    <p className="text-lg text-text">
      {g.repeat_condition !== null ? (
        <>
          Repeat until: <PieceText pieces={fillPlaceholders(g.repeat_condition, g.size_params, size)} />
        </>
      ) : v.total !== null ? (
        <>Worked {v.total} times for size {size}.</>
      ) : (
        <Missing>repeat count missing for size {size}</Missing>
      )}
    </p>
  );
}

function Checkpoint({ step, size, confirmed, onConfirm }: { step: Step; size: string; confirmed: boolean; onConfirm: (c: boolean) => void }) {
  const counts = checkpointCounts(step.stitch_count, size);
  return (
    <div className="flex flex-col gap-2 rounded-card border border-border p-3">
      <p className="text-sm font-semibold uppercase text-text-muted">Expected stitch count</p>
      {counts ? (
        <ul className="flex flex-col gap-1 text-lg text-text">
          {counts.map((c) => (
            <li key={c.label}>
              {c.label}: {c.value === null ? <Missing>missing for size {size}</Missing> : <span className="font-semibold text-accent">{c.value}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-lg"><Missing>expected count missing</Missing></p>
      )}
      <label className="flex items-center gap-2 text-lg text-text">
        <input type="checkbox" checked={confirmed} onChange={(e) => onConfirm(e.target.checked)} className="h-5 w-5" />
        Confirm count
      </label>
    </div>
  );
}

function PassEnd({ v, size, onTick }: { v: View; size: string; onTick: (ticked: boolean) => void }) {
  const g = v.group;
  if (v.role !== "body" || !v.isEndOfPass || !g || g.repeat_condition === null) return null;
  return (
    <div className="flex flex-col gap-2 rounded-card border border-border p-3">
      <p className="text-lg text-text">
        <PieceText pieces={fillPlaceholders(g.repeat_condition, g.size_params, size)} />
      </p>
      <label className="flex items-center gap-2 text-lg text-text">
        <input type="checkbox" checked={v.conditionTicked} onChange={(e) => onTick(e.target.checked)} className="h-5 w-5" />
        Condition met
      </label>
      <p className="text-sm text-text-muted">{v.conditionTicked ? "Next leaves the repeat." : "Next starts another pass."}</p>
    </div>
  );
}

function stepAfter(nav: Nav, p: Progress | null): Step | undefined {
  return p ? view(nav, p).step : undefined;
}

function SaveBanner({ save, onRetry }: { save: SaveState; onRetry: () => void }) {
  if (save.status !== "failed") return null;
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-card border border-danger p-3 text-text">
      <p className="text-lg font-semibold text-danger">Not saved: your place is only on this screen.</p>
      <p className="text-sm text-text-muted">{save.message}</p>
      <button type="button" onClick={onRetry} className="rounded-card bg-accent py-3 text-lg font-medium text-accent-foreground">
        Retry save
      </button>
    </div>
  );
}

type Loaded = { status: "loading" } | { status: "missing" } | { status: "error"; message: string } | { status: "ok"; size: string; data: KnitData };

export default function KnitScreen({ projectId }: { projectId: string }) {
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const { progress, loadError, save, set: setProgress, retry, reload } = useProgress(projectId);
  const [confirmed, setConfirmed] = useState(false);
  const [jumping, setJumping] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const project = await loadProject(projectId);
        if (!project) {
          if (!cancelled) setLoaded({ status: "missing" });
          return;
        }
        const data = await loadKnitData(project.patternId, project.size);
        if (!cancelled) setLoaded({ status: "ok", size: project.size, data });
      } catch (e) {
        if (!cancelled) setLoaded({ status: "error", message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const size = loaded.status === "ok" ? loaded.size : "";
  const data = loaded.status === "ok" ? loaded.data : null;
  const nav = useMemo(
    () => (data?.status === "ok" ? createNav(stepsForSize(data.steps, size), data.groups, size) : null),
    [data, size],
  );

  if (loaded.status === "missing") return <Message title="Project not found"><a href="/" className="text-accent underline">Back to projects</a></Message>;
  if (loaded.status === "error") return <Message title="Couldn't load the project">{loaded.message}</Message>;
  if (loadError) {
    return (
      <Message title="Couldn't load your saved place">
        <p>{loadError}</p>
        <button type="button" onClick={reload} className="mt-3 rounded-card border border-border px-3 py-2 text-text">Try again</button>
      </Message>
    );
  }
  if (!data || !progress) return <Message title="Loading…" />;
  if (data.status === "error") return <Message title="Couldn't load the pattern">{data.message}</Message>;
  if (data.status === "no-pattern") return <Message title="Pattern not found">This project's pattern is missing.</Message>;
  if (data.status === "no-size") {
    return <Message title="Size not found">Size “{size}” isn't in this pattern any more. Available: {data.sizes.join(", ")}.</Message>;
  }
  if (!nav || nav.steps.length === 0) return <Message title="No steps">This pattern has no steps for size {size}.</Message>;

  const v = view(nav, progress);
  const step = v.step;
  const side = step.side;
  const nextProgress = next(nav, progress);
  const prevProgress = prev(nav, progress);
  const isCheckpoint = step.step_type === "checkpoint";

  const go = (p: Progress | null) => {
    if (!p) return;
    setProgress(p);
    setConfirmed(false);
    setJumping(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-text">
      <main className="flex flex-1 flex-col gap-4 px-4 py-4">
        <header className="text-sm text-text-muted">
          <p>
            <a href="/" className="text-accent underline">Projects</a> · {data.patternName} · size {size} · step {v.index + 1} of {nav.steps.length}
          </p>
          <button type="button" onClick={() => setJumping(true)} className="mt-2 rounded-card border border-border px-3 py-2 text-text">
            Jump to step
          </button>
        </header>

        <SaveBanner save={save} onRetry={retry} />

        {jumping && (
          <StepPicker nav={nav} currentIndex={v.index} onCancel={() => setJumping(false)} onPick={(i, pass) => go(jumpTo(nav, i, pass))} />
        )}

        <Preview label="Previous" step={stepAfter(nav, prevProgress)} size={size} />

        <article key={`${step.id}/${v.pass}`} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
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
          <Counter v={v} />
          <Prose text={step.instructions_before} step={step} size={size} />
          <GroupIntro v={v} size={size} />
          <Moves step={step} size={size} dictionary={data.dictionary} />
          <Prose text={step.instructions_after} step={step} size={size} />
          {v.showLastRepeatNote && v.group && <p className="text-lg text-text">{v.group.last_repeat_note}</p>}
          {isCheckpoint && <Checkpoint step={step} size={size} confirmed={confirmed} onConfirm={setConfirmed} />}
          <PassEnd v={v} size={size} onTick={(t) => setProgress(setCheckbox(progress, v.group!.id, t))} />
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

        <Preview label="Next" step={stepAfter(nav, nextProgress)} size={size} />
      </main>

      <nav className="sticky bottom-0 flex gap-2 border-t border-border bg-surface p-4">
        <button
          type="button"
          disabled={!prevProgress}
          onClick={() => go(prevProgress)}
          className="flex-1 rounded-card border border-border py-4 text-lg font-medium text-text disabled:text-text-muted"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={!nextProgress || (isCheckpoint && !confirmed)}
          onClick={() => go(nextProgress)}
          className="flex-1 rounded-card bg-accent py-4 text-lg font-medium text-accent-foreground disabled:opacity-50"
        >
          Next
        </button>
      </nav>
    </div>
  );
}

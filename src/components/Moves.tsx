import { useRef, useState } from "react";
import type { Definition, Dictionary, Piece, Step } from "../lib/knitText";
import { moveWords, splitMoves } from "../lib/knitText";

const LONG_PRESS_MS = 500;

export function PieceText({ pieces }: { pieces: Piece[] }) {
  return (
    <>
      {pieces.map((p, i) =>
        p.kind === "missing" ? (
          <span key={i} className="rounded-card border border-danger px-1 text-danger">
            ⚠ {`{${p.name}}`}
          </span>
        ) : p.kind === "number" ? (
          <span key={i} className="font-semibold text-accent">
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/**
 * The step's moves. Tap a move to cross it off; long-press a recognized word
 * for its definition. Crossed-off state lives here, so it is gone as soon as
 * the parent remounts this for another step (nothing is saved).
 */
export default function Moves({ step, size, dictionary }: { step: Step; size: string; dictionary: Dictionary }) {
  const moves = splitMoves(step.stitch_instructions);
  const [crossed, setCrossed] = useState<Set<number>>(new Set());
  const [shown, setShown] = useState<Definition | null>(null);
  const press = useRef<{ timer: number; long: boolean } | null>(null);

  const toggle = (i: number) =>
    setCrossed((prev) => {
      const next = new Set(prev);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  const clearPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
  };

  const onPointerDown = (e: React.PointerEvent, i: number, defs: (Definition | null)[]) => {
    clearPress();
    const wordIndex = Number((e.target as HTMLElement).closest<HTMLElement>("[data-word]")?.dataset.word);
    const def = Number.isNaN(wordIndex) ? null : defs[wordIndex];
    const state = { long: false, timer: 0 };
    if (def) {
      state.timer = window.setTimeout(() => {
        state.long = true;
        setShown(def);
      }, LONG_PRESS_MS);
    }
    press.current = state;
    // Held for a toggle only if this press ends as a short tap on the same move.
    (e.currentTarget as HTMLElement).dataset.pressing = String(i);
  };

  const onPointerUp = (e: React.PointerEvent, i: number) => {
    clearPress();
    const el = e.currentTarget as HTMLElement;
    const wasPressing = el.dataset.pressing === String(i);
    delete el.dataset.pressing;
    if (wasPressing && press.current && !press.current.long) toggle(i);
    press.current = null;
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    clearPress();
    delete (e.currentTarget as HTMLElement).dataset.pressing;
    press.current = null;
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {moves.map((move, i) => {
          const words = moveWords(move, step.size_params, size, dictionary);
          const defs = words.map((w) => w.definition);
          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              aria-pressed={crossed.has(i)}
              onPointerDown={(e) => onPointerDown(e, i, defs)}
              onPointerUp={(e) => onPointerUp(e, i)}
              onPointerCancel={onPointerCancel}
              onPointerLeave={onPointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(i);
                }
              }}
              className={`touch-manipulation select-none rounded-card border border-border bg-surface px-3 py-2 text-lg [-webkit-touch-callout:none] ${
                crossed.has(i) ? "text-text-muted line-through" : "text-text"
              }`}
            >
              {words.map((w, wi) => (
                <span
                  key={wi}
                  data-word={wi}
                  className={w.definition ? "underline decoration-dotted" : undefined}
                >
                  <PieceText pieces={w.pieces} />
                  {wi < words.length - 1 ? " " : null}
                </span>
              ))}
            </span>
          );
        })}
      </div>

      {shown && (
        <div className="mt-4 rounded-card border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-accent">{shown.name}</p>
              <p className="text-sm text-text-muted">
                {shown.abbreviation} · {shown.source === "pattern" ? "this pattern" : "dictionary"}
              </p>
            </div>
            <button type="button" onClick={() => setShown(null)} className="rounded-card border border-border px-3 py-1 text-sm text-text">
              Close
            </button>
          </div>
          <p className="mt-2 text-text">{shown.definition}</p>
          {shown.link && (
            <a href={shown.link} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-accent underline">
              Tutorial
            </a>
          )}
        </div>
      )}
    </div>
  );
}

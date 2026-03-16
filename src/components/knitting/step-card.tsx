import type { PatternStep } from '../../types/knitting'
import SideBadge from './side-badge'
import StitchText from './stitch-text'
import RepeatIndicator from './repeat-indicator'
import AdvanceButton from './advance-button'

interface StepCardProps {
  step: PatternStep
  isActive: boolean
  currentRepeat: number
  onAdvance: () => void
  onTokenTap: (abbreviation: string) => void
}

export default function StepCard({
  step,
  isActive,
  currentRepeat,
  onAdvance,
  onTokenTap,
}: StepCardProps) {
  const hasRepeats = (step.repeat_total ?? 1) > 1

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-200 ${
        isActive
          ? 'bg-white border-gray-300 shadow-md scale-100 opacity-100'
          : 'bg-gray-50 border-transparent scale-95 opacity-40'
      } ${stepTypeStyle(step.step_type)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          {step.side && <SideBadge side={step.side} />}

          {step.instructions_before && (
            <p className="text-base leading-relaxed">
              <StitchText text={step.instructions_before} onTokenTap={onTokenTap} />
            </p>
          )}

          {step.stitch_instructions && (
            <p className="text-base font-medium leading-relaxed">
              <StitchText text={step.stitch_instructions} onTokenTap={onTokenTap} />
            </p>
          )}

          {step.instructions_after && (
            <p className="text-base leading-relaxed text-gray-600">
              <StitchText text={step.instructions_after} onTokenTap={onTokenTap} />
            </p>
          )}

          {!step.instructions_before && !step.stitch_instructions && !step.instructions_after && (
            <p className="text-sm text-gray-400 italic">No instructions recorded for this step.</p>
          )}

          {hasRepeats && (
            <RepeatIndicator current={currentRepeat} total={step.repeat_total!} />
          )}
        </div>

        {isActive && (
          <div className="shrink-0 pt-1">
            <AdvanceButton stepType={step.step_type} onAdvance={onAdvance} />
          </div>
        )}
      </div>
    </div>
  )
}

function stepTypeStyle(stepType: PatternStep['step_type']): string {
  switch (stepType) {
    case 'note':       return 'bg-blue-50 border-blue-100'
    case 'checkpoint': return 'bg-amber-50 border-amber-200'
    default:           return ''
  }
}

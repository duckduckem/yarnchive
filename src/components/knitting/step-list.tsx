import { useEffect, useRef } from 'react'
import type { PatternStep } from '../../types/knitting'
import StepCard from './step-card'

interface StepListProps {
  steps: PatternStep[]
  currentStepId: string
  currentRepeat: number
  onAdvance: () => void
  onTokenTap: (display: string, lookupKey: string) => void
}

export default function StepList({
  steps,
  currentStepId,
  currentRepeat,
  onAdvance,
  onTokenTap,
}: StepListProps) {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    const el = cardRefs.current.get(currentStepId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentStepId])

  return (
    <div className="flex flex-col gap-3 px-4 py-6">
      {steps.map((step) => (
        <div
          key={step.id}
          ref={(el) => {
            if (el) cardRefs.current.set(step.id, el)
            else cardRefs.current.delete(step.id)
          }}
        >
          <StepCard
            step={step}
            isActive={step.id === currentStepId}
            currentRepeat={currentRepeat}
            onAdvance={onAdvance}
            onTokenTap={onTokenTap}
          />
        </div>
      ))}
    </div>
  )
}

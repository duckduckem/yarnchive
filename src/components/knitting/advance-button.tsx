import React from 'react'
import type { StepType } from '../../types/knitting'

interface AdvanceButtonProps {
  stepType: StepType
  onAdvance: () => void
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V4m0 0h12l-3 4 3 4H4" />
    </svg>
  )
}

const ICON: Record<StepType, () => React.ReactElement> = {
  instruction: CheckIcon,
  note: ArrowDownIcon,
  checkpoint: FlagIcon,
}

const STYLE: Record<StepType, string> = {
  instruction: 'bg-green-500 text-white active:bg-green-600',
  note: 'bg-gray-200 text-gray-700 active:bg-gray-300',
  checkpoint: 'bg-amber-400 text-white active:bg-amber-500',
}

export default function AdvanceButton({ stepType, onAdvance }: AdvanceButtonProps) {
  const Icon = ICON[stepType]

  return (
    <button
      onClick={onAdvance}
      aria-label="Advance"
      className={`flex items-center justify-center w-14 h-14 rounded-full ${STYLE[stepType]}`}
    >
      <Icon />
    </button>
  )
}

import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

interface KnittingHeaderProps {
  projectName: string
  patternName: string
  sectionLabel: string | null
  stepIndex: number
  totalSteps: number
  isOnline: boolean
  onRestartClick: () => void
}

export default function KnittingHeader({
  projectName,
  patternName,
  sectionLabel,
  stepIndex,
  totalSteps,
  isOnline,
  onRestartClick,
}: KnittingHeaderProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const stepPosition = `Step ${stepIndex + 1} of ${totalSteps}`
  const progressLabel = sectionLabel ? `${sectionLabel} — ${stepPosition}` : stepPosition

  return (
    <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 bg-white">
      <button
        onClick={() => navigate(-1)}
        aria-label="Back"
        className="shrink-0 p-1 -ml-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 truncate">{projectName} · {patternName}</p>
        <p className="text-sm font-medium truncate">{progressLabel}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!isOnline && (
          <span className="text-xs text-amber-600 font-medium" aria-label="Offline">
            Offline
          </span>
        )}

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            className="p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-md shadow-lg bg-white ring-1 ring-black/5">
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onRestartClick()
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                >
                  Restart Project
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

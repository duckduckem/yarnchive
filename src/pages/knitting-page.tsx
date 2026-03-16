import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useKnittingSession, stepsLocalKey } from '../hooks/use-knitting-session'
import type { KnittingSession } from '../types/knitting'
import KnittingHeader from '../components/knitting/knitting-header'
import StepList from '../components/knitting/step-list'
import StitchDefinitionSheet from '../components/knitting/stitch-definition-sheet'
import CompletionOverlay from '../components/knitting/completion-overlay'
import RestartConfirmDialog from '../components/knitting/restart-confirm-dialog'

export default function KnittingPage() {
  const { projectId } = useParams<{ projectId: string }>()

  if (!projectId) {
    return <div className="p-4">Invalid project URL.</div>
  }

  return <KnittingView projectId={projectId} />
}

function KnittingView({ projectId }: { projectId: string }) {
  const { session, loading, error } = useKnittingSession(projectId)

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  if (error || !session) {
    return <div className="p-4">Error: {error ?? 'Could not load project.'}</div>
  }

  return <KnittingActive projectId={projectId} session={session} />
}

function readLocalState(projectId: string): { currentStepId: string; currentRepeat: number } | null {
  try {
    const raw = localStorage.getItem(`knit-state-${projectId}`)
    if (!raw) return null
    return JSON.parse(raw) as { currentStepId: string; currentRepeat: number }
  } catch {
    return null
  }
}

function KnittingActive({
  projectId,
  session,
}: {
  projectId: string
  session: KnittingSession
}) {
  const { steps, stepState, project, pattern_name } = session

  // Prefer localStorage for instant render; Supabase data is the authoritative
  // fallback (already resolved by the time this component mounts).
  const localState = readLocalState(projectId)
  const [currentStepId, setCurrentStepId] = useState(
    localState?.currentStepId ?? stepState.current_step_id ?? steps[0].id
  )
  const [currentRepeat, setCurrentRepeat] = useState(
    localState?.currentRepeat ?? stepState.current_repeat ?? 1
  )
  const [isFinished, setIsFinished] = useState(false)

  const [restartOpen, setRestartOpen] = useState(false)
  const [activeToken, setActiveToken] = useState<{ display: string; lookupKey: string } | null>(null)
  const [stitchDefCache, setStitchDefCache] = useState<Map<string, string | null>>(new Map())

  const handleFetched = useCallback((key: string, definition: string | null) => {
    setStitchDefCache((prev) => new Map(prev).set(key, definition))
  }, [])

  const currentStepIndex = steps.findIndex((s) => s.id === currentStepId)
  const currentStep = steps[currentStepIndex]

  const [isOnline, setIsOnline] = useState(navigator.onLine)
  useEffect(() => {
    const up = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  // On mount (online), persist steps locally and to Supabase for offline use
  useEffect(() => {
    if (!isOnline) return
    localStorage.setItem(stepsLocalKey(projectId), JSON.stringify(steps))
    void supabase
      .from('project_step_state')
      .update({ cached_steps: steps })
      .eq('project_id', projectId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]) // intentionally run once on mount

  // Debounce ref for Supabase writes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Pending write to flush when reconnecting
  const pendingWriteRef = useRef<{ stepId: string; repeat: number } | null>(null)

  // Flush any pending write on reconnect
  useEffect(() => {
    if (isOnline && pendingWriteRef.current) {
      const { stepId, repeat } = pendingWriteRef.current
      pendingWriteRef.current = null
      void supabase
        .from('project_step_state')
        .update({ current_step_id: stepId, current_repeat: repeat })
        .eq('project_id', projectId)
    }
  }, [isOnline, projectId])

  function persistStepState(stepId: string, repeat: number) {
    localStorage.setItem(
      `knit-state-${projectId}`,
      JSON.stringify({ currentStepId: stepId, currentRepeat: repeat })
    )

    if (!isOnline) {
      pendingWriteRef.current = { stepId, repeat }
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void supabase
        .from('project_step_state')
        .update({ current_step_id: stepId, current_repeat: repeat })
        .eq('project_id', projectId)
    }, 300)
  }

  function handleAdvance() {
    const repeatsRemaining = (currentStep.repeat_total ?? 1) - currentRepeat

    if (repeatsRemaining > 0) {
      const nextRepeat = currentRepeat + 1
      setCurrentRepeat(nextRepeat)
      persistStepState(currentStepId, nextRepeat)
    } else {
      const nextStep = steps[currentStepIndex + 1]
      if (!nextStep) {
        setIsFinished(true)
        return
      }
      setCurrentStepId(nextStep.id)
      setCurrentRepeat(1)
      persistStepState(nextStep.id, 1)
    }
  }

  async function handleRestart() {
    const firstStep = steps[0]
    setCurrentStepId(firstStep.id)
    setCurrentRepeat(1)
    setIsFinished(false)
    setRestartOpen(false)
    persistStepState(firstStep.id, 1)

    // Only revert status if project was marked Finished
    if (project.status === 'Finished') {
      await supabase
        .from('project')
        .update({ status: 'In Progress' })
        .eq('id', project.id)
    }
  }

  async function handleMarkFinished() {
    await supabase
      .from('project')
      .update({ status: 'Finished' })
      .eq('id', project.id)
    setIsFinished(false)
  }

  return (
    <div className="flex flex-col h-dvh">
      <KnittingHeader
        projectName={project.name}
        patternName={pattern_name}
        sectionLabel={currentStep?.section_label ?? null}
        stepIndex={currentStepIndex}
        totalSteps={steps.length}
        isOnline={isOnline}
        onRestartClick={() => setRestartOpen(true)}
      />

      <div className="flex-1 overflow-y-auto">
        <StepList
          steps={steps}
          currentStepId={currentStepId}
          currentRepeat={currentRepeat}
          onAdvance={handleAdvance}
          onTokenTap={(display, lookupKey) => setActiveToken({ display, lookupKey })}
        />
      </div>

      <RestartConfirmDialog
        open={restartOpen}
        onConfirm={handleRestart}
        onCancel={() => setRestartOpen(false)}
      />

      {isFinished && (
        <CompletionOverlay
          projectName={project.name}
          onMarkFinished={handleMarkFinished}
          onDismiss={() => setIsFinished(false)}
        />
      )}

      <StitchDefinitionSheet
        display={activeToken?.display ?? null}
        lookupKey={activeToken?.lookupKey ?? null}
        cachedDefinition={activeToken !== null ? stitchDefCache.get(activeToken.lookupKey) : undefined}
        onClose={() => setActiveToken(null)}
        onFetched={handleFetched}
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { KnittingSession, PatternStep, ProjectStepState } from '../types/knitting'

interface UseKnittingSessionResult {
  session: KnittingSession | null
  loading: boolean
  error: string | null
}

function stepsLocalKey(projectId: string) {
  return `knit-steps-${projectId}`
}

function stateLocalKey(projectId: string) {
  return `knit-state-${projectId}`
}

function readLocalSteps(projectId: string): PatternStep[] | null {
  try {
    const raw = localStorage.getItem(stepsLocalKey(projectId))
    if (!raw) return null
    return JSON.parse(raw) as PatternStep[]
  } catch {
    return null
  }
}

function readLocalState(projectId: string): { currentStepId: string; currentRepeat: number } | null {
  try {
    const raw = localStorage.getItem(stateLocalKey(projectId))
    if (!raw) return null
    return JSON.parse(raw) as { currentStepId: string; currentRepeat: number }
  } catch {
    return null
  }
}

export { stepsLocalKey }

export function useKnittingSession(projectId: string): UseKnittingSessionResult {
  const [session, setSession] = useState<KnittingSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      // --- Offline fallback ---
      if (!navigator.onLine) {
        const cachedSteps = readLocalSteps(projectId)
        const cachedState = readLocalState(projectId)

        if (!cachedSteps || cachedSteps.length === 0) {
          if (!cancelled) {
            setError(
              'You need a connection to load this project for the first time. Open it while online to enable offline access.'
            )
            setLoading(false)
          }
          return
        }

        const stepState: ProjectStepState = {
          current_step_id: cachedState?.currentStepId ?? cachedSteps[0].id,
          current_repeat: cachedState?.currentRepeat ?? 1,
          cached_steps: cachedSteps,
        }

        if (!cancelled) {
          setSession({
            // Minimal project info — only name and id are needed for offline UI
            project: { id: projectId, name: 'Offline', status: 'In Progress', pattern_size_id: '' },
            pattern_name: '',
            steps: cachedSteps,
            stepState,
          })
          setLoading(false)
        }
        return
      }

      // --- Online path ---
      try {
        // 1. Fetch project + pattern name
        const { data: projectData, error: projectError } = await supabase
          .from('project')
          .select('id, name, status, pattern_size_id, pattern_size(pattern(name))')
          .eq('id', projectId)
          .single()

        if (projectError) throw new Error(projectError.message)
        if (!projectData) throw new Error('Project not found.')

        const patternSizeData = projectData.pattern_size as unknown as { pattern: { name: string } } | null
        const patternName = patternSizeData?.pattern?.name ?? 'Unknown Pattern'

        const project = {
          id: projectData.id as string,
          name: projectData.name as string,
          status: projectData.status as string,
          pattern_size_id: projectData.pattern_size_id as string,
        }

        // 2. Fetch all steps for this size, ordered
        const { data: stepsData, error: stepsError } = await supabase
          .from('pattern_step')
          .select(`
            id, step_order, step_type, side, total_repeats,
            instructions_before, stitch_instructions, instructions_after,
            repeat_group(label)
          `)
          .eq('pattern_size_id', project.pattern_size_id)
          .order('step_order', { ascending: true })

        if (stepsError) throw new Error(stepsError.message)
        if (!stepsData || stepsData.length === 0) throw new Error('No steps found for this pattern size.')

        const steps: PatternStep[] = stepsData.map((row) => {
          const repeatGroup = row.repeat_group as unknown as { label: string | null } | null
          return {
            id: row.id as string,
            step_order: row.step_order as number,
            step_type: row.step_type as PatternStep['step_type'],
            side: row.side as PatternStep['side'],
            total_repeats: row.total_repeats as number | null,
            instructions_before: row.instructions_before as string | null,
            stitch_instructions: row.stitch_instructions as string | null,
            instructions_after: row.instructions_after as string | null,
            section_label: repeatGroup?.label ?? null,
          }
        })

        // Persist steps locally for offline use
        localStorage.setItem(stepsLocalKey(projectId), JSON.stringify(steps))

        // 3. Fetch step state, creating it if it doesn't exist yet
        const { data: stateData, error: stateError } = await supabase
          .from('project_step_state')
          .select('current_step_id, current_repeat, cached_steps')
          .eq('project_id', projectId)
          .single()

        let stepState: ProjectStepState

        if (stateError || !stateData) {
          const initial = {
            project_id: projectId,
            current_step_id: steps[0].id,
            current_repeat: 1,
            cached_steps: null,
          }
          const { error: insertError } = await supabase
            .from('project_step_state')
            .insert(initial)

          if (insertError) throw new Error(insertError.message)

          stepState = {
            current_step_id: initial.current_step_id,
            current_repeat: initial.current_repeat,
            cached_steps: null,
          }
        } else {
          stepState = {
            current_step_id: stateData.current_step_id as string,
            current_repeat: stateData.current_repeat as number,
            cached_steps: stateData.cached_steps as PatternStep[] | null,
          }
        }

        if (!cancelled) {
          setSession({ project, pattern_name: patternName, steps, stepState })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => { cancelled = true }
  }, [projectId])

  return { session, loading, error }
}

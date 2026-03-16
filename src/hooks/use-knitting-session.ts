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
            project: { id: projectId, name: 'Offline', status: 'In Progress', pattern_id: '', size_id: null },
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
        // 1. Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from('project')
          .select('id, name, status, pattern_id, size_id')
          .eq('id', projectId)
          .single()

        if (projectError) throw new Error(`[project] ${projectError.message}`)
        if (!projectData) throw new Error('[project] Project not found.')

        const project = {
          id: projectData.id as string,
          name: projectData.name as string,
          status: projectData.status as string,
          pattern_id: projectData.pattern_id as string,
          size_id: projectData.size_id as string | null,
        }

        // 1b. Fetch pattern name
        const { data: patternData } = await supabase
          .from('pattern')
          .select('name')
          .eq('id', project.pattern_id)
          .single()

        const patternName = patternData?.name ?? 'Unknown Pattern'

        // 2. Fetch steps — no relationship embeds to avoid PostgREST text-FK issues.
        // section_label is not used in this query; repeat_group labels fetched separately if needed.
        const sizeId = project.size_id

        let stepsQuery = supabase
          .from('pattern_step')
          .select('id, step_num, step_type, side, repeat_total, instructions_before, stitch_instructions, instructions_after, repeat_group_id')
          .eq('pattern_id', project.pattern_id)
          .order('step_num', { ascending: true })

        if (sizeId) {
          stepsQuery = stepsQuery.or(`size_id.eq.${sizeId},size_id.is.null`)
        } else {
          stepsQuery = stepsQuery.is('size_id', null)
        }

        const { data: stepsData, error: stepsError } = await stepsQuery

        if (stepsError) throw new Error(`[steps] ${stepsError.message}`)
        if (!stepsData || stepsData.length === 0) throw new Error('[steps] No steps found for this pattern size.')

        const steps: PatternStep[] = stepsData.map((row) => ({
          id: row.id as string,
          step_num: row.step_num as number,
          step_type: row.step_type as PatternStep['step_type'],
          side: row.side as PatternStep['side'],
          repeat_total: row.repeat_total as number | null,
          instructions_before: row.instructions_before as string | null,
          stitch_instructions: row.stitch_instructions as string | null,
          instructions_after: row.instructions_after as string | null,
          section_label: null, // populated later once repeat_group labels are needed
        }))

        // Persist steps locally for offline use
        localStorage.setItem(stepsLocalKey(projectId), JSON.stringify(steps))

        // 3. Fetch step state
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

          if (insertError) throw new Error(`[step_state insert] ${insertError.message}`)

          stepState = {
            current_step_id: initial.current_step_id,
            current_repeat: initial.current_repeat,
            cached_steps: null,
          }
        } else {
          stepState = {
            current_step_id: stateData.current_step_id as string | null,
            current_repeat: stateData.current_repeat as number | null,
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

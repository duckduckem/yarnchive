export type StepType = 'instruction' | 'note' | 'checkpoint'

export type Side = 'RS' | 'WS' | null

export interface PatternStep {
  id: string
  step_order: number
  step_type: StepType
  side: Side
  total_repeats: number | null
  instructions_before: string | null
  stitch_instructions: string | null
  instructions_after: string | null
  section_label: string | null
}

export interface ProjectStepState {
  current_step_id: string
  current_repeat: number
  cached_steps: PatternStep[] | null
}

export interface Project {
  id: string
  name: string
  status: string
  pattern_size_id: string
}

export interface KnittingSession {
  project: Project
  pattern_name: string
  steps: PatternStep[]
  stepState: ProjectStepState
}

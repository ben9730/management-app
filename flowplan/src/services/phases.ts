/**
 * Phases Service
 *
 * CRUD operations for project phases using Supabase.
 */

import { supabase } from '@/lib/supabase'
import type { ProjectPhase, PhaseStatus } from '@/types/entities'

const VALID_STATUSES: PhaseStatus[] = ['pending', 'active', 'completed']

export interface CreatePhaseInput {
  project_id: string
  name: string
  description?: string | null
  phase_order: number
  start_date?: string | null
  end_date?: string | null
}

export interface UpdatePhaseInput {
  name?: string
  description?: string | null
  phase_order?: number
  status?: PhaseStatus
  start_date?: string | null
  end_date?: string | null
}

export interface PhasesFilter {
  status?: PhaseStatus
}

interface ServiceResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

// Validation helpers
function validateCreateInput(input: CreatePhaseInput): string | null {
  if (!input.project_id) {
    return 'Project ID is required (project_id)'
  }

  if (!input.name || input.name.trim() === '') {
    return 'Phase name is required (name)'
  }

  if (input.phase_order === undefined || input.phase_order < 1) {
    return 'Phase order must be a positive number (phase_order)'
  }

  if (input.start_date && input.end_date) {
    const start = new Date(input.start_date)
    const end = new Date(input.end_date)
    if (end < start) {
      return 'End date must be after start date (end_date)'
    }
  }

  return null
}

function validateUpdateInput(input: UpdatePhaseInput): string | null {
  if (input.name !== undefined && input.name.trim() === '') {
    return 'Phase name cannot be empty (name)'
  }

  if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
    return `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
  }

  if (input.phase_order !== undefined && input.phase_order < 1) {
    return 'Phase order must be a positive number (phase_order)'
  }

  return null
}

/**
 * Create a new phase
 */
export async function createPhase(
  input: CreatePhaseInput
): Promise<ServiceResult<ProjectPhase>> {
  // Validate input
  const validationError = validateCreateInput(input)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  // Set defaults
  const phaseData = {
    project_id: input.project_id,
    name: input.name.trim(),
    description: input.description ?? null,
    phase_order: input.phase_order,
    status: 'pending' as PhaseStatus,
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    total_tasks: 0,
    completed_tasks: 0,
  }

  const { data, error } = await supabase
    .from('project_phases')
    .insert(phaseData)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as ProjectPhase, error: null }
}

/**
 * Get a phase by ID
 */
export async function getPhase(id: string): Promise<ServiceResult<ProjectPhase>> {
  const { data, error } = await supabase
    .from('project_phases')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as ProjectPhase | null, error: null }
}

/**
 * Get all phases for a project
 */
export async function getPhases(
  projectId: string,
  filter?: PhasesFilter
): Promise<ServiceResult<ProjectPhase[]>> {
  let query = supabase
    .from('project_phases')
    .select('*')
    .eq('project_id', projectId)

  if (filter?.status) {
    query = query.eq('status', filter.status)
  }

  const { data, error } = await query.order('phase_order', { ascending: true })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as ProjectPhase[]) ?? [], error: null }
}

/**
 * Update a phase
 */
export async function updatePhase(
  id: string,
  updates: UpdatePhaseInput
): Promise<ServiceResult<ProjectPhase>> {
  // Validate input
  const validationError = validateUpdateInput(updates)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('project_phases')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as ProjectPhase, error: null }
}

/**
 * Delete a phase
 */
export async function deletePhase(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('project_phases').delete().eq('id', id)

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: null, error: null }
}

/**
 * Reorder phases within a project
 */
export async function reorderPhases(
  projectId: string,
  phaseIds: string[]
): Promise<ServiceResult<ProjectPhase[]>> {
  if (!phaseIds || phaseIds.length === 0) {
    return { data: null, error: { message: 'At least one phase ID is required (phase IDs)' } }
  }

  // Create update data with new order
  const updates = phaseIds.map((id, index) => ({
    id,
    project_id: projectId,
    phase_order: index + 1,
  }))

  const { data, error } = await supabase
    .from('project_phases')
    .upsert(updates, { onConflict: 'id' })
    .select()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as ProjectPhase[]) ?? [], error: null }
}

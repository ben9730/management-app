/**
 * Dependencies Service
 *
 * CRUD operations for task dependencies using Supabase.
 */

import { supabase } from '@/lib/supabase'
import type { Dependency } from '@/types/entities'

const VALID_DEPENDENCY_TYPES = [
  'finish_to_start',
  'start_to_start',
  'finish_to_finish',
  'start_to_finish',
] as const

export interface CreateDependencyInput {
  predecessor_id: string
  successor_id: string
  dependency_type?: Dependency['dependency_type']
  lag_days?: number
}

export interface UpdateDependencyInput {
  dependency_type?: Dependency['dependency_type']
  lag_days?: number
}

interface ServiceResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

// Validation helpers
function validateCreateInput(input: CreateDependencyInput): string | null {
  if (!input.predecessor_id) {
    return 'Predecessor task ID is required (predecessor_id)'
  }

  if (!input.successor_id) {
    return 'Successor task ID is required (successor_id)'
  }

  if (input.predecessor_id === input.successor_id) {
    return 'Predecessor and successor must be different tasks'
  }

  if (
    input.dependency_type &&
    !VALID_DEPENDENCY_TYPES.includes(input.dependency_type)
  ) {
    return `Invalid dependency_type. Must be one of: ${VALID_DEPENDENCY_TYPES.join(', ')}`
  }

  return null
}

function validateUpdateInput(input: UpdateDependencyInput): string | null {
  if (
    input.dependency_type &&
    !VALID_DEPENDENCY_TYPES.includes(input.dependency_type)
  ) {
    return `Invalid dependency_type. Must be one of: ${VALID_DEPENDENCY_TYPES.join(', ')}`
  }

  return null
}

/**
 * Create a new dependency
 */
export async function createDependency(
  input: CreateDependencyInput
): Promise<ServiceResult<Dependency>> {
  // Validate input
  const validationError = validateCreateInput(input)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  // Set defaults
  const dependencyData = {
    predecessor_id: input.predecessor_id,
    successor_id: input.successor_id,
    dependency_type: input.dependency_type ?? 'finish_to_start',
    lag_days: input.lag_days ?? 0,
  }

  const { data, error } = await supabase
    .from('task_dependencies')
    .insert(dependencyData)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as Dependency, error: null }
}

/**
 * Get a dependency by ID
 */
export async function getDependency(
  id: string
): Promise<ServiceResult<Dependency>> {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as Dependency | null, error: null }
}

/**
 * Get all dependencies for a project (via task IDs)
 */
export async function getDependencies(
  projectId: string
): Promise<ServiceResult<Dependency[]>> {
  // Get dependencies through a join with tasks
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as Dependency[]) ?? [], error: null }
}

/**
 * Get all dependencies for a specific task (as predecessor or successor)
 */
export async function getDependenciesForTask(
  taskId: string
): Promise<ServiceResult<Dependency[]>> {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('*')
    .or(`predecessor_id.eq.${taskId},successor_id.eq.${taskId}`)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as Dependency[]) ?? [], error: null }
}

/**
 * Update a dependency
 */
export async function updateDependency(
  id: string,
  updates: UpdateDependencyInput
): Promise<ServiceResult<Dependency>> {
  // Validate input
  const validationError = validateUpdateInput(updates)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  const { data, error } = await supabase
    .from('task_dependencies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as Dependency, error: null }
}

/**
 * Delete a dependency
 */
export async function deleteDependency(
  id: string
): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', id)

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: null, error: null }
}

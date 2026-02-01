/**
 * Tasks Service
 *
 * CRUD operations for tasks using Supabase.
 * Schema columns: id, project_id, phase_id, title, description, status, priority,
 *                 assignee_id, duration, estimated_hours, start_date, end_date,
 *                 es, ef, ls, lf, slack, is_critical, created_at, updated_at
 */

import { supabase } from '@/lib/supabase'
import type { Task } from '@/types/entities'

export interface CreateTaskInput {
  project_id: string
  phase_id?: string | null
  title: string
  description?: string | null
  status?: Task['status']
  priority?: Task['priority']
  assignee_id?: string | null
  duration?: number
  estimated_hours?: number | null
  start_date?: string | null
  end_date?: string | null
}

export interface UpdateTaskInput {
  phase_id?: string | null
  title?: string
  description?: string | null
  status?: Task['status']
  priority?: Task['priority']
  assignee_id?: string | null
  duration?: number
  estimated_hours?: number | null
  start_date?: string | null
  end_date?: string | null
}

export interface TasksFilter {
  phase_id?: string
  status?: Task['status']
  priority?: Task['priority']
}

interface ServiceResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

// Validation helpers
function validateCreateInput(input: CreateTaskInput): string | null {
  if (!input.title || input.title.trim() === '') {
    return 'Task title is required'
  }

  if (!input.project_id) {
    return 'Project ID is required (project_id)'
  }

  if (
    input.estimated_hours !== undefined &&
    input.estimated_hours !== null &&
    input.estimated_hours < 0
  ) {
    return 'Invalid estimated_hours. Must be a positive number'
  }

  return null
}

/**
 * Create a new task
 */
export async function createTask(
  input: CreateTaskInput
): Promise<ServiceResult<Task>> {
  // Validate input
  const validationError = validateCreateInput(input)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  // Set defaults - only include columns that exist in the schema
  const taskData = {
    project_id: input.project_id,
    phase_id: input.phase_id ?? null,
    title: input.title.trim(),
    description: input.description ?? null,
    status: input.status ?? 'pending',
    priority: input.priority ?? 'medium',
    assignee_id: input.assignee_id ?? null,
    duration: input.duration ?? 1,
    estimated_hours: input.estimated_hours ?? null,
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData as never)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as Task, error: null }
}

/**
 * Get a task by ID
 */
export async function getTask(id: string): Promise<ServiceResult<Task>> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as Task | null, error: null }
}

/**
 * Get all tasks for a project
 */
export async function getTasks(
  projectId: string,
  filter?: TasksFilter
): Promise<ServiceResult<Task[]>> {
  let query = supabase.from('tasks').select('*').eq('project_id', projectId)

  if (filter?.phase_id) {
    query = query.eq('phase_id', filter.phase_id)
  }

  if (filter?.status) {
    query = query.eq('status', filter.status)
  }

  if (filter?.priority) {
    query = query.eq('priority', filter.priority)
  }

  const { data, error } = await query.order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as Task[]) ?? [], error: null }
}

/**
 * Update a task
 */
export async function updateTask(
  id: string,
  updates: UpdateTaskInput
): Promise<ServiceResult<Task>> {
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as Task, error: null }
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: null, error: null }
}

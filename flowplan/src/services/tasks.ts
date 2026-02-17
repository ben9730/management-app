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
import { ensureProjectMember } from './team-members'

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
  constraint_type?: string | null    // 'ASAP' | 'MSO' | 'SNET' | 'FNLT' | null
  constraint_date?: string | null    // ISO date string
  scheduling_mode?: string           // 'auto' | 'manual'
  percent_complete?: number
  actual_start_date?: string | null
  actual_finish_date?: string | null
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
  constraint_type?: string | null
  constraint_date?: string | null
  scheduling_mode?: string
  percent_complete?: number
  actual_start_date?: string | null
  actual_finish_date?: string | null
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
    constraint_type: input.constraint_type ?? null,
    constraint_date: input.constraint_date ?? null,
    scheduling_mode: input.scheduling_mode ?? 'auto',
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData as never)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  const task = data as Task

  // If assignee is set, ensure they are a project member (for RLS visibility)
  if (task.assignee_id) {
    await ensureProjectMember(task.project_id, task.assignee_id)
  }

  return { data: task, error: null }
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

  const task = data as Task

  // If assignee is set/changed, ensure they are a project member (for RLS visibility)
  if (updates.assignee_id && task.project_id) {
    await ensureProjectMember(task.project_id, updates.assignee_id)
  }

  return { data: task, error: null }
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

/**
 * Batch update CPM scheduling fields for multiple tasks.
 * Also syncs start_date/end_date with es/ef for auto-scheduled tasks,
 * so the Gantt chart (which reads start_date/end_date) shows correct CPM-computed dates.
 */
export async function batchUpdateTaskCPMFields(tasks: Task[]): Promise<ServiceResult<void>> {
  if (tasks.length === 0) return { data: null, error: null }

  const toDateStr = (value: Date | string | null): string | null => {
    if (!value) return null
    return value instanceof Date ? value.toISOString().split('T')[0] : String(value)
  }

  // Use individual updates instead of upsert to avoid NOT NULL constraint issues
  // (upsert requires all NOT NULL columns even when updating existing rows)
  const results = await Promise.all(
    tasks.map(task => {
      // Completed task freeze: persist CPM fields only, do NOT overwrite start_date/end_date
      if (task.percent_complete === 100) {
        return supabase
          .from('tasks')
          .update({
            es: toDateStr(task.es),
            ef: toDateStr(task.ef),
            ls: toDateStr(task.ls),
            lf: toDateStr(task.lf),
            slack: task.slack ?? 0,
            is_critical: task.is_critical ?? false,
          } as never)
          .eq('id', task.id)
      }

      // Manual tasks: preserve user's start_date, sync end_date from computed EF
      // (EF = start_date + duration, computed in scheduling engine)
      if (task.scheduling_mode === 'manual') {
        return supabase
          .from('tasks')
          .update({
            es: toDateStr(task.es),
            ef: toDateStr(task.ef),
            ls: toDateStr(task.ls),
            lf: toDateStr(task.lf),
            slack: task.slack ?? 0,
            is_critical: task.is_critical ?? false,
            end_date: toDateStr(task.ef),
          } as never)
          .eq('id', task.id)
      }

      // Auto tasks: sync start_date/end_date with es/ef as before
      return supabase
        .from('tasks')
        .update({
          es: toDateStr(task.es),
          ef: toDateStr(task.ef),
          ls: toDateStr(task.ls),
          lf: toDateStr(task.lf),
          slack: task.slack ?? 0,
          is_critical: task.is_critical ?? false,
          start_date: toDateStr(task.es),
          end_date: toDateStr(task.ef),
        } as never)
        .eq('id', task.id)
    })
  )

  const firstError = results.find(r => r.error)
  if (firstError?.error) {
    return { data: null, error: { message: firstError.error.message, code: firstError.error.code } }
  }

  return { data: null, error: null }
}

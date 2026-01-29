/**
 * Tasks Service
 *
 * CRUD operations for tasks using Supabase.
 */

import { supabase } from '@/lib/supabase'
import type { Task } from '@/types/entities'

export interface CreateTaskInput {
  project_id: string
  phase_id?: string | null
  title: string
  description?: string | null
  task_type?: Task['task_type']
  status?: Task['status']
  priority?: Task['priority']
  duration?: number
  start_date?: string | null
  due_date?: string | null
  estimated_hours?: number | null
  actual_hours?: number
  progress_percent?: number
  wbs_number?: string | null
  order_index?: number
}

export interface UpdateTaskInput {
  phase_id?: string | null
  title?: string
  description?: string | null
  task_type?: Task['task_type']
  status?: Task['status']
  priority?: Task['priority']
  duration?: number
  start_date?: string | null
  due_date?: string | null
  estimated_hours?: number | null
  actual_hours?: number
  progress_percent?: number
  wbs_number?: string | null
  order_index?: number
}

export interface TasksFilter {
  phase_id?: string
  status?: Task['status']
  priority?: Task['priority']
  task_type?: Task['task_type']
}

export interface TaskOrderUpdate {
  id: string
  order_index: number
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

  if (
    input.progress_percent !== undefined &&
    (input.progress_percent < 0 || input.progress_percent > 100)
  ) {
    return 'Invalid progress_percent. Must be between 0 and 100'
  }

  return null
}

function validateUpdateInput(input: UpdateTaskInput): string | null {
  if (
    input.progress_percent !== undefined &&
    (input.progress_percent < 0 || input.progress_percent > 100)
  ) {
    return 'Invalid progress_percent. Must be between 0 and 100'
  }

  return null
}

function validateTaskOrders(taskOrders: TaskOrderUpdate[]): string | null {
  for (const order of taskOrders) {
    if (order.order_index < 0) {
      return 'Invalid order_index. Must be non-negative'
    }
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

  // Set defaults
  const taskData = {
    project_id: input.project_id,
    phase_id: input.phase_id ?? null,
    title: input.title.trim(),
    description: input.description ?? null,
    task_type: input.task_type ?? 'task',
    status: input.status ?? 'pending',
    priority: input.priority ?? 'medium',
    start_date: input.start_date ?? null,
    due_date: input.due_date ?? null,
    estimated_hours: input.estimated_hours ?? null,
    actual_hours: input.actual_hours ?? 0,
    progress_percent: input.progress_percent ?? 0,
    wbs_number: input.wbs_number ?? null,
    order_index: input.order_index ?? 0,
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

  if (filter?.task_type) {
    query = query.eq('task_type', filter.task_type)
  }

  const { data, error } = await query.order('order_index', { ascending: true })

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

/**
 * Reorder tasks by updating their order_index values
 */
export async function reorderTasks(
  taskOrders: TaskOrderUpdate[]
): Promise<ServiceResult<void>> {
  // Validate input
  const validationError = validateTaskOrders(taskOrders)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  // Update each task's order_index
  for (const order of taskOrders) {
    const { error } = await supabase
      .from('tasks')
      .update({ order_index: order.order_index, updated_at: new Date().toISOString() } as never)
      .eq('id', order.id)
      .select()
      .single()

    if (error) {
      return {
        data: null,
        error: { message: error.message, code: error.code },
      }
    }
  }

  return { data: null, error: null }
}

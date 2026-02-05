/**
 * Task Assignments Service
 *
 * CRUD operations for task assignments using Supabase.
 */

import { supabase } from '@/lib/supabase'
import type { TaskAssignment, CreateTaskAssignmentInput } from '@/types/entities'
import type { InsertTables } from '@/types/database'

export interface UpdateTaskAssignmentInput {
  allocated_hours?: number
  actual_hours?: number
  notes?: string | null
}

interface ServiceResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

// Validation helpers
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

function validateCreateInput(input: CreateTaskAssignmentInput): string | null {
  if (!input.task_id) {
    return 'Task ID is required (task_id)'
  }

  if (!input.user_id) {
    return 'User ID is required (user_id)'
  }

  if (input.allocated_hours <= 0) {
    return 'Allocated hours must be greater than zero (allocated_hours)'
  }

  if (input.start_date !== undefined && input.start_date !== null && !isValidDate(input.start_date)) {
    return 'Invalid start date provided (start_date)'
  }

  return null
}

function validateUpdateInput(input: UpdateTaskAssignmentInput): string | null {
  if (input.allocated_hours !== undefined && input.allocated_hours <= 0) {
    return 'Allocated hours must be greater than zero (allocated_hours)'
  }

  if (input.actual_hours !== undefined && input.actual_hours < 0) {
    return 'Actual hours cannot be negative (actual_hours)'
  }

  return null
}

/**
 * Format date as ISO string (YYYY-MM-DD) for database storage
 */
function formatDateForDb(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Create a new task assignment
 */
export async function createTaskAssignment(
  input: CreateTaskAssignmentInput
): Promise<ServiceResult<TaskAssignment>> {
  // Validate input
  const validationError = validateCreateInput(input)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  // Prepare data for database
  const assignmentData: InsertTables<'task_assignments'> = {
    task_id: input.task_id,
    user_id: input.user_id,
    allocated_hours: input.allocated_hours,
    start_date: input.start_date ? formatDateForDb(input.start_date) : null,
    notes: input.notes ?? null,
  }

  const { data, error } = await supabase
    .from('task_assignments')
    .insert(assignmentData as never)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as TaskAssignment, error: null }
}

/**
 * Get a task assignment by ID
 */
export async function getTaskAssignment(
  id: string
): Promise<ServiceResult<TaskAssignment>> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as TaskAssignment | null, error: null }
}

/**
 * Get all task assignments for a task
 */
export async function getTaskAssignments(
  taskId: string
): Promise<ServiceResult<TaskAssignment[]>> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as TaskAssignment[]) ?? [], error: null }
}

/**
 * Get all task assignments for a user
 */
export async function getTaskAssignmentsByUser(
  userId: string
): Promise<ServiceResult<TaskAssignment[]>> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as TaskAssignment[]) ?? [], error: null }
}

/**
 * Get all task assignments for tasks in a project
 * Uses a join with tasks table to filter by project_id
 */
export async function getTaskAssignmentsByProject(
  projectId: string
): Promise<ServiceResult<TaskAssignment[]>> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select('*, tasks!inner(project_id)')
    .eq('tasks.project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  // Strip the tasks join data and return just the assignments
  const assignments = (data || []).map((item: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tasks, ...assignment } = item
    return assignment as unknown as TaskAssignment
  })

  return { data: assignments, error: null }
}

/**
 * Update a task assignment
 */
export async function updateTaskAssignment(
  id: string,
  updates: UpdateTaskAssignmentInput
): Promise<ServiceResult<TaskAssignment>> {
  // Validate input
  const validationError = validateUpdateInput(updates)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {}

  if (updates.allocated_hours !== undefined) {
    updateData.allocated_hours = updates.allocated_hours
  }

  if (updates.actual_hours !== undefined) {
    updateData.actual_hours = updates.actual_hours
  }

  if (updates.notes !== undefined) {
    updateData.notes = updates.notes
  }

  const { data, error } = await supabase
    .from('task_assignments')
    .update(updateData as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as TaskAssignment, error: null }
}

/**
 * Delete a task assignment
 */
export async function deleteTaskAssignment(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('task_assignments').delete().eq('id', id)

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: null, error: null }
}

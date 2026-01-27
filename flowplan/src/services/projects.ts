/**
 * Projects Service
 *
 * CRUD operations for projects using Supabase.
 */

import { supabase } from '@/lib/supabase'
import type { Project } from '@/types/entities'

export interface CreateProjectInput {
  organization_id: string
  name: string
  description?: string | null
  status?: Project['status']
  methodology?: Project['methodology']
  start_date?: string | null
  target_end_date?: string | null
  budget_amount?: number | null
  budget_currency?: string
  owner_id: string
  working_days?: number[]
  default_work_hours?: number
}

export interface UpdateProjectInput {
  name?: string
  description?: string | null
  status?: Project['status']
  methodology?: Project['methodology']
  start_date?: string | null
  target_end_date?: string | null
  actual_end_date?: string | null
  budget_amount?: number | null
  budget_currency?: string
  owner_id?: string
  working_days?: number[]
  default_work_hours?: number
}

export interface ProjectsFilter {
  status?: Project['status']
  owner_id?: string
}

interface ServiceResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

// Validation helpers
function validateCreateInput(input: CreateProjectInput): string | null {
  if (!input.name || input.name.trim() === '') {
    return 'Project name is required'
  }

  if (!input.organization_id) {
    return 'Organization ID is required'
  }

  if (!input.owner_id) {
    return 'Owner ID is required'
  }

  if (input.working_days) {
    const invalidDays = input.working_days.filter((d) => d < 0 || d > 6)
    if (invalidDays.length > 0) {
      return 'Invalid working_days values. Must be 0-6 (Sunday-Saturday)'
    }
  }

  if (input.budget_amount !== undefined && input.budget_amount !== null && input.budget_amount < 0) {
    return 'Invalid budget_amount. Must be a positive number'
  }

  return null
}

/**
 * Create a new project
 */
export async function createProject(
  input: CreateProjectInput
): Promise<ServiceResult<Project>> {
  // Validate input
  const validationError = validateCreateInput(input)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  // Set defaults
  const projectData = {
    organization_id: input.organization_id,
    name: input.name.trim(),
    description: input.description ?? null,
    status: input.status ?? 'planning',
    methodology: input.methodology ?? 'waterfall',
    start_date: input.start_date ?? null,
    target_end_date: input.target_end_date ?? null,
    budget_amount: input.budget_amount ?? null,
    budget_currency: input.budget_currency ?? 'ILS',
    owner_id: input.owner_id,
    working_days: input.working_days ?? [0, 1, 2, 3, 4], // Israeli workweek
    default_work_hours: input.default_work_hours ?? 9,
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(projectData as never)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as Project, error: null }
}

/**
 * Get a project by ID
 */
export async function getProject(id: string): Promise<ServiceResult<Project>> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as Project | null, error: null }
}

/**
 * Get all projects for an organization
 */
export async function getProjects(
  organizationId: string,
  filter?: ProjectsFilter
): Promise<ServiceResult<Project[]>> {
  let query = supabase
    .from('projects')
    .select('*')
    .eq('organization_id', organizationId)

  if (filter?.status) {
    query = query.eq('status', filter.status)
  }

  if (filter?.owner_id) {
    query = query.eq('owner_id', filter.owner_id)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as Project[]) ?? [], error: null }
}

/**
 * Update a project
 */
export async function updateProject(
  id: string,
  updates: UpdateProjectInput
): Promise<ServiceResult<Project>> {
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updateData as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as Project, error: null }
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: null, error: null }
}

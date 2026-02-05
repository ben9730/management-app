/**
 * Projects Service
 *
 * CRUD operations for projects using Supabase.
 * Updated to match actual database schema.
 */

import { supabase } from '@/lib/supabase'
import type { Project } from '@/types/entities'
import { createPhase } from './phases'

export interface CreateProjectInput {
  name: string
  description?: string | null
  status?: Project['status']
  start_date?: string | null
  end_date?: string | null
}

export interface UpdateProjectInput {
  name?: string
  description?: string | null
  status?: Project['status']
  start_date?: string | null
  end_date?: string | null
}

export interface ProjectsFilter {
  status?: Project['status']
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

  // Fetch current user to set created_by (if available)
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user

  // Only include fields that exist in the database schema
  const projectData = {
    name: input.name.trim(),
    description: input.description ?? null,
    status: input.status ?? 'active',
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    created_by: user?.id || null,
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(projectData as never)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  const project = data as Project

  // Create default phase "כללי" (General) for the new project
  // This is non-blocking - if it fails, we still return the project
  try {
    await createPhase({
      project_id: project.id,
      name: 'כללי',
      description: 'שלב ברירת מחדל',
      phase_order: 1,
    })
  } catch (phaseError) {
    // Log the error but don't fail the project creation
    console.warn('Failed to create default phase for project:', phaseError)
  }

  return { data: project, error: null }
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
 * Get all projects (optionally filtered by status)
 */
export async function getProjects(
  _organizationId?: string, // Kept for API compatibility but not used in simplified schema
  filter?: ProjectsFilter
): Promise<ServiceResult<Project[]>> {
  let query = supabase.from('projects').select('*')

  if (filter?.status) {
    query = query.eq('status', filter.status)
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
  // Only include fields that exist in the database schema
  const updateData: Record<string, unknown> = {}

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.start_date !== undefined) updateData.start_date = updates.start_date
  if (updates.end_date !== undefined) updateData.end_date = updates.end_date

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

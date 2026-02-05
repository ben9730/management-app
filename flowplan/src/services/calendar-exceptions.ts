/**
 * Calendar Exceptions Service
 *
 * CRUD operations for calendar exceptions (holidays, non-working days) using Supabase.
 */

import { supabase } from '@/lib/supabase'
import type { CalendarException, CalendarExceptionType, CreateCalendarExceptionInput } from '@/types/entities'
import type { InsertTables } from '@/types/database'

const VALID_TYPES: CalendarExceptionType[] = ['holiday', 'non_working']

export interface UpdateCalendarExceptionInput {
  date?: Date
  end_date?: Date | null
  type?: CalendarExceptionType
  name?: string | null
}

interface ServiceResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

// Validation helpers
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

function validateCreateInput(input: CreateCalendarExceptionInput): string | null {
  if (!input.project_id) {
    return 'Project ID is required (project_id)'
  }

  if (!input.date || !isValidDate(input.date)) {
    return 'Valid date is required (date)'
  }

  // If end_date is provided, validate it
  if (input.end_date !== undefined && input.end_date !== null) {
    if (!isValidDate(input.end_date)) {
      return 'Invalid end_date provided'
    }
    // end_date must be >= date
    if (input.end_date < input.date) {
      return 'end_date must be after or equal to date'
    }
  }

  if (!VALID_TYPES.includes(input.type)) {
    return `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
  }

  return null
}

function validateUpdateInput(input: UpdateCalendarExceptionInput): string | null {
  if (input.date !== undefined && !isValidDate(input.date)) {
    return 'Invalid date provided (date)'
  }

  // If end_date is provided and not null, validate it
  if (input.end_date !== undefined && input.end_date !== null && !isValidDate(input.end_date)) {
    return 'Invalid end_date provided'
  }

  if (input.type !== undefined && !VALID_TYPES.includes(input.type)) {
    return `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
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
 * Create a new calendar exception
 */
export async function createCalendarException(
  input: CreateCalendarExceptionInput
): Promise<ServiceResult<CalendarException>> {
  // Validate input
  const validationError = validateCreateInput(input)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  // Prepare data for database
  const exceptionData: InsertTables<'calendar_exceptions'> = {
    project_id: input.project_id,
    date: formatDateForDb(input.date),
    end_date: input.end_date ? formatDateForDb(input.end_date) : null,
    type: input.type,
    name: input.name ?? null,
  }

  const { data, error } = await supabase
    .from('calendar_exceptions')
    .insert(exceptionData as never)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as CalendarException, error: null }
}

/**
 * Get a calendar exception by ID
 */
export async function getCalendarException(
  id: string
): Promise<ServiceResult<CalendarException>> {
  const { data, error } = await supabase
    .from('calendar_exceptions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as CalendarException | null, error: null }
}

/**
 * Get all calendar exceptions for a project
 */
export async function getCalendarExceptions(
  projectId: string
): Promise<ServiceResult<CalendarException[]>> {
  const { data, error } = await supabase
    .from('calendar_exceptions')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: true })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as CalendarException[]) ?? [], error: null }
}

/**
 * Update a calendar exception
 */
export async function updateCalendarException(
  id: string,
  updates: UpdateCalendarExceptionInput
): Promise<ServiceResult<CalendarException>> {
  // Validate input
  const validationError = validateUpdateInput(updates)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {}

  if (updates.date !== undefined) {
    updateData.date = formatDateForDb(updates.date)
  }

  if (updates.end_date !== undefined) {
    updateData.end_date = updates.end_date ? formatDateForDb(updates.end_date) : null
  }

  if (updates.type !== undefined) {
    updateData.type = updates.type
  }

  if (updates.name !== undefined) {
    updateData.name = updates.name
  }

  const { data, error } = await supabase
    .from('calendar_exceptions')
    .update(updateData as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as CalendarException, error: null }
}

/**
 * Delete a calendar exception
 */
export async function deleteCalendarException(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('calendar_exceptions').delete().eq('id', id)

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: null, error: null }
}

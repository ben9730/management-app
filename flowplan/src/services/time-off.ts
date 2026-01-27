/**
 * Time Off Service
 *
 * CRUD operations for employee time off using Supabase.
 */

import { supabase } from '@/lib/supabase'
import type { EmployeeTimeOff, TimeOffType, TimeOffStatus } from '@/types/entities'

const VALID_TYPES: TimeOffType[] = ['vacation', 'sick', 'personal', 'other']
const VALID_STATUSES: TimeOffStatus[] = ['pending', 'approved', 'rejected']

export interface CreateTimeOffInput {
  user_id: string
  start_date: string
  end_date: string
  type: TimeOffType
  notes?: string | null
}

export interface UpdateTimeOffInput {
  start_date?: string
  end_date?: string
  type?: TimeOffType
  status?: TimeOffStatus
  notes?: string | null
}

export interface TimeOffsFilter {
  startDate: string
  endDate: string
  status?: TimeOffStatus
}

export interface UserTimeOffsFilter {
  startDate?: string
  endDate?: string
  status?: TimeOffStatus
}

interface ServiceResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

// Validation helpers
function validateCreateInput(input: CreateTimeOffInput): string | null {
  if (!input.user_id) {
    return 'User ID is required (user_id)'
  }

  if (!input.start_date) {
    return 'Start date is required (start_date)'
  }

  if (!input.end_date) {
    return 'End date is required (end_date)'
  }

  const start = new Date(input.start_date)
  const end = new Date(input.end_date)
  if (end < start) {
    return 'End date must be after or equal to start date (end_date)'
  }

  if (!VALID_TYPES.includes(input.type)) {
    return `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
  }

  return null
}

function validateUpdateInput(input: UpdateTimeOffInput): string | null {
  if (input.type !== undefined && !VALID_TYPES.includes(input.type)) {
    return `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
  }

  if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
    return `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
  }

  if (input.start_date && input.end_date) {
    const start = new Date(input.start_date)
    const end = new Date(input.end_date)
    if (end < start) {
      return 'End date must be after or equal to start date (end_date)'
    }
  }

  return null
}

/**
 * Create a new time off record
 */
export async function createTimeOff(
  input: CreateTimeOffInput
): Promise<ServiceResult<EmployeeTimeOff>> {
  // Validate input
  const validationError = validateCreateInput(input)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  // Set defaults
  const timeOffData = {
    user_id: input.user_id,
    start_date: input.start_date,
    end_date: input.end_date,
    type: input.type,
    status: 'approved' as TimeOffStatus, // Default to approved for MVP
    notes: input.notes ?? null,
  }

  const { data, error } = await supabase
    .from('employee_time_off')
    .insert(timeOffData as never)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as EmployeeTimeOff, error: null }
}

/**
 * Get a time off record by ID
 */
export async function getTimeOff(
  id: string
): Promise<ServiceResult<EmployeeTimeOff>> {
  const { data, error } = await supabase
    .from('employee_time_off')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as EmployeeTimeOff | null, error: null }
}

/**
 * Get all time offs within a date range
 */
export async function getTimeOffs(
  filter: TimeOffsFilter
): Promise<ServiceResult<EmployeeTimeOff[]>> {
  let query = supabase
    .from('employee_time_off')
    .select('*')
    .gte('end_date', filter.startDate)
    .lte('start_date', filter.endDate)

  if (filter.status) {
    query = query.eq('status', filter.status)
  }

  const { data, error } = await query.order('start_date', { ascending: true })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as EmployeeTimeOff[]) ?? [], error: null }
}

/**
 * Get all time offs for a specific user
 */
export async function getTimeOffsByUser(
  userId: string,
  filter?: UserTimeOffsFilter
): Promise<ServiceResult<EmployeeTimeOff[]>> {
  let query = supabase
    .from('employee_time_off')
    .select('*')
    .eq('user_id', userId)

  if (filter?.startDate) {
    query = query.gte('end_date', filter.startDate)
  }

  if (filter?.endDate) {
    query = query.lte('start_date', filter.endDate)
  }

  if (filter?.status) {
    query = query.eq('status', filter.status)
  }

  const { data, error } = await query.order('start_date', { ascending: true })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as EmployeeTimeOff[]) ?? [], error: null }
}

/**
 * Update a time off record
 */
export async function updateTimeOff(
  id: string,
  updates: UpdateTimeOffInput
): Promise<ServiceResult<EmployeeTimeOff>> {
  // Validate input
  const validationError = validateUpdateInput(updates)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  const { data, error } = await supabase
    .from('employee_time_off')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as EmployeeTimeOff, error: null }
}

/**
 * Delete a time off record
 */
export async function deleteTimeOff(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('employee_time_off').delete().eq('id', id)

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: null, error: null }
}

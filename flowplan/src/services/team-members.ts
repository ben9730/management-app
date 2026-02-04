/**
 * Team Members Service
 *
 * CRUD operations for team members using Supabase.
 */

import { supabase } from '@/lib/supabase'
import type { TeamMember, EmployeeTimeOff } from '@/types/entities'

const VALID_ROLES = ['admin', 'manager', 'member', 'viewer'] as const

export interface CreateTeamMemberInput {
  organization_id: string
  user_id?: string | null
  display_name: string
  email: string
  avatar_url?: string | null
  role?: TeamMember['role']
  hourly_rate?: number | null
  weekly_capacity_hours?: number
  skills?: string[]
}

export interface UpdateTeamMemberInput {
  user_id?: string | null
  display_name?: string
  email?: string
  avatar_url?: string | null
  role?: TeamMember['role']
  hourly_rate?: number | null
  weekly_capacity_hours?: number
  skills?: string[]
  is_active?: boolean
}

export interface TeamMembersFilter {
  is_active?: boolean
  role?: TeamMember['role']
}

interface ServiceResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Validation helpers
function validateCreateInput(input: CreateTeamMemberInput): string | null {
  if (!input.organization_id) {
    return 'Organization ID is required (organization_id)'
  }

  if (!input.display_name || input.display_name.trim() === '') {
    return 'Display name is required (display_name)'
  }

  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    return 'Valid email is required'
  }

  if (
    input.hourly_rate !== undefined &&
    input.hourly_rate !== null &&
    input.hourly_rate < 0
  ) {
    return 'Invalid hourly_rate. Must be a positive number'
  }

  if (
    input.weekly_capacity_hours !== undefined &&
    input.weekly_capacity_hours < 0
  ) {
    return 'Invalid weekly_capacity_hours. Must be a positive number'
  }

  return null
}

function validateUpdateInput(input: UpdateTeamMemberInput): string | null {
  if (input.email !== undefined && !EMAIL_REGEX.test(input.email)) {
    return 'Invalid email format'
  }

  if (
    input.hourly_rate !== undefined &&
    input.hourly_rate !== null &&
    input.hourly_rate < 0
  ) {
    return 'Invalid hourly_rate. Must be a positive number'
  }

  if (
    input.weekly_capacity_hours !== undefined &&
    input.weekly_capacity_hours < 0
  ) {
    return 'Invalid weekly_capacity_hours. Must be a positive number'
  }

  return null
}

/**
 * Create a new team member
 */
export async function createTeamMember(
  input: CreateTeamMemberInput
): Promise<ServiceResult<TeamMember>> {
  // Validate input
  const validationError = validateCreateInput(input)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  // Set defaults
  const memberData = {
    organization_id: input.organization_id,
    user_id: input.user_id ?? null,
    display_name: input.display_name.trim(),
    email: input.email.toLowerCase().trim(),
    avatar_url: input.avatar_url ?? null,
    role: input.role ?? 'member',
    hourly_rate: input.hourly_rate ?? null,
    weekly_capacity_hours: input.weekly_capacity_hours ?? 40,
    skills: input.skills ?? [],
    is_active: true,
  }

  const { data, error } = await supabase
    .from('team_members')
    .insert(memberData as never)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as TeamMember, error: null }
}

/**
 * Get a team member by ID
 */
export async function getTeamMember(
  id: string
): Promise<ServiceResult<TeamMember>> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as TeamMember | null, error: null }
}

/**
 * Get all team members for an organization
 */
export async function getTeamMembers(
  organizationId: string,
  filter?: TeamMembersFilter
): Promise<ServiceResult<TeamMember[]>> {
  let query = supabase
    .from('team_members')
    .select('*')
    .eq('organization_id', organizationId)

  if (filter?.is_active !== undefined) {
    query = query.eq('is_active', filter.is_active)
  }

  if (filter?.role) {
    query = query.eq('role', filter.role)
  }

  const { data, error } = await query.order('display_name', { ascending: true })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as TeamMember[]) ?? [], error: null }
}

/**
 * Get team members assigned to a project
 */
export async function getTeamMembersByProject(
  projectId: string
): Promise<ServiceResult<TeamMember[]>> {
  // Query through the project_members junction table
  const { data, error } = await supabase
    .from('project_members')
    .select('team_member:team_members(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  // Extract team members from the join result
  const members = (data ?? []).map((item: { team_member: TeamMember }) => item.team_member)
  return { data: members, error: null }
}

/**
 * Update a team member
 */
export async function updateTeamMember(
  id: string,
  updates: UpdateTeamMemberInput
): Promise<ServiceResult<TeamMember>> {
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
    .from('team_members')
    .update(updateData as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as TeamMember, error: null }
}

/**
 * Delete a team member
 */
export async function deleteTeamMember(
  id: string
): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('team_members').delete().eq('id', id)

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: null, error: null }
}

/**
 * Result type for member availability check
 */
export interface MemberAvailabilityResult {
  available: boolean
  conflictingTimeOff?: EmployeeTimeOff
  error?: { message: string; code?: string }
}

/**
 * Check if a team member is available during a given date range
 * Checks the employee_time_off table for any approved time off that overlaps
 * with the given date range.
 *
 * @param memberId - The team member's ID
 * @param startDate - Start of the date range to check
 * @param endDate - End of the date range to check
 * @returns Availability result with conflicting time off if unavailable
 */
export async function checkMemberAvailability(
  memberId: string,
  startDate: Date,
  endDate: Date
): Promise<MemberAvailabilityResult> {
  // Format dates for Supabase query
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  // Query for approved time off that overlaps with the date range
  // Overlap condition: time_off.start_date <= endDate AND time_off.end_date >= startDate
  const { data, error } = await supabase
    .from('employee_time_off')
    .select('*')
    .eq('team_member_id', memberId)
    .eq('status', 'approved')
    .lte('start_date', endDateStr)
    .gte('end_date', startDateStr)
    .order('start_date', { ascending: true })

  if (error) {
    // Fail-open: return available on error for better usability
    return {
      available: true,
      error: { message: error.message, code: error.code },
    }
  }

  // If any time off records exist, the member is unavailable
  if (data && data.length > 0) {
    return {
      available: false,
      conflictingTimeOff: data[0] as EmployeeTimeOff,
    }
  }

  return { available: true }
}

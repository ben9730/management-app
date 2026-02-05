/**
 * Users Service
 *
 * Functions for fetching registered users from auth.users via Supabase.
 */

import { supabase } from '@/lib/supabase'

export interface RegisteredUser {
  id: string
  email: string
  created_at: string
}

interface ServiceResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

/**
 * Get all registered users
 * Uses the get_registered_users() database function which has SECURITY DEFINER
 * to safely access auth.users
 */
export async function getRegisteredUsers(): Promise<ServiceResult<RegisteredUser[]>> {
  const { data, error } = await supabase.rpc('get_registered_users')

  if (error) {
    return {
      data: null,
      error: { message: error.message, code: error.code },
    }
  }

  // Filter out test/e2e users for cleaner display
  const filteredUsers = (data as RegisteredUser[]).filter(
    (user) => !user.email.includes('@flowplan.test')
  )

  return { data: filteredUsers, error: null }
}

/**
 * Get a specific user by ID
 */
export async function getRegisteredUserById(
  userId: string
): Promise<ServiceResult<RegisteredUser | null>> {
  const { data, error } = await supabase.rpc('get_registered_users')

  if (error) {
    return {
      data: null,
      error: { message: error.message, code: error.code },
    }
  }

  const user = (data as RegisteredUser[]).find((u) => u.id === userId) || null

  return { data: user, error: null }
}

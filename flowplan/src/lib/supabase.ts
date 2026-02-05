/**
 * Supabase Client Configuration
 *
 * This file provides the Supabase client for browser context.
 * For server-side operations, use lib/supabase-server.ts
 *
 * Environment variables required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

/**
 * Supabase client for browser context
 * Uses cookie-based session management for SSR compatibility
 */
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey
)

/**
 * Helper to get current user from Supabase auth
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting user:', error)
    return null
  }
  return user
}

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null
}

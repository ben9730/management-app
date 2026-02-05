/**
 * Authentication Types
 * Types for user authentication and authorization
 */

import type { User, Session } from '@supabase/supabase-js'

// ============================================
// Auth User
// ============================================

export interface AuthUser extends User {
  full_name?: string
  avatar_url?: string
}

// ============================================
// Auth State
// ============================================

export interface AuthState {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  error: AuthError | null
}

// ============================================
// Auth Credentials
// ============================================

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  full_name: string
}

// ============================================
// Auth Error
// ============================================

export interface AuthError {
  message: string
  code?: string
}

// ============================================
// Service Result (matching existing pattern)
// ============================================

export interface AuthResult<T> {
  data: T | null
  error: AuthError | null
}

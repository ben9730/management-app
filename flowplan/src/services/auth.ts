/**
 * Auth Service
 * Handles user authentication operations with Supabase
 */

import { supabase } from '@/lib/supabase'
import type { AuthResult, LoginCredentials, RegisterCredentials } from '@/types/auth'
import type { User, Session } from '@supabase/supabase-js'

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult<User>> {
  // Validate input
  if (!EMAIL_REGEX.test(email)) {
    return {
      data: null,
      error: { message: 'Invalid email format' },
    }
  }

  if (!password || password.trim() === '') {
    return {
      data: null,
      error: { message: 'Password is required' },
    }
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
        },
      }
    }

    return {
      data: data.user,
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Sign in failed',
      },
    }
  }
}

/**
 * Sign up with email, password, and metadata
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult<User>> {
  // Validate input
  if (!EMAIL_REGEX.test(email)) {
    return {
      data: null,
      error: { message: 'Invalid email format' },
    }
  }

  if (!password || password.length < 6) {
    return {
      data: null,
      error: { message: 'Password must be at least 6 characters' },
    }
  }

  // Full name is optional, use email as fallback
  const displayName = fullName && fullName.trim() !== ''
    ? fullName.trim()
    : email.split('@')[0]

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
        },
      },
    })

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
        },
      }
    }

    return {
      data: data.user,
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Sign up failed',
      },
    }
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<AuthResult<boolean>> {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
        },
      }
    }

    return {
      data: true,
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Sign out failed',
      },
    }
  }
}

/**
 * Get current session
 */
export async function getSession(): Promise<AuthResult<Session>> {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
        },
      }
    }

    return {
      data: data.session,
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get session',
      },
    }
  }
}

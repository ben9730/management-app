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
 * Translate Supabase auth errors to Hebrew
 */
function translateAuthError(error: string): string {
  const translations: Record<string, string> = {
    'Invalid email format': 'פורמט אימייל לא תקין',
    'Password is required': 'נדרשת סיסמה',
    'Password must be at least 6 characters': 'הסיסמה חייבת להכיל לפחות 6 תווים',
    'Invalid login credentials': 'פרטי התחברות שגויים',
    'Email not confirmed': 'האימייל טרם אומת',
    'User already registered': 'משתמש כבר רשום במערכת',
    'Invalid password': 'סיסמה שגויה',
    'Email already registered': 'האימייל כבר רשום במערכת',
    'Sign in failed': 'ההתחברות נכשלה',
    'Sign up failed': 'ההרשמה נכשלה',
    'Sign out failed': 'היציאה נכשלה',
    'Failed to get session': 'שגיאה בקבלת מידע על המשתמש',
  }

  // Try exact match first
  if (translations[error]) {
    return translations[error]
  }

  // Try partial matches for common Supabase errors
  if (error.includes('Invalid login credentials')) {
    return 'פרטי התחברות שגויים - בדוק את האימייל והסיסמה'
  }
  if (error.includes('already registered') || error.includes('already exists')) {
    return 'המשתמש כבר קיים במערכת - נסה להתחבר'
  }
  if (error.includes('Email not confirmed')) {
    return 'האימייל טרם אומת - בדוק את תיבת הדואר שלך'
  }
  if (error.includes('password')) {
    return 'סיסמה שגויה'
  }

  // Return original error if no translation found
  return error
}

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
      error: { message: translateAuthError('Invalid email format') },
    }
  }

  if (!password || password.trim() === '') {
    return {
      data: null,
      error: { message: translateAuthError('Password is required') },
    }
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const translatedMessage = translateAuthError(error.message)
      return {
        data: null,
        error: {
          message: translatedMessage,
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
        message: translateAuthError(error instanceof Error ? error.message : 'Sign in failed'),
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
      error: { message: translateAuthError('Invalid email format') },
    }
  }

  if (!password || password.length < 6) {
    return {
      data: null,
      error: { message: translateAuthError('Password must be at least 6 characters') },
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
          message: translateAuthError(error.message),
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
        message: translateAuthError(error instanceof Error ? error.message : 'Sign up failed'),
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
          message: translateAuthError(error.message),
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
        message: translateAuthError(error instanceof Error ? error.message : 'Sign out failed'),
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
          message: translateAuthError(error.message),
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
        message: translateAuthError(error instanceof Error ? error.message : 'Failed to get session'),
      },
    }
  }
}

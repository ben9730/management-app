/**
 * Auth Service Tests
 * TDD tests for authentication operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signIn, signUp, signOut, getSession } from './auth'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
  },
}))

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signIn', () => {
    it('should sign in with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      }

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      } as any)

      const result = await signIn('test@example.com', 'password123')

      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeNull()
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('should return error for invalid credentials', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
      } as any)

      const result = await signIn('test@example.com', 'wrongpassword')

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        message: 'פרטי התחברות שגויים',
        code: 'invalid_credentials',
      })
    })

    it('should validate email format', async () => {
      const result = await signIn('invalid-email', 'password123')

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('פורמט אימייל')
    })

    it('should validate password is not empty', async () => {
      const result = await signIn('test@example.com', '')

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('נדרשת סיסמה')
    })
  })

  describe('signUp', () => {
    it('should sign up with valid data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        user_metadata: { full_name: 'New User' },
      }

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      } as any)

      const result = await signUp('newuser@example.com', 'password123', 'New User')

      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeNull()
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'New User',
          },
        },
      })
    })

    it('should return error for existing email', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered', code: 'user_already_exists' },
      } as any)

      const result = await signUp('existing@example.com', 'password123', 'Existing User')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('משתמש כבר רשום במערכת')
    })

    it('should validate email format', async () => {
      const result = await signUp('invalid-email', 'password123', 'User')

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('פורמט אימייל')
    })

    it('should validate password length (min 6 chars)', async () => {
      const result = await signUp('test@example.com', '12345', 'User')

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('6 תווים')
    })

    it('should use email username as fallback when full name is empty', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'test' },
      }

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      } as any)

      const result = await signUp('test@example.com', 'password123', '')

      expect(result.data).toEqual(mockUser)
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'test', // Email username as fallback
          },
        },
      })
    })
  })

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      })

      const result = await signOut()

      expect(result.data).toBe(true)
      expect(result.error).toBeNull()
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })

    it('should return error if sign out fails', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: { message: 'Sign out failed', code: 'signout_error' },
      } as any)

      const result = await signOut()

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('היציאה נכשלה')
    })
  })

  describe('getSession', () => {
    it('should return current session', async () => {
      const mockSession = {
        access_token: 'token',
        user: { id: 'user-123', email: 'test@example.com' },
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      } as any)

      const result = await getSession()

      expect(result.data).toEqual(mockSession)
      expect(result.error).toBeNull()
    })

    it('should return null if no session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any)

      const result = await getSession()

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })
  })
})

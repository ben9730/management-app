/**
 * Auth Context
 * Global authentication state management
 */

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { AuthState, LoginCredentials, RegisterCredentials, AuthError } from '@/types/auth'
import { signIn as authSignIn, signUp as authSignUp, signOut as authSignOut } from '@/services/auth'

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    const result = await authSignIn(email, password)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return { error: result.error }
    }

    // Auth state will be updated by onAuthStateChange
    return { error: null }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setIsLoading(true)
    setError(null)
    const result = await authSignUp(email, password, fullName)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return { error: result.error }
    }

    // Auth state will be updated by onAuthStateChange
    return { error: null }
  }

  const signOut = async () => {
    setIsLoading(true)
    await authSignOut()
    // Auth state will be updated by onAuthStateChange
  }

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

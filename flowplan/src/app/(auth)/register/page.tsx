/**
 * Register Page
 * User registration entry point
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RegisterForm } from '@/components/forms/RegisterForm'
import { useAuth } from '@/contexts/AuthContext'

export default function RegisterPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    console.log('RegisterPage: user=', user?.email, 'isLoading=', isLoading)
    if (user && !isRedirecting) {
      console.log('RegisterPage: User detected, redirecting to dashboard...')
      setIsRedirecting(true)
      // Force navigation with window.location for reliability
      window.location.href = '/'
    }
  }, [user, isLoading, isRedirecting])

  // Show loading while checking auth or redirecting
  if (isLoading || isRedirecting || user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
        <div className="text-slate-400">
          {user ? 'מעביר ללוח הבקרה...' : 'טוען...'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">הרשמה</h2>
        <p className="text-slate-400">צור חשבון חדש ב-FlowPlan</p>
      </div>

      <RegisterForm />

      <div className="text-center text-sm text-slate-400">
        כבר יש לך חשבון?{' '}
        <a href="/login" className="text-purple-400 hover:text-purple-300">
          התחבר כאן
        </a>
      </div>
    </div>
  )
}

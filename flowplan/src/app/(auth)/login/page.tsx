/**
 * Login Page
 * User authentication entry point
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/forms/LoginForm'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <div className="text-slate-400">טוען...</div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">התחברות</h2>
        <p className="text-slate-400">ברוך הבא חזרה ל-FlowPlan</p>
      </div>

      <LoginForm />

      <div className="text-center text-sm text-slate-400">
        אין לך חשבון?{' '}
        <a href="/register" className="text-purple-400 hover:text-purple-300">
          הירשם כאן
        </a>
      </div>
    </div>
  )
}

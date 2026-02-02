/**
 * Register Page
 * User registration entry point
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RegisterForm } from '@/components/forms/RegisterForm'
import { useAuth } from '@/contexts/AuthContext'

export default function RegisterPage() {
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

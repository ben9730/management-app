/**
 * Register Form Component
 * Registration form for new users
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      setIsSubmitting(false)
      return
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      setIsSubmitting(false)
      return
    }

    try {
      const result = await signUp(email, password, fullName)

      if (result.error) {
        setError(result.error.message)
        setIsSubmitting(false)
      } else {
        // Success - redirect with full page reload
        window.location.href = '/'
      }
    } catch (err) {
      setError('שגיאה לא צפויה. נסה שוב.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      {/* Error Message Box - Visible to users */}
      {error && (
        <div
          className="p-4 rounded-xl bg-red-600 text-white text-base font-bold shadow-lg"
          role="alert"
        >
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-2">
          שם מלא (אופציונלי)
        </label>
        <Input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="שם מלא"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
          אימייל
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
          disabled={isSubmitting}
          variant={error ? 'error' : 'default'}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
          סיסמה
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          disabled={isSubmitting}
          variant={error ? 'error' : 'default'}
        />
        <p className="text-xs text-slate-400 mt-1">לפחות 6 תווים</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
          אישור סיסמה
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="••••••••"
          disabled={isSubmitting}
          variant={error ? 'error' : 'default'}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'יוצר חשבון...' : 'הירשם'}
      </Button>
    </form>
  )
}

/**
 * Debug Auth Page
 * Shows current authentication state
 */

'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function DebugAuthPage() {
  const { user, session, isLoading, error } = useAuth()

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Debug Authentication State</h1>

        <div className="space-y-6">
          {/* Loading State */}
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Loading State</h2>
            <p className="text-lg">
              {isLoading ? (
                <span className="text-yellow-400">⏳ Loading...</span>
              ) : (
                <span className="text-green-400">✓ Loaded</span>
              )}
            </p>
          </div>

          {/* User State */}
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">User State</h2>
            {user ? (
              <div className="space-y-2">
                <p className="text-green-400">✓ User is authenticated</p>
                <div className="bg-slate-900 p-4 rounded mt-4">
                  <p className="text-sm text-slate-400 mb-2">User ID:</p>
                  <p className="font-mono text-sm">{user.id}</p>

                  <p className="text-sm text-slate-400 mb-2 mt-4">Email:</p>
                  <p className="font-mono text-sm">{user.email}</p>

                  <p className="text-sm text-slate-400 mb-2 mt-4">Full Name:</p>
                  <p className="font-mono text-sm">
                    {user.user_metadata?.full_name || 'Not set'}
                  </p>

                  <p className="text-sm text-slate-400 mb-2 mt-4">Created At:</p>
                  <p className="font-mono text-sm">{user.created_at}</p>
                </div>
              </div>
            ) : (
              <p className="text-red-400">✗ No user (not authenticated)</p>
            )}
          </div>

          {/* Session State */}
          <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Session State</h2>
            {session ? (
              <div className="space-y-2">
                <p className="text-green-400">✓ Active session</p>
                <div className="bg-slate-900 p-4 rounded mt-4">
                  <p className="text-sm text-slate-400 mb-2">Access Token:</p>
                  <p className="font-mono text-xs break-all">
                    {session.access_token.substring(0, 50)}...
                  </p>

                  <p className="text-sm text-slate-400 mb-2 mt-4">Expires At:</p>
                  <p className="font-mono text-sm">
                    {new Date(session.expires_at! * 1000).toLocaleString('he-IL')}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-red-400">✗ No active session</p>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 text-red-400">Error</h2>
              <p className="text-red-300">{error.message}</p>
              {error.code && (
                <p className="text-red-400 text-sm mt-2">Code: {error.code}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Link
              href="/"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              ← חזרה לדשבורד
            </Link>
            {!user && (
              <>
                <Link
                  href="/login"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  התחבר
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  הירשם
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

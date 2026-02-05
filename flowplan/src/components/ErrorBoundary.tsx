/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the component tree and displays
 * a fallback UI instead of crashing the whole application.
 */

'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Custom fallback component */
  fallback?: React.ReactNode
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Reset key - when this changes, the error boundary resets */
  resetKey?: string | number
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * Default error fallback UI
 */
interface ErrorFallbackProps {
  error: Error | null
  resetError: () => void
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  return (
    <div
      role="alert"
      className="min-h-[400px] flex items-center justify-center p-8"
    >
      <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
          משהו השתבש
        </h2>
        <p className="text-red-600 dark:text-red-300 mb-4">
          אירעה שגיאה בלתי צפויה. אנחנו מצטערים על אי הנוחות.
        </p>
        {error && process.env.NODE_ENV === 'development' && (
          <details className="text-right mb-4">
            <summary className="cursor-pointer text-sm text-red-500 dark:text-red-400 hover:underline">
              פרטי השגיאה (מצב פיתוח)
            </summary>
            <pre className="mt-2 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg text-xs text-right overflow-auto max-h-32 font-mono">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}
        <div className="flex gap-3 justify-center">
          <Button
            onClick={resetError}
            variant="destructive"
          >
            נסה שוב
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="ghost"
          >
            רענן את הדף
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Error Boundary class component
 * Must be a class component to use componentDidCatch
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Store error info for display
    this.setState({ errorInfo })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when resetKey changes
    if (
      this.props.resetKey !== prevProps.resetKey &&
      this.state.hasError
    ) {
      this.resetError()
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Use default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={this.resetError}
        />
      )
    }

    return this.props.children
  }
}

export { ErrorBoundary, ErrorFallback }
export type { ErrorBoundaryProps, ErrorFallbackProps }

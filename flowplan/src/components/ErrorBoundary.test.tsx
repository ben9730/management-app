/**
 * ErrorBoundary Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

// Suppress console.error during tests since we expect errors
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  describe('when no error occurs', () => {
    it('renders children normally', () => {
      render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Normal content')).toBeInTheDocument()
    })

    it('does not show error fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByText('No error')).toBeInTheDocument()
    })
  })

  describe('when error occurs', () => {
    it('renders default error fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('משהו השתבש')).toBeInTheDocument()
      expect(screen.getByText(/אירעה שגיאה בלתי צפויה/)).toBeInTheDocument()
    })

    it('shows retry button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: 'נסה שוב' })).toBeInTheDocument()
    })

    it('shows refresh page button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: 'רענן את הדף' })).toBeInTheDocument()
    })

    it('resets error state when retry button clicked', () => {
      let shouldThrow = true
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error')
        }
        return <div>Recovered</div>
      }

      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      )

      // Error should be shown
      expect(screen.getByText('משהו השתבש')).toBeInTheDocument()

      // Fix the error condition
      shouldThrow = false

      // Click retry
      fireEvent.click(screen.getByRole('button', { name: 'נסה שוב' }))

      // Need to rerender to see the recovered state
      rerender(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      )

      // Should show recovered content
      expect(screen.getByText('Recovered')).toBeInTheDocument()
    })
  })

  describe('custom fallback', () => {
    it('renders custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error UI</div>}>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom error UI')).toBeInTheDocument()
      expect(screen.queryByText('משהו השתבש')).not.toBeInTheDocument()
    })
  })

  describe('onError callback', () => {
    it('calls onError when error is caught', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      )
    })
  })

  describe('resetKey prop', () => {
    it('resets error state when resetKey changes', () => {
      let shouldThrow = true
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error')
        }
        return <div>Success</div>
      }

      const { rerender } = render(
        <ErrorBoundary resetKey="key-1">
          <TestComponent />
        </ErrorBoundary>
      )

      // Error should be shown
      expect(screen.getByText('משהו השתבש')).toBeInTheDocument()

      // Fix the error and change the key
      shouldThrow = false

      rerender(
        <ErrorBoundary resetKey="key-2">
          <TestComponent />
        </ErrorBoundary>
      )

      // Should show success content
      expect(screen.getByText('Success')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has alert role for screen readers', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('buttons are keyboard accessible', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const retryButton = screen.getByRole('button', { name: 'נסה שוב' })
      const refreshButton = screen.getByRole('button', { name: 'רענן את הדף' })

      expect(retryButton).not.toBeDisabled()
      expect(refreshButton).not.toBeDisabled()
    })
  })
})

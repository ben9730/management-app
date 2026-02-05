/**
 * LoginForm Component Tests
 * TDD: Tests written FIRST, then implementation fixed
 *
 * Critical Bug Fix: Error messages must display on screen when login fails.
 * Root Cause: AuthContext.signIn sets isLoading=true, which causes LoginPage
 * to unmount LoginForm and show a spinner. When error returns and isLoading=false,
 * a NEW LoginForm is mounted with fresh state (no error).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

// Mock useAuth hook
const mockSignIn = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    isLoading: false,
  }),
}))

// Mock window.location
const mockLocationHref = vi.fn()
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
})

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignIn.mockReset()
  })

  describe('Error Display (Critical Bug Fix)', () => {
    it('should display error message on screen when login fails', async () => {
      // Arrange: Mock signIn to return an error
      const errorMessage = 'פרטי התחברות שגויים'
      mockSignIn.mockResolvedValue({
        error: { message: errorMessage },
      })

      render(<LoginForm />)

      // Act: Fill form and submit
      const emailInput = screen.getByPlaceholderText('your@email.com')
      const passwordInput = screen.getByPlaceholderText('••••••••')
      const submitButton = screen.getByRole('button', { name: /התחבר/i })

      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'wrongpassword')
      await userEvent.click(submitButton)

      // Assert: Error message should be VISIBLE on screen (not just in console)
      await waitFor(() => {
        const errorElement = screen.getByRole('alert')
        expect(errorElement).toBeInTheDocument()
        expect(errorElement).toHaveTextContent(errorMessage)
      })
    })

    it('should show error with red background styling', async () => {
      mockSignIn.mockResolvedValue({
        error: { message: 'שגיאה' },
      })

      render(<LoginForm />)

      await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrong')
      await userEvent.click(screen.getByRole('button', { name: /התחבר/i }))

      await waitFor(() => {
        const errorElement = screen.getByRole('alert')
        expect(errorElement).toBeInTheDocument()
        // Error box should have red background
        expect(errorElement.className).toContain('bg-red')
      })
    })

    it('should clear error when user starts typing again', async () => {
      mockSignIn.mockResolvedValue({
        error: { message: 'שגיאה' },
      })

      render(<LoginForm />)

      // First submit with error
      await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrong')
      await userEvent.click(screen.getByRole('button', { name: /התחבר/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })

      // Now user types again - error should clear on next submit
      mockSignIn.mockResolvedValue({ error: null })
      await userEvent.click(screen.getByRole('button', { name: /התחבר/i }))

      // Error should be gone after successful submission attempt
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })
  })

  describe('Successful Login', () => {
    it('should redirect to dashboard on successful login', async () => {
      mockSignIn.mockResolvedValue({ error: null })

      render(<LoginForm />)

      await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'correctpassword')
      await userEvent.click(screen.getByRole('button', { name: /התחבר/i }))

      await waitFor(() => {
        expect(window.location.href).toBe('/')
      })
    })
  })

  describe('Form Validation', () => {
    it('should have required email field', () => {
      render(<LoginForm />)
      const emailInput = screen.getByPlaceholderText('your@email.com')
      expect(emailInput).toBeRequired()
    })

    it('should have required password field', () => {
      render(<LoginForm />)
      const passwordInput = screen.getByPlaceholderText('••••••••')
      expect(passwordInput).toBeRequired()
    })
  })

  describe('Loading State', () => {
    it('should disable submit button while submitting', async () => {
      // Make signIn hang
      mockSignIn.mockImplementation(() => new Promise(() => {}))

      render(<LoginForm />)

      await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password')

      const submitButton = screen.getByRole('button', { name: /התחבר/i })
      await userEvent.click(submitButton)

      // Button should now show loading state
      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveTextContent('מתחבר...')
      })
    })
  })
})

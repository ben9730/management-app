/**
 * AIChat Component Tests (TDD)
 *
 * Tests for the AI Chat panel, focusing on:
 * - Dark mode visibility/contrast
 * - Proper text rendering
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AIChat } from './AIChat'
import type { RAGResponse, RAGService } from '@/services/rag'

// Mock RAG service
const createMockRAGService = (): RAGService => ({
  async query(query: string, _projectId: string): Promise<RAGResponse> {
    return {
      answer: `Mock response to: ${query}`,
      sources: [],
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        contextChunksUsed: 1,
      },
    }
  },
})

const defaultProps = {
  projectId: 'test-project-id',
  ragService: createMockRAGService(),
}

describe('AIChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Basic Rendering
  describe('rendering', () => {
    it('renders chat container', () => {
      render(<AIChat {...defaultProps} />)
      expect(screen.getByRole('log')).toBeInTheDocument()
    })

    it('renders input field', () => {
      render(<AIChat {...defaultProps} />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders send button', () => {
      render(<AIChat {...defaultProps} />)
      // Hebrew: "שלח" (send)
      expect(screen.getByRole('button', { name: /שלח/ })).toBeInTheDocument()
    })

    it('renders with RTL direction', () => {
      render(<AIChat {...defaultProps} />)
      const container = screen.getByRole('log').closest('[dir="rtl"]')
      expect(container).toBeInTheDocument()
    })

    it('shows empty state message when no messages', () => {
      render(<AIChat {...defaultProps} />)
      // Hebrew: "שאל שאלה על המסמכים שהועלו לפרויקט" (Ask a question about the uploaded documents)
      expect(screen.getByText(/מסמכים|שאל/)).toBeInTheDocument()
    })
  })

  // Dark Mode Visibility - Critical Tests
  describe('dark mode visibility', () => {
    it('container has dark mode compatible background', () => {
      const { container } = render(<AIChat {...defaultProps} />)
      const chatContainer = container.querySelector('[dir="rtl"]')

      // Should NOT have light-only backgrounds that cause visibility issues
      expect(chatContainer?.className).not.toMatch(/\bbg-white\b(?!\S*dark:)/)

      // Should have dark mode variant or use CSS variable
      const hasDarkModeSupport =
        chatContainer?.className.includes('dark:') ||
        chatContainer?.className.includes('bg-surface') ||
        chatContainer?.className.includes('bg-slate') ||
        chatContainer?.className.includes('bg-gray-9') ||
        chatContainer?.className.includes('bg-gray-8')

      expect(hasDarkModeSupport).toBe(true)
    })

    it('input field has dark mode compatible styling', () => {
      render(<AIChat {...defaultProps} />)
      const input = screen.getByRole('textbox')

      // Should have dark mode text color support
      const hasDarkTextSupport =
        input.className.includes('dark:') ||
        input.className.includes('text-foreground') ||
        !input.className.includes('text-gray-') // Light gray text is hard to read

      expect(hasDarkTextSupport).toBe(true)
    })

    it('input field has visible border in dark mode', () => {
      render(<AIChat {...defaultProps} />)
      const input = screen.getByRole('textbox')

      // Should have dark mode border support
      const hasDarkBorderSupport =
        input.className.includes('dark:border') ||
        input.className.includes('border-slate') ||
        input.className.includes('border-gray-7') ||
        input.className.includes('border-gray-6')

      expect(hasDarkBorderSupport).toBe(true)
    })
  })

  // Message Styling
  describe('message styling for dark mode', () => {
    it('user messages have proper dark mode styling', async () => {
      const user = userEvent.setup()
      render(<AIChat {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Test message')
      await user.click(screen.getByRole('button', { name: /שלח/ }))

      // Wait for user message to appear
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument()
      })

      const userMessage = screen.getByText('Test message').closest('[data-message-role="user"]')
      expect(userMessage).toBeInTheDocument()

      // User message container should not be pure white bg without dark variant
      const messageContent = userMessage?.querySelector('.rounded-md')
      if (messageContent) {
        const hasProperDarkStyling =
          messageContent.className.includes('dark:') ||
          !messageContent.className.includes('bg-gray-100') ||
          messageContent.className.includes('bg-slate')

        expect(hasProperDarkStyling).toBe(true)
      }
    })

    it('assistant messages have proper dark mode styling', async () => {
      const user = userEvent.setup()
      render(<AIChat {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Test question')
      await user.click(screen.getByRole('button', { name: /שלח/ }))

      // Wait for assistant message to appear
      await waitFor(() => {
        expect(screen.getByText(/Mock response to:/)).toBeInTheDocument()
      })

      const assistantMessage = screen.getByText(/Mock response to:/).closest('[data-message-role="assistant"]')
      expect(assistantMessage).toBeInTheDocument()

      // Assistant message should have dark mode support
      const messageContent = assistantMessage?.querySelector('.rounded-md')
      if (messageContent) {
        // Should NOT have bg-white without dark variant
        const classNames = messageContent.className
        const hasBgWhiteWithoutDark = /\bbg-white\b/.test(classNames) && !classNames.includes('dark:bg-')

        expect(hasBgWhiteWithoutDark).toBe(false)
      }
    })
  })

  // Functionality Tests
  describe('chat functionality', () => {
    it('sends message on button click', async () => {
      const mockService = createMockRAGService()
      const querySpy = vi.spyOn(mockService, 'query')
      const user = userEvent.setup()

      render(<AIChat {...defaultProps} ragService={mockService} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Hello AI')
      await user.click(screen.getByRole('button', { name: /שלח/ }))

      await waitFor(() => {
        expect(querySpy).toHaveBeenCalledWith('Hello AI', 'test-project-id')
      })
    })

    it('sends message on Enter key', async () => {
      const mockService = createMockRAGService()
      const querySpy = vi.spyOn(mockService, 'query')
      const user = userEvent.setup()

      render(<AIChat {...defaultProps} ragService={mockService} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Test query{enter}')

      await waitFor(() => {
        expect(querySpy).toHaveBeenCalledWith('Test query', 'test-project-id')
      })
    })

    it('clears input after sending', async () => {
      const user = userEvent.setup()
      render(<AIChat {...defaultProps} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Test message')
      await user.click(screen.getByRole('button', { name: /שלח/ }))

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })

    it('disables input while loading', async () => {
      // Create a slow service to test loading state
      const slowService: RAGService = {
        async query() {
          await new Promise(resolve => setTimeout(resolve, 100))
          return { answer: 'Response', sources: [] }
        },
      }

      const user = userEvent.setup()
      render(<AIChat {...defaultProps} ragService={slowService} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/ }))

      // Input should be disabled during loading
      expect(input).toBeDisabled()

      // Wait for response
      await waitFor(() => {
        expect(input).not.toBeDisabled()
      }, { timeout: 500 })
    })

    it('shows loading indicator while waiting for response', async () => {
      const slowService: RAGService = {
        async query() {
          await new Promise(resolve => setTimeout(resolve, 100))
          return { answer: 'Response', sources: [] }
        },
      }

      const user = userEvent.setup()
      render(<AIChat {...defaultProps} ragService={slowService} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/ }))

      // Loading indicator should appear
      expect(screen.getByRole('status')).toBeInTheDocument()

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
      }, { timeout: 500 })
    })
  })

  // Disabled State
  describe('disabled state', () => {
    it('shows disabled message when disabled', () => {
      render(
        <AIChat
          {...defaultProps}
          disabled
          disabledMessage="AI is not available"
        />
      )

      expect(screen.getByText('AI is not available')).toBeInTheDocument()
    })

    it('disables input when disabled prop is true', () => {
      render(<AIChat {...defaultProps} disabled />)

      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('disables send button when disabled', () => {
      render(<AIChat {...defaultProps} disabled />)

      expect(screen.getByRole('button', { name: /שלח/ })).toBeDisabled()
    })
  })

  // Error Handling
  describe('error handling', () => {
    it('shows error message when service fails', async () => {
      const errorService: RAGService = {
        async query() {
          throw new Error('Network error')
        },
      }

      const user = userEvent.setup()
      render(<AIChat {...defaultProps} ragService={errorService} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/ }))

      await waitFor(() => {
        // Error message should appear
        const errorMessage = screen.getByText(/שגיאה/)
        expect(errorMessage).toBeInTheDocument()
      })
    })

    it('error messages have error styling', async () => {
      const errorService: RAGService = {
        async query() {
          throw new Error('Network error')
        },
      }

      const user = userEvent.setup()
      render(<AIChat {...defaultProps} ragService={errorService} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/ }))

      await waitFor(() => {
        const errorElement = screen.getByText(/שגיאה/).closest('[data-error="true"]')
        expect(errorElement).toBeInTheDocument()
      })
    })
  })

  // Clear History
  describe('clear history', () => {
    it('shows clear button when messages exist', async () => {
      const user = userEvent.setup()
      render(<AIChat {...defaultProps} />)

      // Initially no clear button
      expect(screen.queryByRole('button', { name: /נקה|היסטוריה/ })).not.toBeInTheDocument()

      // Send a message
      const input = screen.getByRole('textbox')
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/ }))

      // Wait for message and clear button
      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      // Clear button should now be visible
      expect(screen.getByRole('button', { name: /נקה|היסטוריה/ })).toBeInTheDocument()
    })

    it('clears messages when clear button clicked', async () => {
      const user = userEvent.setup()
      render(<AIChat {...defaultProps} />)

      // Send a message
      const input = screen.getByRole('textbox')
      await user.type(input, 'Test message')
      await user.click(screen.getByRole('button', { name: /שלח/ }))

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument()
      })

      // Click clear
      await user.click(screen.getByRole('button', { name: /נקה|היסטוריה/ }))

      // Messages should be gone
      expect(screen.queryByText('Test message')).not.toBeInTheDocument()
    })
  })

  // Accessibility
  describe('accessibility', () => {
    it('input has accessible label', () => {
      render(<AIChat {...defaultProps} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAccessibleName()
    })

    it('send button has accessible label', () => {
      render(<AIChat {...defaultProps} />)
      const button = screen.getByRole('button', { name: /שלח/ })
      expect(button).toHaveAccessibleName()
    })

    it('chat log has aria-live for screen readers', () => {
      render(<AIChat {...defaultProps} />)
      const log = screen.getByRole('log')
      expect(log).toHaveAttribute('aria-live', 'polite')
    })

    it('loading indicator has aria-busy', async () => {
      const slowService: RAGService = {
        async query() {
          await new Promise(resolve => setTimeout(resolve, 100))
          return { answer: 'Response', sources: [] }
        },
      }

      const user = userEvent.setup()
      render(<AIChat {...defaultProps} ragService={slowService} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/ }))

      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-busy', 'true')

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
      }, { timeout: 500 })
    })
  })

  // Props
  describe('props', () => {
    it('uses custom title when provided', () => {
      render(<AIChat {...defaultProps} title="Custom Chat Title" />)
      expect(screen.getByText('Custom Chat Title')).toBeInTheDocument()
    })

    it('uses custom placeholder when provided', () => {
      render(<AIChat {...defaultProps} placeholder="Type here..." />)
      expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument()
    })

    it('calls onMessageSent callback', async () => {
      const onMessageSent = vi.fn()
      const user = userEvent.setup()

      render(<AIChat {...defaultProps} onMessageSent={onMessageSent} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Test callback')
      await user.click(screen.getByRole('button', { name: /שלח/ }))

      expect(onMessageSent).toHaveBeenCalledWith('Test callback')
    })

    it('calls onResponseReceived callback', async () => {
      const onResponseReceived = vi.fn()
      const user = userEvent.setup()

      render(<AIChat {...defaultProps} onResponseReceived={onResponseReceived} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/ }))

      await waitFor(() => {
        expect(onResponseReceived).toHaveBeenCalled()
      })
    })
  })
})

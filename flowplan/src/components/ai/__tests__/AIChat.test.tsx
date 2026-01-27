import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AIChat } from '../AIChat'
import type { RAGResponse, SourceCitation } from '@/services/rag'

// Mock RAG service
const mockRagService = {
  query: vi.fn(),
}

// Helper to create mock response
const createMockResponse = (overrides?: Partial<RAGResponse>): RAGResponse => ({
  answer: 'This is a test answer based on the documents.',
  sources: [
    {
      documentId: 'doc-1',
      documentName: 'ISO_Requirements.pdf',
      excerpt: 'Section 4.2.1 describes safety requirements...',
      chunkIndex: 0,
      relevanceScore: 0.95,
    },
  ],
  usage: {
    inputTokens: 100,
    outputTokens: 50,
    contextChunksUsed: 3,
  },
  ...overrides,
})

describe('AIChat Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders chat container with input', () => {
      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      expect(screen.getByRole('textbox', { name: /שאלה/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /שלח/i })).toBeInTheDocument()
    })

    it('renders empty state message when no messages', () => {
      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      expect(screen.getByText(/שאל שאלה על המסמכים/i)).toBeInTheDocument()
    })

    it('renders with custom placeholder', () => {
      render(
        <AIChat
          projectId="project-123"
          ragService={mockRagService}
          placeholder="Ask about audit requirements..."
        />
      )

      expect(screen.getByPlaceholderText(/Ask about audit requirements/i)).toBeInTheDocument()
    })

    it('renders title when provided', () => {
      render(
        <AIChat
          projectId="project-123"
          ragService={mockRagService}
          title="AI Assistant"
        />
      )

      expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <AIChat
          projectId="project-123"
          ragService={mockRagService}
          className="custom-class"
        />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('User Input', () => {
    it('allows typing in the input field', async () => {
      const user = userEvent.setup()
      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'What are the safety requirements?')

      expect(input).toHaveValue('What are the safety requirements?')
    })

    it('clears input after sending message', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test question')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      expect(input).toHaveValue('')
    })

    it('disables send button when input is empty', () => {
      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const sendButton = screen.getByRole('button', { name: /שלח/i })
      expect(sendButton).toBeDisabled()
    })

    it('enables send button when input has text', async () => {
      const user = userEvent.setup()
      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')

      const sendButton = screen.getByRole('button', { name: /שלח/i })
      expect(sendButton).not.toBeDisabled()
    })

    it('sends message on Enter key', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test question{Enter}')

      expect(mockRagService.query).toHaveBeenCalledWith('Test question', 'project-123')
    })

    it('does not send on Shift+Enter', async () => {
      const user = userEvent.setup()
      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test question')
      await user.keyboard('{Shift>}{Enter}{/Shift}')

      expect(mockRagService.query).not.toHaveBeenCalled()
    })
  })

  describe('Message Display', () => {
    it('displays user message after sending', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'What are the requirements?')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      expect(screen.getByText('What are the requirements?')).toBeInTheDocument()
    })

    it('displays AI response after query', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test question')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/This is a test answer/)).toBeInTheDocument()
      })
    })

    it('shows user and assistant message roles', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/אתה/i)).toBeInTheDocument() // You (user)
        expect(screen.getByText(/AI/i)).toBeInTheDocument() // AI
      })
    })

    it('maintains message history', async () => {
      const user = userEvent.setup()
      mockRagService.query
        .mockResolvedValueOnce(createMockResponse({ answer: 'First answer' }))
        .mockResolvedValueOnce(createMockResponse({ answer: 'Second answer' }))

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })

      await user.type(input, 'First question')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText('First answer')).toBeInTheDocument()
      })

      await user.type(input, 'Second question')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText('First question')).toBeInTheDocument()
        expect(screen.getByText('First answer')).toBeInTheDocument()
        expect(screen.getByText('Second question')).toBeInTheDocument()
        expect(screen.getByText('Second answer')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading indicator while waiting for response', async () => {
      const user = userEvent.setup()
      let resolveQuery: (value: RAGResponse) => void
      mockRagService.query.mockImplementation(() => new Promise(resolve => {
        resolveQuery = resolve
      }))

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test question')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      expect(screen.getByText(/ממתין לתשובה/i)).toBeInTheDocument()

      resolveQuery!(createMockResponse())

      await waitFor(() => {
        expect(screen.queryByText(/ממתין לתשובה/i)).not.toBeInTheDocument()
      })
    })

    it('disables input while loading', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockImplementation(() => new Promise(() => {}))

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test question')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      expect(input).toBeDisabled()
    })

    it('disables send button while loading', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockImplementation(() => new Promise(() => {}))

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test question')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      expect(screen.getByRole('button', { name: /שולח/i })).toBeDisabled()
    })
  })

  describe('Source Citations', () => {
    it('displays source citations with assistant response', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/ISO_Requirements.pdf/)).toBeInTheDocument()
      })
    })

    it('shows source excerpt on hover/click', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/ISO_Requirements.pdf/)).toBeInTheDocument()
      })

      await user.click(screen.getByText(/ISO_Requirements.pdf/))

      expect(screen.getByText(/Section 4.2.1 describes/)).toBeInTheDocument()
    })

    it('displays relevance score for sources', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/95%/)).toBeInTheDocument()
      })
    })

    it('handles multiple sources', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse({
        sources: [
          {
            documentId: 'doc-1',
            documentName: 'ISO_Requirements.pdf',
            excerpt: 'First excerpt...',
            chunkIndex: 0,
            relevanceScore: 0.95,
          },
          {
            documentId: 'doc-2',
            documentName: 'Safety_Guidelines.docx',
            excerpt: 'Second excerpt...',
            chunkIndex: 2,
            relevanceScore: 0.88,
          },
        ],
      }))

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/ISO_Requirements.pdf/)).toBeInTheDocument()
        expect(screen.getByText(/Safety_Guidelines.docx/)).toBeInTheDocument()
      })
    })

    it('shows sources section header', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/מקורות/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when query fails', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse({
        answer: '',
        error: 'Failed to connect to AI service',
        sources: [],
      }))

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/Failed to connect/)).toBeInTheDocument()
      })
    })

    it('shows error styling for error messages', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse({
        answer: '',
        error: 'Error occurred',
        sources: [],
      }))

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        const errorMessage = screen.getByText(/Error occurred/)
        expect(errorMessage.closest('[data-error="true"]')).toBeInTheDocument()
      })
    })

    it('handles network errors gracefully', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockRejectedValue(new Error('Network error'))

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/שגיאה בחיבור/i)).toBeInTheDocument()
      })
    })

    it('allows retry after error', async () => {
      const user = userEvent.setup()
      mockRagService.query
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/שגיאה בחיבור/i)).toBeInTheDocument()
      })

      // Re-enable input after error
      expect(input).not.toBeDisabled()

      await user.type(input, 'Retry question')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/This is a test answer/)).toBeInTheDocument()
      })
    })

    it('shows no documents message when sources empty', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse({
        answer: 'לא נמצא מידע רלוונטי במסמכי הפרויקט.',
        sources: [],
      }))

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/לא נמצא מידע רלוונטי/)).toBeInTheDocument()
      })
    })
  })

  describe('Token Usage Display', () => {
    it('shows token usage when enabled', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(
        <AIChat
          projectId="project-123"
          ragService={mockRagService}
          showUsage={true}
        />
      )

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/150 tokens/i)).toBeInTheDocument() // 100 + 50
      })
    })

    it('hides token usage by default', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/This is a test answer/)).toBeInTheDocument()
      })

      expect(screen.queryByText(/tokens/i)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible chat region', () => {
      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      expect(screen.getByRole('log')).toBeInTheDocument()
    })

    it('has labeled input field', () => {
      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      expect(input).toBeInTheDocument()
    })

    it('announces new messages to screen readers', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        const messageContainer = screen.getByRole('log')
        expect(messageContainer).toHaveAttribute('aria-live', 'polite')
      })
    })

    it('has keyboard navigation support', async () => {
      const user = userEvent.setup()
      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })

      // Tab to input
      await user.tab()
      expect(input).toHaveFocus()

      // Type something to enable the button
      await user.type(input, 'Test')

      // Tab to button (now enabled)
      await user.tab()
      expect(screen.getByRole('button', { name: /שלח/i })).toHaveFocus()
    })

    it('provides loading state to screen readers', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockImplementation(() => new Promise(() => {}))

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('Clear History', () => {
    it('shows clear button when there are messages', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /נקה היסטוריה/i })).toBeInTheDocument()
      })
    })

    it('clears all messages when clear button clicked', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(screen.getByText(/This is a test answer/)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /נקה היסטוריה/i }))

      expect(screen.queryByText(/This is a test answer/)).not.toBeInTheDocument()
      expect(screen.queryByText('Test')).not.toBeInTheDocument()
      expect(screen.getByText(/שאל שאלה על המסמכים/i)).toBeInTheDocument()
    })

    it('hides clear button when no messages', () => {
      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      expect(screen.queryByRole('button', { name: /נקה היסטוריה/i })).not.toBeInTheDocument()
    })
  })

  describe('Auto-scroll', () => {
    it('scrolls to bottom when new message added', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      const { container } = render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        const chatLog = container.querySelector('[data-chat-log]')
        expect(chatLog?.scrollTop).toBeDefined()
      })
    })
  })

  describe('External Message Handling', () => {
    it('calls onMessageSent callback when message sent', async () => {
      const user = userEvent.setup()
      const onMessageSent = vi.fn()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(
        <AIChat
          projectId="project-123"
          ragService={mockRagService}
          onMessageSent={onMessageSent}
        />
      )

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test question')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      expect(onMessageSent).toHaveBeenCalledWith('Test question')
    })

    it('calls onResponseReceived callback when response arrives', async () => {
      const user = userEvent.setup()
      const onResponseReceived = vi.fn()
      const mockResponse = createMockResponse()
      mockRagService.query.mockResolvedValue(mockResponse)

      render(
        <AIChat
          projectId="project-123"
          ragService={mockRagService}
          onResponseReceived={onResponseReceived}
        />
      )

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        expect(onResponseReceived).toHaveBeenCalledWith(mockResponse)
      })
    })
  })

  describe('Disabled State', () => {
    it('disables entire chat when disabled prop is true', () => {
      render(
        <AIChat
          projectId="project-123"
          ragService={mockRagService}
          disabled={true}
        />
      )

      expect(screen.getByRole('textbox', { name: /שאלה/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /שלח/i })).toBeDisabled()
    })

    it('shows disabled message when provided', () => {
      render(
        <AIChat
          projectId="project-123"
          ragService={mockRagService}
          disabled={true}
          disabledMessage="Please upload documents first"
        />
      )

      expect(screen.getByText(/Please upload documents first/)).toBeInTheDocument()
    })
  })

  describe('RTL Support', () => {
    it('renders with RTL direction', () => {
      const { container } = render(<AIChat projectId="project-123" ragService={mockRagService} />)

      expect(container.firstChild).toHaveAttribute('dir', 'rtl')
    })

    it('aligns user messages to left (for RTL)', async () => {
      const user = userEvent.setup()
      mockRagService.query.mockResolvedValue(createMockResponse())

      render(<AIChat projectId="project-123" ragService={mockRagService} />)

      const input = screen.getByRole('textbox', { name: /שאלה/i })
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /שלח/i }))

      await waitFor(() => {
        const userMessage = screen.getByText('Test').closest('[data-message-role="user"]')
        expect(userMessage).toHaveClass('self-start')
      })
    })
  })
})

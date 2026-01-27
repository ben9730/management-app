import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SourceCitationsPanel } from '../SourceCitationsPanel'
import type { SourceCitation } from '@/services/rag'

// Sample citations for testing
const createMockCitation = (overrides?: Partial<SourceCitation>): SourceCitation => ({
  documentId: 'doc-123',
  documentName: 'Test_Document.pdf',
  excerpt: 'This is a sample excerpt from the document that contains relevant information.',
  chunkIndex: 0,
  relevanceScore: 0.85,
  ...overrides,
})

describe('SourceCitationsPanel Component', () => {
  describe('Basic Rendering', () => {
    it('renders panel with title', () => {
      render(<SourceCitationsPanel citations={[createMockCitation()]} />)

      expect(screen.getByText(/מקורות/i)).toBeInTheDocument()
    })

    it('renders custom title when provided', () => {
      render(
        <SourceCitationsPanel
          citations={[createMockCitation()]}
          title="Sources"
        />
      )

      expect(screen.getByText('Sources')).toBeInTheDocument()
    })

    it('renders all citations', () => {
      const citations = [
        createMockCitation({ documentName: 'Doc1.pdf' }),
        createMockCitation({ documentName: 'Doc2.pdf' }),
        createMockCitation({ documentName: 'Doc3.pdf' }),
      ]

      render(<SourceCitationsPanel citations={citations} />)

      expect(screen.getByText('Doc1.pdf')).toBeInTheDocument()
      expect(screen.getByText('Doc2.pdf')).toBeInTheDocument()
      expect(screen.getByText('Doc3.pdf')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <SourceCitationsPanel
          citations={[createMockCitation()]}
          className="custom-class"
        />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('shows empty state when no citations', () => {
      render(<SourceCitationsPanel citations={[]} />)

      expect(screen.getByText(/אין מקורות להצגה/i)).toBeInTheDocument()
    })

    it('shows custom empty message', () => {
      render(
        <SourceCitationsPanel
          citations={[]}
          emptyMessage="No sources found"
        />
      )

      expect(screen.getByText('No sources found')).toBeInTheDocument()
    })
  })

  describe('Citation Display', () => {
    it('displays document name', () => {
      render(
        <SourceCitationsPanel
          citations={[createMockCitation({ documentName: 'ISO_9001.pdf' })]}
        />
      )

      expect(screen.getByText('ISO_9001.pdf')).toBeInTheDocument()
    })

    it('displays relevance score as percentage', () => {
      render(
        <SourceCitationsPanel
          citations={[createMockCitation({ relevanceScore: 0.92 })]}
        />
      )

      expect(screen.getByText('92%')).toBeInTheDocument()
    })

    it('displays chunk index', () => {
      render(
        <SourceCitationsPanel
          citations={[createMockCitation({ chunkIndex: 5 })]}
        />
      )

      expect(screen.getByText(/Chunk #5/i)).toBeInTheDocument()
    })

    it('formats relevance score with color coding', () => {
      const { rerender } = render(
        <SourceCitationsPanel
          citations={[createMockCitation({ relevanceScore: 0.95 })]}
        />
      )

      // High relevance should have green indicator
      expect(screen.getByText('95%').closest('[data-relevance]')).toHaveAttribute('data-relevance', 'high')

      rerender(
        <SourceCitationsPanel
          citations={[createMockCitation({ relevanceScore: 0.75 })]}
        />
      )

      // Medium relevance
      expect(screen.getByText('75%').closest('[data-relevance]')).toHaveAttribute('data-relevance', 'medium')

      rerender(
        <SourceCitationsPanel
          citations={[createMockCitation({ relevanceScore: 0.55 })]}
        />
      )

      // Low relevance
      expect(screen.getByText('55%').closest('[data-relevance]')).toHaveAttribute('data-relevance', 'low')
    })
  })

  describe('Expand/Collapse', () => {
    it('shows excerpt when citation is expanded', async () => {
      const user = userEvent.setup()
      const excerpt = 'This is the detailed excerpt text from the document.'

      render(
        <SourceCitationsPanel
          citations={[createMockCitation({ excerpt })]}
        />
      )

      // Click to expand
      await user.click(screen.getByText('Test_Document.pdf'))

      expect(screen.getByText(new RegExp(excerpt))).toBeInTheDocument()
    })

    it('hides excerpt when citation is collapsed', async () => {
      const user = userEvent.setup()
      const excerpt = 'This is the detailed excerpt text from the document.'

      render(
        <SourceCitationsPanel
          citations={[createMockCitation({ excerpt })]}
        />
      )

      // Expand
      await user.click(screen.getByText('Test_Document.pdf'))
      expect(screen.getByText(new RegExp(excerpt))).toBeInTheDocument()

      // Collapse
      await user.click(screen.getByText('Test_Document.pdf'))
      expect(screen.queryByText(new RegExp(excerpt))).not.toBeInTheDocument()
    })

    it('allows multiple citations to be expanded', async () => {
      const user = userEvent.setup()

      render(
        <SourceCitationsPanel
          citations={[
            createMockCitation({ documentName: 'Doc1.pdf', excerpt: 'Excerpt 1' }),
            createMockCitation({ documentName: 'Doc2.pdf', excerpt: 'Excerpt 2' }),
          ]}
        />
      )

      await user.click(screen.getByText('Doc1.pdf'))
      await user.click(screen.getByText('Doc2.pdf'))

      expect(screen.getByText(/Excerpt 1/)).toBeInTheDocument()
      expect(screen.getByText(/Excerpt 2/)).toBeInTheDocument()
    })

    it('shows expand icon when collapsed', () => {
      render(<SourceCitationsPanel citations={[createMockCitation()]} />)

      const expandIcon = screen.getByTestId('expand-icon')
      expect(expandIcon).not.toHaveClass('rotate-180')
    })

    it('rotates icon when expanded', async () => {
      const user = userEvent.setup()
      render(<SourceCitationsPanel citations={[createMockCitation()]} />)

      await user.click(screen.getByText('Test_Document.pdf'))

      const expandIcon = screen.getByTestId('expand-icon')
      expect(expandIcon).toHaveClass('rotate-180')
    })
  })

  describe('Sorting', () => {
    it('sorts by relevance score descending by default', () => {
      const citations = [
        createMockCitation({ documentName: 'Low.pdf', relevanceScore: 0.6 }),
        createMockCitation({ documentName: 'High.pdf', relevanceScore: 0.95 }),
        createMockCitation({ documentName: 'Medium.pdf', relevanceScore: 0.8 }),
      ]

      render(<SourceCitationsPanel citations={citations} />)

      const items = screen.getAllByRole('button')
      expect(within(items[0]).getByText('High.pdf')).toBeInTheDocument()
      expect(within(items[1]).getByText('Medium.pdf')).toBeInTheDocument()
      expect(within(items[2]).getByText('Low.pdf')).toBeInTheDocument()
    })

    it('respects sortBy prop for document name sorting', () => {
      const citations = [
        createMockCitation({ documentName: 'Zebra.pdf', relevanceScore: 0.95 }),
        createMockCitation({ documentName: 'Apple.pdf', relevanceScore: 0.6 }),
        createMockCitation({ documentName: 'Mango.pdf', relevanceScore: 0.8 }),
      ]

      render(<SourceCitationsPanel citations={citations} sortBy="name" />)

      const items = screen.getAllByRole('button')
      expect(within(items[0]).getByText('Apple.pdf')).toBeInTheDocument()
      expect(within(items[1]).getByText('Mango.pdf')).toBeInTheDocument()
      expect(within(items[2]).getByText('Zebra.pdf')).toBeInTheDocument()
    })
  })

  describe('Document Link', () => {
    it('calls onDocumentClick when document clicked', async () => {
      const user = userEvent.setup()
      const onDocumentClick = vi.fn()

      render(
        <SourceCitationsPanel
          citations={[createMockCitation({ documentId: 'doc-456' })]}
          onDocumentClick={onDocumentClick}
        />
      )

      await user.click(screen.getByRole('link', { name: /צפה במסמך/i }))

      expect(onDocumentClick).toHaveBeenCalledWith('doc-456')
    })

    it('hides document link when onDocumentClick not provided', () => {
      render(<SourceCitationsPanel citations={[createMockCitation()]} />)

      expect(screen.queryByRole('link', { name: /צפה במסמך/i })).not.toBeInTheDocument()
    })
  })

  describe('Compact Mode', () => {
    it('shows compact view in compact mode', () => {
      render(
        <SourceCitationsPanel
          citations={[createMockCitation()]}
          compact
        />
      )

      expect(screen.getByTestId('compact-panel')).toBeInTheDocument()
    })

    it('shows citation count in compact mode', () => {
      render(
        <SourceCitationsPanel
          citations={[
            createMockCitation({ documentName: 'Doc1.pdf' }),
            createMockCitation({ documentName: 'Doc2.pdf' }),
            createMockCitation({ documentName: 'Doc3.pdf' }),
          ]}
          compact
        />
      )

      expect(screen.getByText(/3 מקורות/)).toBeInTheDocument()
    })

    it('expands to full view when clicked in compact mode', async () => {
      const user = userEvent.setup()

      render(
        <SourceCitationsPanel
          citations={[createMockCitation({ documentName: 'Doc1.pdf' })]}
          compact
        />
      )

      await user.click(screen.getByText(/1 מקורות/))

      expect(screen.getByText('Doc1.pdf')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible panel region', () => {
      render(<SourceCitationsPanel citations={[createMockCitation()]} />)

      expect(screen.getByRole('region', { name: /מקורות/i })).toBeInTheDocument()
    })

    it('citation buttons have aria-expanded', async () => {
      const user = userEvent.setup()
      render(<SourceCitationsPanel citations={[createMockCitation()]} />)

      const button = screen.getByRole('button', { name: /Test_Document.pdf/i })
      expect(button).toHaveAttribute('aria-expanded', 'false')

      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('has keyboard navigation', async () => {
      const user = userEvent.setup()
      render(
        <SourceCitationsPanel
          citations={[
            createMockCitation({ documentName: 'Doc1.pdf' }),
            createMockCitation({ documentName: 'Doc2.pdf' }),
          ]}
        />
      )

      await user.tab()
      expect(screen.getByRole('button', { name: /Doc1.pdf/i })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /Doc2.pdf/i })).toHaveFocus()
    })

    it('expands on Enter key', async () => {
      const user = userEvent.setup()
      render(<SourceCitationsPanel citations={[createMockCitation({ excerpt: 'Test excerpt' })]} />)

      await user.tab()
      await user.keyboard('{Enter}')

      expect(screen.getByText(/Test excerpt/)).toBeInTheDocument()
    })

    it('expands on Space key', async () => {
      const user = userEvent.setup()
      render(<SourceCitationsPanel citations={[createMockCitation({ excerpt: 'Test excerpt' })]} />)

      await user.tab()
      await user.keyboard(' ')

      expect(screen.getByText(/Test excerpt/)).toBeInTheDocument()
    })
  })

  describe('Statistics Display', () => {
    it('shows statistics when showStats is true', () => {
      const citations = [
        createMockCitation({ relevanceScore: 0.9 }),
        createMockCitation({ relevanceScore: 0.8 }),
        createMockCitation({ relevanceScore: 0.7 }),
      ]

      render(<SourceCitationsPanel citations={citations} showStats />)

      expect(screen.getByText(/ממוצע רלוונטיות/i)).toBeInTheDocument()
      expect(screen.getByText('80%')).toBeInTheDocument() // Average of 90%, 80%, 70%
    })

    it('hides statistics by default', () => {
      render(<SourceCitationsPanel citations={[createMockCitation()]} />)

      expect(screen.queryByText(/ממוצע רלוונטיות/i)).not.toBeInTheDocument()
    })

    it('shows document count in stats', () => {
      const citations = [
        createMockCitation({ documentName: 'Doc1.pdf' }),
        createMockCitation({ documentName: 'Doc2.pdf' }),
        createMockCitation({ documentName: 'Doc1.pdf', chunkIndex: 1 }), // Same doc, different chunk
      ]

      render(<SourceCitationsPanel citations={citations} showStats />)

      expect(screen.getByText(/2 מסמכים/i)).toBeInTheDocument() // 2 unique documents
    })
  })
})

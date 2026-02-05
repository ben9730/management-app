/**
 * FindingsList Component Tests (TDD)
 *
 * Displays a list of audit findings with filters, loading, empty, and error states.
 * Hebrew RTL support.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FindingsList } from './FindingsList'
import type { AuditFinding } from '@/types/entities'

// Mock findings data
const mockFindings: AuditFinding[] = [
  {
    id: 'finding-1',
    task_id: 'task-1',
    severity: 'critical',
    finding: 'Critical security vulnerability found',
    root_cause: 'Outdated dependencies',
    capa: 'Update all dependencies to latest versions',
    due_date: new Date('2024-03-15'),
    status: 'open',
    created_at: new Date('2024-01-15'),
  },
  {
    id: 'finding-2',
    task_id: 'task-2',
    severity: 'high',
    finding: 'Data validation missing in API endpoint',
    root_cause: 'Rushed implementation',
    capa: null,
    due_date: new Date('2024-03-20'),
    status: 'in_progress',
    created_at: new Date('2024-01-20'),
  },
  {
    id: 'finding-3',
    task_id: 'task-3',
    severity: 'medium',
    finding: 'Documentation not updated',
    root_cause: null,
    capa: 'Update documentation',
    due_date: null,
    status: 'closed',
    created_at: new Date('2024-02-01'),
  },
  {
    id: 'finding-4',
    task_id: 'task-4',
    severity: 'low',
    finding: 'Minor UI inconsistency',
    root_cause: 'Design system mismatch',
    capa: 'Align with design system',
    due_date: new Date('2024-04-01'),
    status: 'open',
    created_at: new Date('2024-02-10'),
  },
]

const mockOnEdit = vi.fn()
const mockOnDelete = vi.fn()
const mockOnAdd = vi.fn()
const mockOnRetry = vi.fn()
const mockOnSeverityFilterChange = vi.fn()
const mockOnStatusFilterChange = vi.fn()

const defaultProps = {
  findings: mockFindings,
  onEdit: mockOnEdit,
  onDelete: mockOnDelete,
  onAdd: mockOnAdd,
}

describe('FindingsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Basic Rendering
  describe('rendering', () => {
    it('renders all findings', () => {
      render(<FindingsList {...defaultProps} />)

      expect(screen.getByText(/Critical security vulnerability/i)).toBeInTheDocument()
      expect(screen.getByText(/Data validation missing/i)).toBeInTheDocument()
      expect(screen.getByText(/Documentation not updated/i)).toBeInTheDocument()
      expect(screen.getByText(/Minor UI inconsistency/i)).toBeInTheDocument()
    })

    it('renders correct number of finding cards', () => {
      render(<FindingsList {...defaultProps} />)
      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(4)
    })

    it('renders add finding button with Hebrew text', () => {
      render(<FindingsList {...defaultProps} />)
      expect(screen.getByRole('button', { name: /הוסף ממצא/i })).toBeInTheDocument()
    })

    it('renders findings list container', () => {
      render(<FindingsList {...defaultProps} />)
      expect(screen.getByTestId('findings-list')).toBeInTheDocument()
    })
  })

  // Header
  describe('header', () => {
    it('shows Hebrew title', () => {
      render(<FindingsList {...defaultProps} />)
      expect(screen.getByRole('heading', { name: /ממצאי ביקורת/i })).toBeInTheDocument()
    })

    it('shows finding count', () => {
      render(<FindingsList {...defaultProps} />)
      // Use more specific selector to avoid matching dates
      expect(screen.getByText(/\(4 ממצאים\)/)).toBeInTheDocument()
    })

    it('shows singular text for 1 finding', () => {
      render(<FindingsList {...defaultProps} findings={[mockFindings[0]]} />)
      expect(screen.getByText(/1.*ממצא/i)).toBeInTheDocument()
    })

    it('shows plural text for multiple findings', () => {
      render(<FindingsList {...defaultProps} />)
      expect(screen.getByText(/4.*ממצאים/i)).toBeInTheDocument()
    })
  })

  // Severity Filter
  describe('severity filter', () => {
    it('renders severity filter buttons', () => {
      render(<FindingsList {...defaultProps} />)

      // Use within to scope to severity filter section
      const severitySection = screen.getByTestId('severity-filter')
      expect(within(severitySection).getByRole('button', { name: /הכל/i })).toBeInTheDocument()
      expect(within(severitySection).getByRole('button', { name: /קריטי/i })).toBeInTheDocument()
      expect(within(severitySection).getByRole('button', { name: /גבוה/i })).toBeInTheDocument()
      expect(within(severitySection).getByRole('button', { name: /בינוני/i })).toBeInTheDocument()
      expect(within(severitySection).getByRole('button', { name: /נמוך/i })).toBeInTheDocument()
    })

    it('calls onSeverityFilterChange when critical filter clicked', async () => {
      const user = userEvent.setup()
      render(
        <FindingsList
          {...defaultProps}
          onSeverityFilterChange={mockOnSeverityFilterChange}
        />
      )

      await user.click(screen.getByRole('button', { name: /קריטי/i }))
      expect(mockOnSeverityFilterChange).toHaveBeenCalledWith('critical')
    })

    it('calls onSeverityFilterChange with null when "All" clicked', async () => {
      const user = userEvent.setup()
      render(
        <FindingsList
          {...defaultProps}
          severityFilter="critical"
          onSeverityFilterChange={mockOnSeverityFilterChange}
        />
      )

      // Get the severity filter section and find "All" button within it
      const severitySection = screen.getByTestId('severity-filter')
      const allButton = within(severitySection).getByRole('button', { name: /הכל/i })
      await user.click(allButton)
      expect(mockOnSeverityFilterChange).toHaveBeenCalledWith(null)
    })

    it('shows active state for selected severity filter', () => {
      render(<FindingsList {...defaultProps} severityFilter="high" />)

      const highButton = screen.getByRole('button', { name: /גבוה/i })
      expect(highButton).toHaveAttribute('data-active', 'true')
    })

    it('filters findings by severity when filter is applied', () => {
      render(<FindingsList {...defaultProps} severityFilter="critical" />)

      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(1)
      expect(screen.getByText(/Critical security vulnerability/i)).toBeInTheDocument()
    })
  })

  // Status Filter
  describe('status filter', () => {
    it('renders status filter buttons', () => {
      render(<FindingsList {...defaultProps} />)

      // Get the status filter section
      const statusSection = screen.getByTestId('status-filter')
      expect(within(statusSection).getByRole('button', { name: /הכל/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /פתוח/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /בתהליך/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /סגור/i })).toBeInTheDocument()
    })

    it('calls onStatusFilterChange when open filter clicked', async () => {
      const user = userEvent.setup()
      render(
        <FindingsList
          {...defaultProps}
          onStatusFilterChange={mockOnStatusFilterChange}
        />
      )

      await user.click(screen.getByRole('button', { name: /פתוח/i }))
      expect(mockOnStatusFilterChange).toHaveBeenCalledWith('open')
    })

    it('calls onStatusFilterChange with null when "All" clicked', async () => {
      const user = userEvent.setup()
      render(
        <FindingsList
          {...defaultProps}
          statusFilter="open"
          onStatusFilterChange={mockOnStatusFilterChange}
        />
      )

      const statusSection = screen.getByTestId('status-filter')
      const allButton = within(statusSection).getByRole('button', { name: /הכל/i })
      await user.click(allButton)
      expect(mockOnStatusFilterChange).toHaveBeenCalledWith(null)
    })

    it('shows active state for selected status filter', () => {
      render(<FindingsList {...defaultProps} statusFilter="in_progress" />)

      const inProgressButton = screen.getByRole('button', { name: /בתהליך/i })
      expect(inProgressButton).toHaveAttribute('data-active', 'true')
    })

    it('filters findings by status when filter is applied', () => {
      render(<FindingsList {...defaultProps} statusFilter="closed" />)

      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(1)
      expect(screen.getByText(/Documentation not updated/i)).toBeInTheDocument()
    })
  })

  // Combined Filters
  describe('combined filters', () => {
    it('applies both severity and status filters', () => {
      render(
        <FindingsList
          {...defaultProps}
          severityFilter="critical"
          statusFilter="open"
        />
      )

      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(1)
      expect(screen.getByText(/Critical security vulnerability/i)).toBeInTheDocument()
    })

    it('shows empty state when no findings match filters', () => {
      render(
        <FindingsList
          {...defaultProps}
          severityFilter="critical"
          statusFilter="closed"
        />
      )

      expect(screen.getByText(/אין ממצאים תואמים/i)).toBeInTheDocument()
    })
  })

  // Loading State
  describe('loading state', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<FindingsList {...defaultProps} isLoading />)
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('shows loading text in Hebrew', () => {
      render(<FindingsList {...defaultProps} isLoading />)
      expect(screen.getByText(/טוען ממצאים/i)).toBeInTheDocument()
    })

    it('does not render finding list when loading', () => {
      render(<FindingsList {...defaultProps} isLoading />)
      expect(screen.queryByText(/Critical security vulnerability/i)).not.toBeInTheDocument()
    })

    it('shows skeleton cards during loading', () => {
      render(<FindingsList {...defaultProps} isLoading />)
      const skeletons = screen.getAllByTestId('skeleton-card')
      expect(skeletons.length).toBeGreaterThanOrEqual(3)
    })
  })

  // Empty State
  describe('empty state', () => {
    it('shows empty message when no findings', () => {
      render(<FindingsList {...defaultProps} findings={[]} />)
      expect(screen.getByText(/אין ממצאים עדיין/i)).toBeInTheDocument()
    })

    it('shows add button in empty state', () => {
      render(<FindingsList {...defaultProps} findings={[]} />)
      const addButtons = screen.getAllByRole('button', { name: /הוסף ממצא/i })
      expect(addButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('displays helpful message in empty state', () => {
      render(<FindingsList {...defaultProps} findings={[]} />)
      expect(screen.getByText(/הוסיפו את הממצא הראשון/i)).toBeInTheDocument()
    })
  })

  // Error State
  describe('error state', () => {
    it('shows error message when error prop is provided', () => {
      render(<FindingsList {...defaultProps} error="Failed to load findings" />)
      expect(screen.getByRole('heading', { name: /שגיאה בטעינת ממצאים/i })).toBeInTheDocument()
    })

    it('shows the error details', () => {
      render(<FindingsList {...defaultProps} error="Network error" />)
      expect(screen.getByText(/Network error/i)).toBeInTheDocument()
    })

    it('shows retry button when error occurs', () => {
      render(
        <FindingsList
          {...defaultProps}
          error="Failed to load"
          onRetry={mockOnRetry}
        />
      )
      expect(screen.getByRole('button', { name: /נסה שוב/i })).toBeInTheDocument()
    })

    it('calls onRetry when retry button clicked', async () => {
      const user = userEvent.setup()
      render(
        <FindingsList
          {...defaultProps}
          error="Failed to load"
          onRetry={mockOnRetry}
        />
      )

      await user.click(screen.getByRole('button', { name: /נסה שוב/i }))
      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })

    it('does not render finding list when error', () => {
      render(<FindingsList {...defaultProps} error="Error occurred" />)
      expect(screen.queryByText(/Critical security vulnerability/i)).not.toBeInTheDocument()
    })
  })

  // Actions
  describe('actions', () => {
    it('calls onAdd when add button clicked', async () => {
      const user = userEvent.setup()
      render(<FindingsList {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /הוסף ממצא/i }))
      expect(mockOnAdd).toHaveBeenCalledTimes(1)
    })

    it('passes onEdit to finding cards', async () => {
      const user = userEvent.setup()
      render(<FindingsList {...defaultProps} />)

      const editButtons = screen.getAllByRole('button', { name: /עריכה/i })
      await user.click(editButtons[0])

      expect(mockOnEdit).toHaveBeenCalledTimes(1)
      expect(mockOnEdit).toHaveBeenCalledWith(mockFindings[0])
    })

    it('passes onDelete to finding cards', async () => {
      const user = userEvent.setup()
      render(<FindingsList {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: /מחיקה/i })
      await user.click(deleteButtons[0])

      expect(mockOnDelete).toHaveBeenCalledTimes(1)
      expect(mockOnDelete).toHaveBeenCalledWith('finding-1')
    })
  })

  // Deleting State
  describe('deleting state', () => {
    it('passes isDeleting to correct finding card', () => {
      render(<FindingsList {...defaultProps} deletingId="finding-2" />)
      expect(screen.getByText(/מוחק/i)).toBeInTheDocument()
    })

    it('does not show deleting state for other findings', () => {
      render(<FindingsList {...defaultProps} deletingId="finding-2" />)

      const deleteButtons = screen.getAllByRole('button', { name: /מחיקה/i })
      const enabledButtons = deleteButtons.filter((btn) => !btn.hasAttribute('disabled'))
      expect(enabledButtons).toHaveLength(3)
    })
  })

  // RTL Support
  describe('RTL support', () => {
    it('has RTL direction attribute', () => {
      render(<FindingsList {...defaultProps} />)
      const container = screen.getByTestId('findings-list-container')
      expect(container).toHaveAttribute('dir', 'rtl')
    })
  })

  // Accessibility
  describe('accessibility', () => {
    it('has heading for section', () => {
      render(<FindingsList {...defaultProps} />)
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThanOrEqual(1)
    })

    it('add button has accessible name', () => {
      render(<FindingsList {...defaultProps} />)
      expect(screen.getByRole('button', { name: /הוסף ממצא/i })).toBeInTheDocument()
    })

    it('filter buttons have accessible names', () => {
      render(<FindingsList {...defaultProps} />)

      // Severity filters
      expect(screen.getByRole('button', { name: /קריטי/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /גבוה/i })).toBeInTheDocument()

      // Status filters
      expect(screen.getByRole('button', { name: /פתוח/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /בתהליך/i })).toBeInTheDocument()
    })

    it('uses list semantics', () => {
      render(<FindingsList {...defaultProps} />)
      expect(screen.getByTestId('findings-list')).toBeInTheDocument()
    })
  })

  // Layout
  describe('layout', () => {
    it('renders in grid layout', () => {
      render(<FindingsList {...defaultProps} />)
      const list = screen.getByTestId('findings-list')
      expect(list).toHaveClass('grid')
    })
  })

  // Custom className
  describe('className prop', () => {
    it('applies custom className', () => {
      render(<FindingsList {...defaultProps} className="custom-class" />)
      const container = screen.getByTestId('findings-list-container')
      expect(container).toHaveClass('custom-class')
    })
  })
})

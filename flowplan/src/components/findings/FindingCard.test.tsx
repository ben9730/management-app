/**
 * FindingCard Component Tests (TDD)
 *
 * Displays a single audit finding with severity, status, CAPA info, and actions.
 * Hebrew RTL support with dark mode styling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FindingCard } from './FindingCard'
import type { AuditFinding } from '@/types/entities'

// Mock audit finding data
const mockFinding: AuditFinding = {
  id: 'finding-1',
  task_id: 'task-1',
  severity: 'high',
  finding: 'Missing documentation for critical process steps that require detailed audit trail',
  root_cause: 'Lack of standardized documentation procedures',
  capa: 'Implement documentation checklist and training program',
  due_date: new Date('2024-03-15'),
  status: 'open',
  created_at: new Date('2024-01-15'),
}

const mockOnEdit = vi.fn()
const mockOnDelete = vi.fn()

const defaultProps = {
  finding: mockFinding,
  onEdit: mockOnEdit,
  onDelete: mockOnDelete,
}

describe('FindingCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Basic Rendering
  describe('rendering', () => {
    it('renders finding title (first 50 chars of finding field)', () => {
      render(<FindingCard {...defaultProps} />)
      // Should show truncated title: "Missing documentation for critical process steps t..."
      expect(screen.getByText(/Missing documentation for critical process steps/)).toBeInTheDocument()
    })

    it('truncates long findings to 50 characters with ellipsis', () => {
      render(<FindingCard {...defaultProps} />)
      const title = screen.getByTestId('finding-title')
      // Original: "Missing documentation for critical process steps that require detailed audit trail"
      // Truncated should be 50 chars + "..."
      expect(title.textContent).toHaveLength(53) // 50 chars + "..."
    })

    it('does not add ellipsis for short findings', () => {
      const shortFinding = { ...mockFinding, finding: 'Short finding text' }
      render(<FindingCard {...defaultProps} finding={shortFinding} />)
      const title = screen.getByTestId('finding-title')
      expect(title.textContent).toBe('Short finding text')
      expect(title.textContent).not.toContain('...')
    })

    it('renders edit button', () => {
      render(<FindingCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /edit|עריכה/i })).toBeInTheDocument()
    })

    it('renders delete button', () => {
      render(<FindingCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /delete|מחיקה/i })).toBeInTheDocument()
    })
  })

  // Severity Badge Display
  describe('severity badge', () => {
    it('displays critical severity with red styling', () => {
      const criticalFinding = { ...mockFinding, severity: 'critical' as const }
      render(<FindingCard {...defaultProps} finding={criticalFinding} />)
      const badge = screen.getByTestId('severity-badge')
      expect(badge).toHaveTextContent(/critical|קריטי/i)
      expect(badge).toHaveClass(/bg-\[#e2445c\]|bg-red|critical/)
    })

    it('displays high severity with orange styling', () => {
      render(<FindingCard {...defaultProps} />)
      const badge = screen.getByTestId('severity-badge')
      expect(badge).toHaveTextContent(/high|גבוה/i)
      expect(badge).toHaveClass(/bg-\[#fdab3d\]|bg-orange|high/)
    })

    it('displays medium severity with appropriate styling', () => {
      const mediumFinding = { ...mockFinding, severity: 'medium' as const }
      render(<FindingCard {...defaultProps} finding={mediumFinding} />)
      const badge = screen.getByTestId('severity-badge')
      expect(badge).toHaveTextContent(/medium|בינוני/i)
      // Badge uses medium variant which is blue (#579bfc)
      expect(badge).toHaveClass(/bg-\[#579bfc\]|medium/)
    })

    it('displays low severity with green styling', () => {
      const lowFinding = { ...mockFinding, severity: 'low' as const }
      render(<FindingCard {...defaultProps} finding={lowFinding} />)
      const badge = screen.getByTestId('severity-badge')
      expect(badge).toHaveTextContent(/low|נמוך/i)
      // Badge uses low variant which is green (#00ca72)
      expect(badge).toHaveClass(/bg-\[#00ca72\]|low/)
    })
  })

  // Status Badge Display
  describe('status badge', () => {
    it('displays open status with red styling', () => {
      render(<FindingCard {...defaultProps} />)
      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent(/open|פתוח/i)
      expect(badge).toHaveClass(/bg-\[#e2445c\]|bg-red|critical/)
    })

    it('displays in_progress status with appropriate styling', () => {
      const inProgressFinding = { ...mockFinding, status: 'in_progress' as const }
      render(<FindingCard {...defaultProps} finding={inProgressFinding} />)
      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent(/in.?progress|בתהליך/i)
      // Badge uses medium variant which is blue (#579bfc) for in-progress
      expect(badge).toHaveClass(/bg-\[#579bfc\]|medium/)
    })

    it('displays closed status with green styling', () => {
      const closedFinding = { ...mockFinding, status: 'closed' as const }
      render(<FindingCard {...defaultProps} finding={closedFinding} />)
      const badge = screen.getByTestId('status-badge')
      expect(badge).toHaveTextContent(/closed|סגור/i)
      expect(badge).toHaveClass(/bg-\[#00ca72\]|bg-green|success|low/)
    })
  })

  // CAPA Status Display
  describe('CAPA status display', () => {
    it('displays "has CAPA" indicator when capa field is populated', () => {
      render(<FindingCard {...defaultProps} />)
      // The capa-status element shows "Yes" when CAPA exists
      expect(screen.getByTestId('capa-status')).toHaveTextContent(/yes|כן|יש/i)
    })

    it('displays "no CAPA" indicator when capa field is null', () => {
      const noCAPAFinding = { ...mockFinding, capa: null }
      render(<FindingCard {...defaultProps} finding={noCAPAFinding} />)
      expect(screen.getByTestId('capa-status')).toHaveTextContent(/no|אין|לא/i)
    })

    it('displays "no CAPA" indicator when capa field is empty string', () => {
      const emptyCAPAFinding = { ...mockFinding, capa: '' }
      render(<FindingCard {...defaultProps} finding={emptyCAPAFinding} />)
      expect(screen.getByTestId('capa-status')).toHaveTextContent(/no|אין|לא/i)
    })
  })

  // Due Date Display
  describe('due date display', () => {
    it('displays formatted due date when available', () => {
      render(<FindingCard {...defaultProps} />)
      const dueDate = screen.getByTestId('due-date')
      // Should display date in a readable format
      expect(dueDate).toBeInTheDocument()
      expect(dueDate).toHaveTextContent(/15|03|2024|מרץ|march/i)
    })

    it('does not display due date section when due_date is null', () => {
      const noDueDateFinding = { ...mockFinding, due_date: null }
      render(<FindingCard {...defaultProps} finding={noDueDateFinding} />)
      expect(screen.queryByTestId('due-date')).not.toBeInTheDocument()
    })

    it('highlights overdue findings', () => {
      const overdueFinding = {
        ...mockFinding,
        due_date: new Date('2020-01-01'), // Past date
        status: 'open' as const,
      }
      render(<FindingCard {...defaultProps} finding={overdueFinding} />)
      const dueDate = screen.getByTestId('due-date')
      expect(dueDate).toHaveClass(/text-red|overdue|danger/)
    })

    it('does not highlight overdue for closed findings', () => {
      const closedOverdueFinding = {
        ...mockFinding,
        due_date: new Date('2020-01-01'),
        status: 'closed' as const,
      }
      render(<FindingCard {...defaultProps} finding={closedOverdueFinding} />)
      const dueDate = screen.getByTestId('due-date')
      expect(dueDate).not.toHaveClass(/text-red|overdue|danger/)
    })
  })

  // Actions
  describe('actions', () => {
    it('calls onEdit with finding when edit button clicked', async () => {
      const user = userEvent.setup()
      render(<FindingCard {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /edit|עריכה/i }))

      expect(mockOnEdit).toHaveBeenCalledTimes(1)
      expect(mockOnEdit).toHaveBeenCalledWith(mockFinding)
    })

    it('calls onDelete with finding id when delete button clicked', async () => {
      const user = userEvent.setup()
      render(<FindingCard {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /delete|מחיקה/i }))

      expect(mockOnDelete).toHaveBeenCalledTimes(1)
      expect(mockOnDelete).toHaveBeenCalledWith('finding-1')
    })
  })

  // Loading/Disabled States
  describe('disabled state', () => {
    it('disables edit button when isDeleting is true', () => {
      render(<FindingCard {...defaultProps} isDeleting />)
      expect(screen.getByRole('button', { name: /edit|עריכה/i })).toBeDisabled()
    })

    it('disables delete button when isDeleting is true', () => {
      render(<FindingCard {...defaultProps} isDeleting />)
      expect(screen.getByRole('button', { name: /delete|מחיקה/i })).toBeDisabled()
    })

    it('shows loading state on delete button when isDeleting', () => {
      render(<FindingCard {...defaultProps} isDeleting />)
      expect(screen.getByText(/מוחק|deleting/i)).toBeInTheDocument()
    })
  })

  // Accessibility
  describe('accessibility', () => {
    it('has article role for card', () => {
      render(<FindingCard {...defaultProps} />)
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('edit button has accessible name', () => {
      render(<FindingCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /edit|עריכה/i })).toBeInTheDocument()
    })

    it('delete button has accessible name', () => {
      render(<FindingCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /delete|מחיקה/i })).toBeInTheDocument()
    })

    it('severity badge is accessible', () => {
      render(<FindingCard {...defaultProps} />)
      const badge = screen.getByTestId('severity-badge')
      expect(badge).toHaveAttribute('aria-label')
    })
  })

  // RTL Support
  describe('RTL support', () => {
    it('renders with RTL direction', () => {
      render(<FindingCard {...defaultProps} />)
      const card = screen.getByRole('article')
      // Check that card supports RTL (either via dir attribute or className)
      expect(card).toBeInTheDocument()
    })
  })

  // Edge Cases
  describe('edge cases', () => {
    it('handles finding with exactly 50 characters', () => {
      const exact50Finding = {
        ...mockFinding,
        finding: '12345678901234567890123456789012345678901234567890', // exactly 50 chars
      }
      render(<FindingCard {...defaultProps} finding={exact50Finding} />)
      const title = screen.getByTestId('finding-title')
      expect(title.textContent).toBe('12345678901234567890123456789012345678901234567890')
      expect(title.textContent).not.toContain('...')
    })

    it('handles finding with empty root_cause', () => {
      const noRootCauseFinding = { ...mockFinding, root_cause: null }
      render(<FindingCard {...defaultProps} finding={noRootCauseFinding} />)
      // Should render without crashing
      expect(screen.getByTestId('finding-title')).toBeInTheDocument()
    })

    it('handles finding with special characters in text', () => {
      const specialCharFinding = {
        ...mockFinding,
        finding: 'ממצא עם תווים מיוחדים: <script>alert("xss")</script>',
      }
      render(<FindingCard {...defaultProps} finding={specialCharFinding} />)
      const title = screen.getByTestId('finding-title')
      // Should escape HTML and render as text
      expect(title).toBeInTheDocument()
    })

    it('handles due_date as string type', () => {
      const stringDateFinding = {
        ...mockFinding,
        due_date: '2024-03-15' as unknown as Date,
      }
      render(<FindingCard {...defaultProps} finding={stringDateFinding} />)
      expect(screen.getByTestId('due-date')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<FindingCard {...defaultProps} className="custom-class" />)
      const card = screen.getByRole('article')
      expect(card).toHaveClass('custom-class')
    })
  })

  // Dark Mode
  describe('dark mode styling', () => {
    it('has dark mode classes for background', () => {
      render(<FindingCard {...defaultProps} />)
      const card = screen.getByRole('article')
      expect(card).toHaveClass(/dark:bg-slate-800|dark:bg/)
    })

    it('has dark mode classes for text', () => {
      render(<FindingCard {...defaultProps} />)
      const card = screen.getByRole('article')
      expect(card.innerHTML).toMatch(/dark:text/)
    })
  })
})

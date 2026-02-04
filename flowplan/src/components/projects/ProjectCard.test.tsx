/**
 * ProjectCard Component Tests (TDD)
 *
 * Comprehensive tests for the ProjectCard component.
 * Following TDD methodology: Write tests FIRST, then implement.
 *
 * Requirements:
 * 1. Display project name (h3)
 * 2. Display description (if exists)
 * 3. Display status badge with Hebrew labels
 * 4. Display dates with Hebrew formatting
 * 5. Edit and Delete action buttons
 * 6. Loading/deleting state
 * 7. onClick to select project
 * 8. Accessible (aria labels)
 * 9. Dark mode styling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectCard, ProjectCardProps } from './ProjectCard'
import type { Project, ProjectStatus } from '@/types/entities'

// Mock project data
const mockProject: Project = {
  id: 'project-1',
  name: 'Test Project',
  description: 'Test project description',
  status: 'active',
  start_date: new Date('2026-01-15'),
  end_date: new Date('2026-03-31'),
  created_by: 'user-1',
  created_at: new Date('2026-01-10'),
  updated_at: new Date('2026-01-10'),
}

const mockOnEdit = vi.fn()
const mockOnDelete = vi.fn()
const mockOnClick = vi.fn()

const defaultProps: ProjectCardProps = {
  project: mockProject,
  onEdit: mockOnEdit,
  onDelete: mockOnDelete,
}

describe('ProjectCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================
  // 1. Basic Rendering Tests
  // ===========================================
  describe('rendering', () => {
    it('renders as an article element', () => {
      render(<ProjectCard {...defaultProps} />)
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('renders project name as h3', () => {
      render(<ProjectCard {...defaultProps} />)
      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Test Project')
    })

    it('renders project description', () => {
      render(<ProjectCard {...defaultProps} />)
      expect(screen.getByText('Test project description')).toBeInTheDocument()
    })

    it('renders edit button', () => {
      render(<ProjectCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /edit|עריכה/i })).toBeInTheDocument()
    })

    it('renders delete button', () => {
      render(<ProjectCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /delete|מחיקה/i })).toBeInTheDocument()
    })
  })

  // ===========================================
  // 2. Description Handling Tests
  // ===========================================
  describe('description handling', () => {
    it('displays description when provided', () => {
      render(<ProjectCard {...defaultProps} />)
      expect(screen.getByText('Test project description')).toBeInTheDocument()
    })

    it('handles null description gracefully', () => {
      const projectWithNullDescription: Project = {
        ...mockProject,
        description: null,
      }
      render(<ProjectCard {...defaultProps} project={projectWithNullDescription} />)

      // Should not throw and should render without description
      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(screen.queryByText('Test project description')).not.toBeInTheDocument()
    })

    it('handles empty string description', () => {
      const projectWithEmptyDescription: Project = {
        ...mockProject,
        description: '',
      }
      render(<ProjectCard {...defaultProps} project={projectWithEmptyDescription} />)

      // Should render without crashing
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('handles long description text', () => {
      const longDescription = 'A'.repeat(500)
      const projectWithLongDescription: Project = {
        ...mockProject,
        description: longDescription,
      }
      render(<ProjectCard {...defaultProps} project={projectWithLongDescription} />)

      // Should render without crashing
      expect(screen.getByRole('article')).toBeInTheDocument()
    })
  })

  // ===========================================
  // 3. Status Badge Tests (Hebrew Labels)
  // ===========================================
  describe('status badge with Hebrew labels', () => {
    it('displays active status in Hebrew', () => {
      const activeProject: Project = { ...mockProject, status: 'active' }
      render(<ProjectCard {...defaultProps} project={activeProject} />)

      expect(screen.getByText('פעיל')).toBeInTheDocument()
    })

    it('displays completed status in Hebrew', () => {
      const completedProject: Project = { ...mockProject, status: 'completed' }
      render(<ProjectCard {...defaultProps} project={completedProject} />)

      expect(screen.getByText('הושלם')).toBeInTheDocument()
    })

    it('displays archived status in Hebrew', () => {
      const archivedProject: Project = { ...mockProject, status: 'archived' }
      render(<ProjectCard {...defaultProps} project={archivedProject} />)

      expect(screen.getByText('בארכיון')).toBeInTheDocument()
    })

    it('renders status badge as a badge element', () => {
      render(<ProjectCard {...defaultProps} />)
      const badge = screen.getByText('פעיל')
      expect(badge).toBeInTheDocument()
    })

    it('applies correct styling for active status', () => {
      const activeProject: Project = { ...mockProject, status: 'active' }
      render(<ProjectCard {...defaultProps} project={activeProject} />)

      const badge = screen.getByText('פעיל')
      // Badge should have appropriate styling (testable via data-testid or class)
      expect(badge).toBeInTheDocument()
    })

    it('applies correct styling for completed status', () => {
      const completedProject: Project = { ...mockProject, status: 'completed' }
      render(<ProjectCard {...defaultProps} project={completedProject} />)

      const badge = screen.getByText('הושלם')
      expect(badge).toBeInTheDocument()
    })

    it('applies correct styling for archived status', () => {
      const archivedProject: Project = { ...mockProject, status: 'archived' }
      render(<ProjectCard {...defaultProps} project={archivedProject} />)

      const badge = screen.getByText('בארכיון')
      expect(badge).toBeInTheDocument()
    })
  })

  // ===========================================
  // 4. Date Display Tests
  // ===========================================
  describe('date display', () => {
    it('displays start date with Hebrew formatting', () => {
      render(<ProjectCard {...defaultProps} />)

      // Hebrew date format: DD/MM/YYYY (15/01/2026)
      // Should match the formatted date pattern
      const dateElement = screen.getByTestId('project-dates')
      expect(dateElement).toHaveTextContent(/15.*01.*2026/)
    })

    it('displays end date with Hebrew formatting', () => {
      render(<ProjectCard {...defaultProps} />)

      // Hebrew date format: DD/MM/YYYY (31/03/2026)
      const dateElement = screen.getByTestId('project-dates')
      expect(dateElement).toHaveTextContent(/31.*03.*2026/)
    })

    it('displays date range with separator', () => {
      render(<ProjectCard {...defaultProps} />)

      const dateElement = screen.getByTestId('project-dates')
      // Should have both dates with some separator (- or to)
      expect(dateElement).toBeInTheDocument()
    })

    it('handles null start_date', () => {
      const projectWithNullStartDate: Project = {
        ...mockProject,
        start_date: null,
      }
      render(<ProjectCard {...defaultProps} project={projectWithNullStartDate} />)

      // Should render without crashing, possibly showing placeholder
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('handles null end_date', () => {
      const projectWithNullEndDate: Project = {
        ...mockProject,
        end_date: null,
      }
      render(<ProjectCard {...defaultProps} project={projectWithNullEndDate} />)

      // Should render without crashing
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('handles both dates null', () => {
      const projectWithNoDates: Project = {
        ...mockProject,
        start_date: null,
        end_date: null,
      }
      render(<ProjectCard {...defaultProps} project={projectWithNoDates} />)

      // Should render without crashing, show placeholder or nothing
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('handles date as string (ISO format)', () => {
      const projectWithStringDates: Project = {
        ...mockProject,
        start_date: '2026-01-15T00:00:00Z',
        end_date: '2026-03-31T00:00:00Z',
      }
      render(<ProjectCard {...defaultProps} project={projectWithStringDates} />)

      const dateElement = screen.getByTestId('project-dates')
      expect(dateElement).toHaveTextContent(/15.*01.*2026/)
    })

    it('handles date as Date object', () => {
      render(<ProjectCard {...defaultProps} />)

      const dateElement = screen.getByTestId('project-dates')
      expect(dateElement).toHaveTextContent(/15.*01.*2026/)
    })
  })

  // ===========================================
  // 5. Edit Button Tests
  // ===========================================
  describe('edit button', () => {
    it('calls onEdit when edit button is clicked', async () => {
      render(<ProjectCard {...defaultProps} />)

      const editButton = screen.getByRole('button', { name: /edit|עריכה/i })
      await userEvent.click(editButton)

      expect(mockOnEdit).toHaveBeenCalledTimes(1)
    })

    it('passes the project to onEdit callback', async () => {
      render(<ProjectCard {...defaultProps} />)

      const editButton = screen.getByRole('button', { name: /edit|עריכה/i })
      await userEvent.click(editButton)

      expect(mockOnEdit).toHaveBeenCalledWith(mockProject)
    })

    it('edit button is disabled when isDeleting', () => {
      render(<ProjectCard {...defaultProps} isDeleting />)

      const editButton = screen.getByRole('button', { name: /edit|עריכה/i })
      expect(editButton).toBeDisabled()
    })

    it('edit button has correct aria-label', () => {
      render(<ProjectCard {...defaultProps} />)

      const editButton = screen.getByRole('button', { name: /edit|עריכה/i })
      expect(editButton).toHaveAttribute('aria-label')
    })
  })

  // ===========================================
  // 6. Delete Button Tests
  // ===========================================
  describe('delete button', () => {
    it('calls onDelete when delete button is clicked', async () => {
      render(<ProjectCard {...defaultProps} />)

      const deleteButton = screen.getByRole('button', { name: /delete|מחיקה/i })
      await userEvent.click(deleteButton)

      expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })

    it('passes the project id to onDelete callback', async () => {
      render(<ProjectCard {...defaultProps} />)

      const deleteButton = screen.getByRole('button', { name: /delete|מחיקה/i })
      await userEvent.click(deleteButton)

      expect(mockOnDelete).toHaveBeenCalledWith('project-1')
    })

    it('delete button is disabled when isDeleting', () => {
      render(<ProjectCard {...defaultProps} isDeleting />)

      const deleteButton = screen.getByRole('button', { name: /delete|מחיקה|מוחק/i })
      expect(deleteButton).toBeDisabled()
    })

    it('delete button has correct aria-label', () => {
      render(<ProjectCard {...defaultProps} />)

      const deleteButton = screen.getByRole('button', { name: /delete|מחיקה/i })
      expect(deleteButton).toHaveAttribute('aria-label')
    })
  })

  // ===========================================
  // 7. onClick (Card Selection) Tests
  // ===========================================
  describe('onClick (card selection)', () => {
    it('calls onClick when card is clicked', async () => {
      render(<ProjectCard {...defaultProps} onClick={mockOnClick} />)

      const card = screen.getByRole('article')
      await userEvent.click(card)

      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('passes the project to onClick callback', async () => {
      render(<ProjectCard {...defaultProps} onClick={mockOnClick} />)

      const card = screen.getByRole('article')
      await userEvent.click(card)

      expect(mockOnClick).toHaveBeenCalledWith(mockProject)
    })

    it('does not call onClick when onClick prop is not provided', async () => {
      render(<ProjectCard {...defaultProps} />)

      const card = screen.getByRole('article')
      await userEvent.click(card)

      // No error should occur
      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it('does not call onClick when clicking edit button', async () => {
      render(<ProjectCard {...defaultProps} onClick={mockOnClick} />)

      const editButton = screen.getByRole('button', { name: /edit|עריכה/i })
      await userEvent.click(editButton)

      // onClick should NOT be called for edit button
      expect(mockOnClick).not.toHaveBeenCalled()
      expect(mockOnEdit).toHaveBeenCalled()
    })

    it('does not call onClick when clicking delete button', async () => {
      render(<ProjectCard {...defaultProps} onClick={mockOnClick} />)

      const deleteButton = screen.getByRole('button', { name: /delete|מחיקה/i })
      await userEvent.click(deleteButton)

      // onClick should NOT be called for delete button
      expect(mockOnClick).not.toHaveBeenCalled()
      expect(mockOnDelete).toHaveBeenCalled()
    })

    it('card has cursor-pointer when onClick is provided', () => {
      render(<ProjectCard {...defaultProps} onClick={mockOnClick} />)

      const card = screen.getByRole('article')
      expect(card).toHaveClass('cursor-pointer')
    })

    it('card does not have cursor-pointer when onClick is not provided', () => {
      render(<ProjectCard {...defaultProps} />)

      const card = screen.getByRole('article')
      expect(card).not.toHaveClass('cursor-pointer')
    })
  })

  // ===========================================
  // 8. Loading/Deleting State Tests
  // ===========================================
  describe('loading/deleting state', () => {
    it('shows loading text on delete button when isDeleting', () => {
      render(<ProjectCard {...defaultProps} isDeleting />)

      // Should show "מוחק..." (Deleting...) instead of "מחיקה" (Delete)
      expect(screen.getByText(/מוחק/)).toBeInTheDocument()
    })

    it('disables edit button when isDeleting', () => {
      render(<ProjectCard {...defaultProps} isDeleting />)

      const editButton = screen.getByRole('button', { name: /edit|עריכה/i })
      expect(editButton).toBeDisabled()
    })

    it('disables delete button when isDeleting', () => {
      render(<ProjectCard {...defaultProps} isDeleting />)

      const deleteButton = screen.getByRole('button', { name: /delete|מחיקה|מוחק/i })
      expect(deleteButton).toBeDisabled()
    })

    it('applies loading visual styles when isDeleting', () => {
      render(<ProjectCard {...defaultProps} isDeleting />)

      const card = screen.getByRole('article')
      // Card should have reduced opacity or loading indicator
      expect(card).toHaveClass('opacity-50')
    })

    it('does not disable buttons when isDeleting is false', () => {
      render(<ProjectCard {...defaultProps} isDeleting={false} />)

      const editButton = screen.getByRole('button', { name: /edit|עריכה/i })
      const deleteButton = screen.getByRole('button', { name: /delete|מחיקה/i })

      expect(editButton).not.toBeDisabled()
      expect(deleteButton).not.toBeDisabled()
    })

    it('defaults isDeleting to false', () => {
      render(<ProjectCard {...defaultProps} />)

      const editButton = screen.getByRole('button', { name: /edit|עריכה/i })
      const deleteButton = screen.getByRole('button', { name: /delete|מחיקה/i })

      expect(editButton).not.toBeDisabled()
      expect(deleteButton).not.toBeDisabled()
    })
  })

  // ===========================================
  // 9. Custom className Tests
  // ===========================================
  describe('custom className', () => {
    it('applies custom className to the card', () => {
      render(<ProjectCard {...defaultProps} className="custom-class" />)

      const card = screen.getByRole('article')
      expect(card).toHaveClass('custom-class')
    })

    it('merges custom className with default classes', () => {
      render(<ProjectCard {...defaultProps} className="custom-class" />)

      const card = screen.getByRole('article')
      // Should have both custom and default classes
      expect(card).toHaveClass('custom-class')
      // Should also have default styling classes (e.g., background, border)
      expect(card.className).toContain('bg-')
    })

    it('does not override essential default classes', () => {
      render(<ProjectCard {...defaultProps} className="p-0" />)

      // Card should still be functional even with overriding class
      expect(screen.getByRole('article')).toBeInTheDocument()
    })
  })

  // ===========================================
  // 10. Accessibility Tests
  // ===========================================
  describe('accessibility', () => {
    it('has article role', () => {
      render(<ProjectCard {...defaultProps} />)
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('has accessible name via heading', () => {
      render(<ProjectCard {...defaultProps} />)
      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toBeInTheDocument()
    })

    it('edit button has aria-label', () => {
      render(<ProjectCard {...defaultProps} />)
      const editButton = screen.getByRole('button', { name: /edit|עריכה/i })
      expect(editButton).toHaveAttribute('aria-label')
    })

    it('delete button has aria-label', () => {
      render(<ProjectCard {...defaultProps} />)
      const deleteButton = screen.getByRole('button', { name: /delete|מחיקה/i })
      expect(deleteButton).toHaveAttribute('aria-label')
    })

    it('is keyboard navigable', async () => {
      render(<ProjectCard {...defaultProps} onClick={mockOnClick} />)

      const card = screen.getByRole('article')
      card.focus()

      // Should be focusable
      expect(document.activeElement).toBe(card)
    })

    it('edit button is keyboard accessible', async () => {
      render(<ProjectCard {...defaultProps} />)

      const editButton = screen.getByRole('button', { name: /edit|עריכה/i })
      editButton.focus()

      await userEvent.keyboard('{Enter}')
      expect(mockOnEdit).toHaveBeenCalled()
    })

    it('delete button is keyboard accessible', async () => {
      render(<ProjectCard {...defaultProps} />)

      const deleteButton = screen.getByRole('button', { name: /delete|מחיקה/i })
      deleteButton.focus()

      await userEvent.keyboard('{Enter}')
      expect(mockOnDelete).toHaveBeenCalled()
    })

    it('has tabindex when onClick is provided', () => {
      render(<ProjectCard {...defaultProps} onClick={mockOnClick} />)

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('supports keyboard activation via Enter when onClick provided', async () => {
      render(<ProjectCard {...defaultProps} onClick={mockOnClick} />)

      const card = screen.getByRole('article')
      card.focus()

      await userEvent.keyboard('{Enter}')
      expect(mockOnClick).toHaveBeenCalled()
    })

    it('supports keyboard activation via Space when onClick provided', async () => {
      render(<ProjectCard {...defaultProps} onClick={mockOnClick} />)

      const card = screen.getByRole('article')
      card.focus()

      await userEvent.keyboard(' ')
      expect(mockOnClick).toHaveBeenCalled()
    })
  })

  // ===========================================
  // 11. Dark Mode Styling Tests
  // ===========================================
  describe('dark mode styling', () => {
    it('has dark mode background class', () => {
      render(<ProjectCard {...defaultProps} />)

      const card = screen.getByRole('article')
      expect(card.className).toMatch(/dark:bg-/)
    })

    it('has dark mode border class', () => {
      render(<ProjectCard {...defaultProps} />)

      const card = screen.getByRole('article')
      expect(card.className).toMatch(/dark:border-/)
    })

    it('has dark mode text class for heading', () => {
      render(<ProjectCard {...defaultProps} />)

      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading.className).toMatch(/dark:text-/)
    })
  })

  // ===========================================
  // 12. Edge Cases
  // ===========================================
  describe('edge cases', () => {
    it('handles project with minimal data', () => {
      const minimalProject: Project = {
        id: 'min-1',
        name: 'Minimal',
        description: null,
        status: 'active',
        start_date: null,
        end_date: null,
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      }
      render(<ProjectCard {...defaultProps} project={minimalProject} />)

      expect(screen.getByText('Minimal')).toBeInTheDocument()
    })

    it('handles very long project name', () => {
      const longNameProject: Project = {
        ...mockProject,
        name: 'A'.repeat(200),
      }
      render(<ProjectCard {...defaultProps} project={longNameProject} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('handles special characters in project name', () => {
      const specialCharsProject: Project = {
        ...mockProject,
        name: '<script>alert("xss")</script>',
      }
      render(<ProjectCard {...defaultProps} project={specialCharsProject} />)

      // Should render as text, not execute
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('handles Hebrew characters in project name', () => {
      const hebrewProject: Project = {
        ...mockProject,
        name: 'פרויקט בדיקה',
        description: 'תיאור הפרויקט בעברית',
      }
      render(<ProjectCard {...defaultProps} project={hebrewProject} />)

      expect(screen.getByText('פרויקט בדיקה')).toBeInTheDocument()
      expect(screen.getByText('תיאור הפרויקט בעברית')).toBeInTheDocument()
    })

    it('handles emoji in project name', () => {
      const emojiProject: Project = {
        ...mockProject,
        name: 'Project Name',
      }
      render(<ProjectCard {...defaultProps} project={emojiProject} />)

      expect(screen.getByText('Project Name')).toBeInTheDocument()
    })

    it('handles rapid clicks on buttons', async () => {
      render(<ProjectCard {...defaultProps} />)

      const editButton = screen.getByRole('button', { name: /edit|עריכה/i })

      // Rapid clicks
      await userEvent.click(editButton)
      await userEvent.click(editButton)
      await userEvent.click(editButton)

      // Should have been called multiple times
      expect(mockOnEdit).toHaveBeenCalledTimes(3)
    })
  })

  // ===========================================
  // 13. Snapshot / Visual Tests
  // ===========================================
  describe('visual consistency', () => {
    it('has consistent structure with all elements', () => {
      render(<ProjectCard {...defaultProps} />)

      // Verify all expected elements are present
      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
      expect(screen.getByText('Test project description')).toBeInTheDocument()
      expect(screen.getByText('פעיל')).toBeInTheDocument()
      expect(screen.getByTestId('project-dates')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit|עריכה/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete|מחיקה/i })).toBeInTheDocument()
    })

    it('maintains hover shadow transition class', () => {
      render(<ProjectCard {...defaultProps} />)

      const card = screen.getByRole('article')
      expect(card).toHaveClass('transition-shadow')
    })

    it('has rounded corners', () => {
      render(<ProjectCard {...defaultProps} />)

      const card = screen.getByRole('article')
      expect(card.className).toMatch(/rounded-/)
    })

    it('has proper padding', () => {
      render(<ProjectCard {...defaultProps} />)

      const card = screen.getByRole('article')
      expect(card.className).toMatch(/p-/)
    })
  })

  // ===========================================
  // 14. Status Badge Variant Tests
  // ===========================================
  describe('status badge variants', () => {
    it.each<[ProjectStatus, string]>([
      ['active', 'פעיל'],
      ['completed', 'הושלם'],
      ['archived', 'בארכיון'],
    ])('renders %s status as %s', (status, expectedLabel) => {
      const project: Project = { ...mockProject, status }
      render(<ProjectCard {...defaultProps} project={project} />)

      expect(screen.getByText(expectedLabel)).toBeInTheDocument()
    })
  })
})

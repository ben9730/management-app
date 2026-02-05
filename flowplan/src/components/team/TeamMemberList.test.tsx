/**
 * TeamMemberList Component Tests (TDD)
 *
 * Displays a list of team members with loading, empty, and error states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamMemberList } from './TeamMemberList'
import type { TeamMember } from '@/types/entities'

// Mock team members data
const mockTeamMembers: TeamMember[] = [
  {
    id: 'member-1',
    user_id: 'user-1',
    project_id: 'project-1',
    first_name: 'Israel',
    last_name: 'Cohen',
    email: 'israel@example.com',
    employment_type: 'full_time',
    work_hours_per_day: 8,
    work_days: [0, 1, 2, 3, 4],
    role: 'admin',
    hourly_rate: 150,
    created_at: new Date('2024-01-15'),
  },
  {
    id: 'member-2',
    user_id: 'user-2',
    project_id: 'project-1',
    first_name: 'Sarah',
    last_name: 'Levi',
    email: 'sarah@example.com',
    employment_type: 'part_time',
    work_hours_per_day: 4,
    work_days: [0, 1, 2],
    role: 'member',
    hourly_rate: null,
    created_at: new Date('2024-01-20'),
  },
  {
    id: 'member-3',
    user_id: 'user-3',
    project_id: 'project-1',
    first_name: 'David',
    last_name: 'Mizrachi',
    email: 'david@example.com',
    employment_type: 'contractor',
    work_hours_per_day: 6,
    work_days: [1, 2, 3, 4, 5],
    role: 'member',
    hourly_rate: 200,
    created_at: new Date('2024-02-01'),
  },
]

const mockOnEdit = vi.fn()
const mockOnDelete = vi.fn()
const mockOnAdd = vi.fn()

const defaultProps = {
  members: mockTeamMembers,
  onEdit: mockOnEdit,
  onDelete: mockOnDelete,
  onAdd: mockOnAdd,
}

describe('TeamMemberList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Basic Rendering
  describe('rendering', () => {
    it('renders all team members', () => {
      render(<TeamMemberList {...defaultProps} />)

      expect(screen.getByText('Israel Cohen')).toBeInTheDocument()
      expect(screen.getByText('Sarah Levi')).toBeInTheDocument()
      expect(screen.getByText('David Mizrachi')).toBeInTheDocument()
    })

    it('renders member emails', () => {
      render(<TeamMemberList {...defaultProps} />)

      expect(screen.getByText('israel@example.com')).toBeInTheDocument()
      expect(screen.getByText('sarah@example.com')).toBeInTheDocument()
      expect(screen.getByText('david@example.com')).toBeInTheDocument()
    })

    it('renders add member button', () => {
      render(<TeamMemberList {...defaultProps} />)
      expect(screen.getByRole('button', { name: /add|הוסף/i })).toBeInTheDocument()
    })

    it('renders correct number of member cards', () => {
      render(<TeamMemberList {...defaultProps} />)
      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(3)
    })
  })

  // Loading State
  describe('loading state', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<TeamMemberList {...defaultProps} isLoading />)
      expect(screen.getByText(/loading|טוען/i)).toBeInTheDocument()
    })

    it('does not render member list when loading', () => {
      render(<TeamMemberList {...defaultProps} isLoading />)
      expect(screen.queryByText('Israel Cohen')).not.toBeInTheDocument()
    })

    it('shows loading spinner', () => {
      render(<TeamMemberList {...defaultProps} isLoading />)
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })
  })

  // Empty State
  describe('empty state', () => {
    it('shows empty message when no members', () => {
      render(<TeamMemberList {...defaultProps} members={[]} />)
      expect(screen.getByText(/no team members|אין חברי צוות/i)).toBeInTheDocument()
    })

    it('shows add button in empty state', () => {
      render(<TeamMemberList {...defaultProps} members={[]} />)
      // There may be multiple add buttons (header + body)
      const addButtons = screen.getAllByRole('button', { name: /add|הוסף/i })
      expect(addButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('displays helpful message in empty state', () => {
      render(<TeamMemberList {...defaultProps} members={[]} />)
      expect(screen.getByText(/add your first|הוסיפו את חבר הצוות הראשון/i)).toBeInTheDocument()
    })
  })

  // Error State
  describe('error state', () => {
    it('shows error message when error prop is provided', () => {
      render(<TeamMemberList {...defaultProps} error="Failed to load team members" />)
      // Check that the error message is displayed (heading or text)
      expect(screen.getByRole('heading', { name: /failed to load|שגיאה בטעינת/i })).toBeInTheDocument()
    })

    it('shows retry button when error occurs', () => {
      const mockOnRetry = vi.fn()
      render(
        <TeamMemberList
          {...defaultProps}
          error="Failed to load"
          onRetry={mockOnRetry}
        />
      )
      expect(screen.getByRole('button', { name: /retry|נסה שוב/i })).toBeInTheDocument()
    })

    it('calls onRetry when retry button clicked', async () => {
      const user = userEvent.setup()
      const mockOnRetry = vi.fn()
      render(
        <TeamMemberList
          {...defaultProps}
          error="Failed to load"
          onRetry={mockOnRetry}
        />
      )

      await user.click(screen.getByRole('button', { name: /retry|נסה שוב/i }))
      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })

    it('does not render member list when error', () => {
      render(<TeamMemberList {...defaultProps} error="Error occurred" />)
      expect(screen.queryByText('Israel Cohen')).not.toBeInTheDocument()
    })
  })

  // Actions
  describe('actions', () => {
    it('calls onAdd when add button clicked', async () => {
      const user = userEvent.setup()
      render(<TeamMemberList {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add|הוסף/i }))
      expect(mockOnAdd).toHaveBeenCalledTimes(1)
    })

    it('passes onEdit to member cards', async () => {
      const user = userEvent.setup()
      render(<TeamMemberList {...defaultProps} />)

      // Click first edit button
      const editButtons = screen.getAllByRole('button', { name: /edit|עריכה/i })
      await user.click(editButtons[0])

      expect(mockOnEdit).toHaveBeenCalledTimes(1)
      expect(mockOnEdit).toHaveBeenCalledWith(mockTeamMembers[0])
    })

    it('passes onDelete to member cards', async () => {
      const user = userEvent.setup()
      render(<TeamMemberList {...defaultProps} />)

      // Click first delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete|מחיקה/i })
      await user.click(deleteButtons[0])

      expect(mockOnDelete).toHaveBeenCalledTimes(1)
      expect(mockOnDelete).toHaveBeenCalledWith('member-1')
    })
  })

  // Deleting State
  describe('deleting state', () => {
    it('passes isDeleting to correct member card', () => {
      render(<TeamMemberList {...defaultProps} deletingMemberId="member-2" />)

      // The second card should show deleting state
      expect(screen.getByText(/מוחק|deleting/i)).toBeInTheDocument()
    })

    it('does not show deleting state for other members', () => {
      render(<TeamMemberList {...defaultProps} deletingMemberId="member-2" />)

      // Count delete buttons - member-2's should be disabled
      const deleteButtons = screen.getAllByRole('button', { name: /delete|מחיקה/i })
      // Two should be enabled, one disabled
      const enabledButtons = deleteButtons.filter((btn) => !btn.hasAttribute('disabled'))
      expect(enabledButtons).toHaveLength(2)
    })
  })

  // Header
  describe('header', () => {
    it('shows title', () => {
      render(<TeamMemberList {...defaultProps} />)
      expect(screen.getByRole('heading', { name: /team|צוות/i })).toBeInTheDocument()
    })

    it('shows member count', () => {
      render(<TeamMemberList {...defaultProps} />)
      expect(screen.getByText(/3/)).toBeInTheDocument()
    })

    it('shows singular text for 1 member', () => {
      render(<TeamMemberList {...defaultProps} members={[mockTeamMembers[0]]} />)
      expect(screen.getByText(/1.*member|1.*חבר/i)).toBeInTheDocument()
    })

    it('shows plural text for multiple members', () => {
      render(<TeamMemberList {...defaultProps} />)
      expect(screen.getByText(/3.*members|3.*חברי/i)).toBeInTheDocument()
    })
  })

  // Accessibility
  describe('accessibility', () => {
    it('has heading for section', () => {
      render(<TeamMemberList {...defaultProps} />)
      // May have multiple headings, check at least one exists
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThanOrEqual(1)
    })

    it('add button has accessible name', () => {
      render(<TeamMemberList {...defaultProps} />)
      expect(screen.getByRole('button', { name: /add|הוסף/i })).toBeInTheDocument()
    })

    it('uses list semantics', () => {
      render(<TeamMemberList {...defaultProps} />)
      // The container should use grid or list layout
      expect(screen.getByTestId('member-list')).toBeInTheDocument()
    })
  })

  // Grid Layout
  describe('layout', () => {
    it('renders in grid layout', () => {
      render(<TeamMemberList {...defaultProps} />)
      const list = screen.getByTestId('member-list')
      expect(list).toHaveClass('grid')
    })
  })
})

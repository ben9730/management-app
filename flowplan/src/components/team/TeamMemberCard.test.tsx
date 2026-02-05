/**
 * TeamMemberCard Component Tests (TDD)
 *
 * Displays a single team member's information with edit/delete actions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamMemberCard } from './TeamMemberCard'
import type { TeamMember } from '@/types/entities'

// Mock team member data
const mockTeamMember: TeamMember = {
  id: 'member-1',
  user_id: 'user-1',
  project_id: 'project-1',
  first_name: 'Israel',
  last_name: 'Cohen',
  email: 'israel@example.com',
  employment_type: 'full_time',
  work_hours_per_day: 8,
  work_days: [0, 1, 2, 3, 4], // Sun-Thu (Israeli work week)
  role: 'member',
  hourly_rate: 150,
  created_at: new Date('2024-01-15'),
}

const mockOnEdit = vi.fn()
const mockOnDelete = vi.fn()

const defaultProps = {
  member: mockTeamMember,
  onEdit: mockOnEdit,
  onDelete: mockOnDelete,
}

describe('TeamMemberCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Basic Rendering
  describe('rendering', () => {
    it('renders member name', () => {
      render(<TeamMemberCard {...defaultProps} />)
      expect(screen.getByText('Israel Cohen')).toBeInTheDocument()
    })

    it('renders member email', () => {
      render(<TeamMemberCard {...defaultProps} />)
      expect(screen.getByText('israel@example.com')).toBeInTheDocument()
    })

    it('renders member role', () => {
      render(<TeamMemberCard {...defaultProps} />)
      expect(screen.getByText(/member/i)).toBeInTheDocument()
    })

    it('renders work hours per day', () => {
      render(<TeamMemberCard {...defaultProps} />)
      expect(screen.getByText(/8/)).toBeInTheDocument()
    })

    it('renders work days summary', () => {
      render(<TeamMemberCard {...defaultProps} />)
      // Should show "Sun-Thu" or Hebrew equivalent
      expect(screen.getByTestId('work-days')).toBeInTheDocument()
    })

    it('renders edit button', () => {
      render(<TeamMemberCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /edit|עריכה/i })).toBeInTheDocument()
    })

    it('renders delete button', () => {
      render(<TeamMemberCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /delete|מחיקה/i })).toBeInTheDocument()
    })
  })

  // Role Display
  describe('role display', () => {
    it('displays admin role correctly', () => {
      const adminMember = { ...mockTeamMember, role: 'admin' as const }
      render(<TeamMemberCard {...defaultProps} member={adminMember} />)
      expect(screen.getByText(/admin|מנהל/i)).toBeInTheDocument()
    })

    it('displays member role correctly', () => {
      render(<TeamMemberCard {...defaultProps} />)
      expect(screen.getByText(/member|חבר/i)).toBeInTheDocument()
    })
  })

  // Employment Type Display
  describe('employment type display', () => {
    it('displays full time employment type', () => {
      render(<TeamMemberCard {...defaultProps} />)
      expect(screen.getByText(/full.?time|משרה מלאה/i)).toBeInTheDocument()
    })

    it('displays part time employment type', () => {
      const partTimeMember = { ...mockTeamMember, employment_type: 'part_time' as const }
      render(<TeamMemberCard {...defaultProps} member={partTimeMember} />)
      expect(screen.getByText(/part.?time|משרה חלקית/i)).toBeInTheDocument()
    })

    it('displays contractor employment type', () => {
      const contractorMember = { ...mockTeamMember, employment_type: 'contractor' as const }
      render(<TeamMemberCard {...defaultProps} member={contractorMember} />)
      expect(screen.getByText(/contractor|קבלן/i)).toBeInTheDocument()
    })
  })

  // Work Schedule Display
  describe('work schedule display', () => {
    it('displays work hours in format "Xh/day"', () => {
      render(<TeamMemberCard {...defaultProps} />)
      expect(screen.getByText(/8.*שעות|8h/i)).toBeInTheDocument()
    })

    it('displays partial work hours correctly', () => {
      const partTimeMember = { ...mockTeamMember, work_hours_per_day: 4.5 }
      render(<TeamMemberCard {...defaultProps} member={partTimeMember} />)
      expect(screen.getByText(/4\.5/)).toBeInTheDocument()
    })

    it('displays work days correctly for Israeli week (Sun-Thu)', () => {
      render(<TeamMemberCard {...defaultProps} />)
      const workDays = screen.getByTestId('work-days')
      // Should contain indication of Sunday to Thursday
      expect(workDays).toHaveTextContent(/א|sun/i)
    })

    it('displays work days correctly for Western week (Mon-Fri)', () => {
      const westernMember = { ...mockTeamMember, work_days: [1, 2, 3, 4, 5] }
      render(<TeamMemberCard {...defaultProps} member={westernMember} />)
      const workDays = screen.getByTestId('work-days')
      expect(workDays).toBeInTheDocument()
    })
  })

  // Hourly Rate Display
  describe('hourly rate display', () => {
    it('displays hourly rate when available', () => {
      render(<TeamMemberCard {...defaultProps} />)
      expect(screen.getByText(/150/)).toBeInTheDocument()
    })

    it('does not show hourly rate section when null', () => {
      const memberNoRate = { ...mockTeamMember, hourly_rate: null }
      render(<TeamMemberCard {...defaultProps} member={memberNoRate} />)
      // Should not crash and should not display rate
      expect(screen.queryByText(/תעריף|rate/i)).not.toBeInTheDocument()
    })
  })

  // Actions
  describe('actions', () => {
    it('calls onEdit with member when edit button clicked', async () => {
      const user = userEvent.setup()
      render(<TeamMemberCard {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /edit|עריכה/i }))

      expect(mockOnEdit).toHaveBeenCalledTimes(1)
      expect(mockOnEdit).toHaveBeenCalledWith(mockTeamMember)
    })

    it('calls onDelete with member id when delete button clicked', async () => {
      const user = userEvent.setup()
      render(<TeamMemberCard {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /delete|מחיקה/i }))

      expect(mockOnDelete).toHaveBeenCalledTimes(1)
      expect(mockOnDelete).toHaveBeenCalledWith('member-1')
    })
  })

  // Loading/Disabled States
  describe('disabled state', () => {
    it('disables edit button when isDeleting is true', () => {
      render(<TeamMemberCard {...defaultProps} isDeleting />)
      expect(screen.getByRole('button', { name: /edit|עריכה/i })).toBeDisabled()
    })

    it('disables delete button when isDeleting is true', () => {
      render(<TeamMemberCard {...defaultProps} isDeleting />)
      expect(screen.getByRole('button', { name: /delete|מחיקה/i })).toBeDisabled()
    })

    it('shows loading state on delete button when isDeleting', () => {
      render(<TeamMemberCard {...defaultProps} isDeleting />)
      expect(screen.getByText(/מוחק|deleting/i)).toBeInTheDocument()
    })
  })

  // Accessibility
  describe('accessibility', () => {
    it('has article role for card', () => {
      render(<TeamMemberCard {...defaultProps} />)
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('edit button has accessible name', () => {
      render(<TeamMemberCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /edit|עריכה/i })).toBeInTheDocument()
    })

    it('delete button has accessible name', () => {
      render(<TeamMemberCard {...defaultProps} />)
      expect(screen.getByRole('button', { name: /delete|מחיקה/i })).toBeInTheDocument()
    })
  })

  // Edge Cases
  describe('edge cases', () => {
    it('handles member with empty work_days array', () => {
      const memberNoWorkDays = { ...mockTeamMember, work_days: [] }
      render(<TeamMemberCard {...defaultProps} member={memberNoWorkDays} />)
      // Should render without crashing
      expect(screen.getByText('Israel Cohen')).toBeInTheDocument()
    })

    it('handles member with single work day', () => {
      const memberOneDay = { ...mockTeamMember, work_days: [0] } // Only Sunday
      render(<TeamMemberCard {...defaultProps} member={memberOneDay} />)
      expect(screen.getByTestId('work-days')).toBeInTheDocument()
    })

    it('handles long names gracefully', () => {
      const longNameMember = {
        ...mockTeamMember,
        first_name: 'Verylongfirstname',
        last_name: 'Verylonglastname',
      }
      render(<TeamMemberCard {...defaultProps} member={longNameMember} />)
      expect(screen.getByText('Verylongfirstname Verylonglastname')).toBeInTheDocument()
    })
  })
})

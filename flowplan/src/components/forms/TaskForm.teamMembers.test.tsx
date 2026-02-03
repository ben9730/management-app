/**
 * TaskForm Team Members Display Tests (TDD)
 *
 * Tests to verify the assignee dropdown displays correctly
 * when team members are provided.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskForm } from './TaskForm'
import type { TeamMember } from '@/types/entities'

const mockOnSubmit = vi.fn()
const mockOnCancel = vi.fn()

const defaultProps = {
  onSubmit: mockOnSubmit,
  onCancel: mockOnCancel,
}

// Sample team members for testing
const mockTeamMembers: TeamMember[] = [
  {
    id: 'member-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    display_name: 'John Doe',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    avatar_url: null,
    role: 'member',
    employment_type: 'full_time',
    work_hours_per_day: 8,
    work_days: [0, 1, 2, 3, 4],
    hourly_rate: 50,
    weekly_capacity_hours: 40,
    skills: [],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    project_id: null,
  },
  {
    id: 'member-2',
    organization_id: 'org-1',
    user_id: 'user-2',
    display_name: 'Jane Smith',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    avatar_url: null,
    role: 'admin',
    employment_type: 'full_time',
    work_hours_per_day: 8,
    work_days: [0, 1, 2, 3, 4],
    hourly_rate: 75,
    weekly_capacity_hours: 40,
    skills: [],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    project_id: null,
  },
]

describe('TaskForm Team Members Display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('assignee dropdown visibility', () => {
    it('renders assignee dropdown when teamMembers prop is provided with members', () => {
      render(<TaskForm {...defaultProps} teamMembers={mockTeamMembers} />)

      expect(screen.getByLabelText(/assignee/i)).toBeInTheDocument()
    })

    it('does not render assignee dropdown when teamMembers is undefined', () => {
      render(<TaskForm {...defaultProps} />)

      expect(screen.queryByLabelText(/assignee/i)).not.toBeInTheDocument()
    })

    it('does not render assignee dropdown when teamMembers is empty array', () => {
      render(<TaskForm {...defaultProps} teamMembers={[]} />)

      expect(screen.queryByLabelText(/assignee/i)).not.toBeInTheDocument()
    })

    it('renders assignee dropdown with correct options', () => {
      render(<TaskForm {...defaultProps} teamMembers={mockTeamMembers} />)

      const select = screen.getByLabelText(/assignee/i)
      expect(select).toBeInTheDocument()

      // Should have unassigned option plus team members
      expect(screen.getByText('Unassigned')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('uses display_name for team member options', () => {
      const membersWithDisplayNames: TeamMember[] = [
        {
          ...mockTeamMembers[0],
          display_name: 'Johnny D',
          first_name: 'John',
          last_name: 'Doe',
        },
      ]

      render(<TaskForm {...defaultProps} teamMembers={membersWithDisplayNames} />)

      expect(screen.getByText('Johnny D')).toBeInTheDocument()
    })

    it('falls back to first_name + last_name when display_name is empty', () => {
      const membersWithoutDisplayName: TeamMember[] = [
        {
          ...mockTeamMembers[0],
          display_name: '',
          first_name: 'John',
          last_name: 'Doe',
        },
      ]

      render(<TaskForm {...defaultProps} teamMembers={membersWithoutDisplayName} />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('falls back to email when no name is available', () => {
      const membersWithOnlyEmail: TeamMember[] = [
        {
          ...mockTeamMembers[0],
          display_name: '',
          first_name: '',
          last_name: '',
          email: 'john@example.com',
        },
      ]

      render(<TaskForm {...defaultProps} teamMembers={membersWithOnlyEmail} />)

      expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })
  })

  describe('assignee selection with single team member', () => {
    it('renders assignee dropdown with single team member', () => {
      render(<TaskForm {...defaultProps} teamMembers={[mockTeamMembers[0]]} />)

      expect(screen.getByLabelText(/assignee/i)).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })
})

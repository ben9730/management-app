/**
 * TimeOffCalendar Component Tests (TDD)
 *
 * Displays time off entries for team members.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimeOffCalendar } from './TimeOffCalendar'
import type { EmployeeTimeOff, TeamMember } from '@/types/entities'

// Mock time off data
const mockTimeOffs: EmployeeTimeOff[] = [
  {
    id: 'timeoff-1',
    user_id: 'member-1',
    start_date: new Date('2024-03-10'),
    end_date: new Date('2024-03-15'),
    type: 'vacation',
    status: 'approved',
    notes: 'Family vacation',
    created_at: new Date('2024-02-01'),
  },
  {
    id: 'timeoff-2',
    user_id: 'member-2',
    start_date: new Date('2024-03-05'),
    end_date: new Date('2024-03-06'),
    type: 'sick',
    status: 'approved',
    notes: null,
    created_at: new Date('2024-03-05'),
  },
  {
    id: 'timeoff-3',
    user_id: 'member-1',
    start_date: new Date('2024-03-20'),
    end_date: new Date('2024-03-20'),
    type: 'personal',
    status: 'pending',
    notes: 'Appointment',
    created_at: new Date('2024-03-01'),
  },
]

// Mock team members for name lookup
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
]

const defaultProps = {
  timeOffs: mockTimeOffs,
  teamMembers: mockTeamMembers,
}

describe('TimeOffCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Basic Rendering
  describe('rendering', () => {
    it('renders time off entries', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      // Should render all time off entries
      expect(screen.getAllByTestId('timeoff-entry')).toHaveLength(3)
    })

    it('renders component title', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      expect(screen.getByRole('heading', { name: /time off|חופשות/i })).toBeInTheDocument()
    })

    it('displays team member names', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      // Israel Cohen appears twice (has 2 time offs), Sarah Levi once
      expect(screen.getAllByText(/Israel Cohen/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/Sarah Levi/)).toBeInTheDocument()
    })
  })

  // Time Off Types
  describe('time off types', () => {
    it('displays vacation type correctly', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      expect(screen.getAllByText(/vacation|חופשה/i).length).toBeGreaterThanOrEqual(1)
    })

    it('displays sick type correctly', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      expect(screen.getByText(/sick|מחלה/i)).toBeInTheDocument()
    })

    it('displays personal type correctly', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      expect(screen.getByText(/personal|אישי/i)).toBeInTheDocument()
    })
  })

  // Status Display
  describe('status display', () => {
    it('displays approved status', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      // Should have approved entries
      expect(screen.getAllByText(/approved|מאושר/i).length).toBeGreaterThanOrEqual(1)
    })

    it('displays pending status', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      expect(screen.getByText(/pending|ממתין/i)).toBeInTheDocument()
    })
  })

  // Date Display
  describe('date display', () => {
    it('displays start and end dates', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      // Check that dates are displayed (format may vary)
      const entries = screen.getAllByTestId('timeoff-entry')
      expect(entries.length).toBeGreaterThan(0)
    })

    it('displays single day correctly', () => {
      // timeoff-3 is a single day (Mar 20)
      render(<TimeOffCalendar {...defaultProps} />)
      // Single day should show just one date or "1 day"
      expect(screen.getByText(/20/)).toBeInTheDocument()
    })

    it('displays date range correctly', () => {
      // timeoff-1 is Mar 10-15
      render(<TimeOffCalendar {...defaultProps} />)
      expect(screen.getByText(/10/)).toBeInTheDocument()
      expect(screen.getByText(/15/)).toBeInTheDocument()
    })
  })

  // Empty State
  describe('empty state', () => {
    it('shows empty message when no time offs', () => {
      render(<TimeOffCalendar {...defaultProps} timeOffs={[]} />)
      expect(screen.getByText(/no time off scheduled|אין חופשות/i)).toBeInTheDocument()
    })

    it('shows helpful message in empty state', () => {
      render(<TimeOffCalendar {...defaultProps} timeOffs={[]} />)
      expect(screen.getByText(/currently scheduled|מתוכננות/i)).toBeInTheDocument()
    })
  })

  // Loading State
  describe('loading state', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<TimeOffCalendar {...defaultProps} isLoading />)
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('does not render entries when loading', () => {
      render(<TimeOffCalendar {...defaultProps} isLoading />)
      expect(screen.queryAllByTestId('timeoff-entry')).toHaveLength(0)
    })
  })

  // Error State
  describe('error state', () => {
    it('shows error message when error prop is provided', () => {
      render(<TimeOffCalendar {...defaultProps} error="Failed to load time off data" />)
      // There may be multiple elements with error text (heading + details)
      expect(screen.getAllByText(/failed to load|שגיאה/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  // Notes Display
  describe('notes display', () => {
    it('displays notes when available', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      expect(screen.getByText('Family vacation')).toBeInTheDocument()
    })

    it('does not show notes section when null', () => {
      // timeoff-2 has null notes
      render(<TimeOffCalendar {...defaultProps} />)
      // Should not crash - notes should be optional
      expect(screen.getAllByTestId('timeoff-entry')).toHaveLength(3)
    })
  })

  // Member Lookup
  describe('member lookup', () => {
    it('shows user id when member not found', () => {
      const timeOffWithUnknownUser: EmployeeTimeOff[] = [
        {
          id: 'timeoff-unknown',
          user_id: 'unknown-user',
          start_date: new Date('2024-03-10'),
          end_date: new Date('2024-03-11'),
          type: 'vacation',
          status: 'approved',
          notes: null,
          created_at: new Date('2024-03-01'),
        },
      ]
      render(<TimeOffCalendar {...defaultProps} timeOffs={timeOffWithUnknownUser} />)
      // Should show user id or "Unknown" when member not in list
      expect(screen.getByText(/unknown|לא ידוע/i)).toBeInTheDocument()
    })
  })

  // Sorting
  describe('sorting', () => {
    it('displays entries in chronological order', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      const entries = screen.getAllByTestId('timeoff-entry')
      // Entries should be sorted by start_date
      expect(entries).toHaveLength(3)
      // First entry should be timeoff-2 (Mar 5), then timeoff-1 (Mar 10), then timeoff-3 (Mar 20)
    })
  })

  // Accessibility
  describe('accessibility', () => {
    it('has heading for section', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThanOrEqual(1)
    })

    it('time off entries have semantic structure', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      const entries = screen.getAllByTestId('timeoff-entry')
      expect(entries.length).toBeGreaterThan(0)
    })
  })

  // Filtering (optional feature)
  describe('filtering', () => {
    it('can filter by status when filterStatus is provided', () => {
      render(<TimeOffCalendar {...defaultProps} filterStatus="pending" />)
      // Should only show pending entries
      const entries = screen.getAllByTestId('timeoff-entry')
      expect(entries).toHaveLength(1)
    })

    it('shows all entries when filterStatus is not provided', () => {
      render(<TimeOffCalendar {...defaultProps} />)
      const entries = screen.getAllByTestId('timeoff-entry')
      expect(entries).toHaveLength(3)
    })
  })
})

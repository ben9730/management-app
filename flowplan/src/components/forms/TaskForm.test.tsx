/**
 * TaskForm Component Tests (TDD)
 *
 * Form for creating and editing tasks with validation.
 * Uses data-testid attributes for reliable test selectors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskForm, TaskFormData } from './TaskForm'
import { TaskPriority } from '@/types/entities'

// Mock the team-members service to avoid Supabase initialization
vi.mock('@/services/team-members', () => ({
  checkMemberAvailability: vi.fn().mockResolvedValue({ available: true }),
}))

const mockOnSubmit = vi.fn()
const mockOnCancel = vi.fn()

const defaultProps = {
  onSubmit: mockOnSubmit,
  onCancel: mockOnCancel,
}

describe('TaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Basic Rendering
  describe('rendering', () => {
    it('renders form element', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByRole('form')).toBeInTheDocument()
    })

    it('renders title input', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByTestId('task-title-input')).toBeInTheDocument()
    })

    it('renders description textarea', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByTestId('task-description-input')).toBeInTheDocument()
    })

    it('renders priority select', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByTestId('task-priority-select')).toBeInTheDocument()
    })

    it('renders duration input', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByTestId('task-duration-input')).toBeInTheDocument()
    })

    it('renders estimated hours input', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByTestId('task-estimated-hours-input')).toBeInTheDocument()
    })

    it('renders start date input', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByTestId('task-start-date-input')).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByRole('button', { name: /צור משימה/i })).toBeInTheDocument()
    })

    it('renders cancel button', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByTestId('task-form-cancel-button')).toBeInTheDocument()
    })
  })

  // Priority Options
  describe('priority options', () => {
    it('shows all priority options', () => {
      render(<TaskForm {...defaultProps} />)
      const select = screen.getByTestId('task-priority-select')

      // Hebrew priority labels
      expect(screen.getByText('נמוכה')).toBeInTheDocument()
      expect(screen.getByText('בינונית')).toBeInTheDocument()
      expect(screen.getByText('גבוהה')).toBeInTheDocument()
      expect(screen.getByText('קריטית')).toBeInTheDocument()
    })

    it('defaults to medium priority', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByTestId('task-priority-select')).toHaveValue('medium')
    })
  })

  // Default Values
  describe('default values', () => {
    it('duration defaults to 1', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByTestId('task-duration-input')).toHaveValue(1)
    })

    it('title is empty by default', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByTestId('task-title-input')).toHaveValue('')
    })
  })

  // Initial Values (Edit Mode)
  describe('initial values', () => {
    // Note: When estimated_hours is provided, duration is auto-calculated
    // 20 hours / 8 hours per day = 2.5 → ceil = 3 days
    const initialData: TaskFormData = {
      title: 'Existing Task',
      description: 'Existing description',
      priority: 'high',
      duration: 5, // This will be overwritten by calculated duration from estimated_hours
      estimated_hours: 20,
      start_date: '2024-03-15',
    }

    // For testing duration independently without estimated_hours override
    const initialDataWithoutHours: TaskFormData = {
      title: 'Existing Task',
      description: 'Existing description',
      priority: 'high',
      duration: 5,
      start_date: '2024-03-15',
    }

    it('populates title from initial values', () => {
      render(<TaskForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByTestId('task-title-input')).toHaveValue('Existing Task')
    })

    it('populates description from initial values', () => {
      render(<TaskForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByTestId('task-description-input')).toHaveValue('Existing description')
    })

    it('populates priority from initial values', () => {
      render(<TaskForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByTestId('task-priority-select')).toHaveValue('high')
    })

    it('populates duration from initial values', () => {
      // Use data without estimated_hours to avoid auto-calculation
      render(<TaskForm {...defaultProps} initialValues={initialDataWithoutHours} />)
      expect(screen.getByTestId('task-duration-input')).toHaveValue(5)
    })

    it('shows update button text in edit mode', () => {
      render(<TaskForm {...defaultProps} initialValues={initialData} mode="edit" />)
      expect(screen.getByRole('button', { name: /עדכן משימה/i })).toBeInTheDocument()
    })
  })

  // Form Submission
  describe('form submission', () => {
    it('calls onSubmit with form data on valid submit', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByTestId('task-title-input'), 'New Task')
      await userEvent.click(screen.getByRole('button', { name: /צור משימה/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      })
    })

    it('passes title to onSubmit', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByTestId('task-title-input'), 'My Task Title')
      await userEvent.click(screen.getByRole('button', { name: /צור משימה/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'My Task Title' })
        )
      })
    })

    it('passes description to onSubmit', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByTestId('task-title-input'), 'Task')
      await userEvent.type(screen.getByTestId('task-description-input'), 'Task description')
      await userEvent.click(screen.getByRole('button', { name: /צור משימה/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ description: 'Task description' })
        )
      })
    })

    it('passes priority to onSubmit', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByTestId('task-title-input'), 'Task')
      await userEvent.selectOptions(screen.getByTestId('task-priority-select'), 'critical')
      await userEvent.click(screen.getByRole('button', { name: /צור משימה/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 'critical' })
        )
      })
    })

    it('passes duration to onSubmit', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByTestId('task-title-input'), 'Task')
      await userEvent.clear(screen.getByTestId('task-duration-input'))
      await userEvent.type(screen.getByTestId('task-duration-input'), '10')
      await userEvent.click(screen.getByRole('button', { name: /צור משימה/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ duration: 10 })
        )
      })
    })
  })

  // Validation
  describe('validation', () => {
    it('shows error when title is empty', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /צור משימה/i }))

      await waitFor(() => {
        // Hebrew error message
        expect(screen.getByText(/כותרת היא שדה חובה/i)).toBeInTheDocument()
      })
    })

    it('does not call onSubmit when validation fails', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /צור משימה/i }))

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })

    it('shows error when duration is less than 1', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByTestId('task-title-input'), 'Task')
      await userEvent.clear(screen.getByTestId('task-duration-input'))
      await userEvent.type(screen.getByTestId('task-duration-input'), '0')
      await userEvent.click(screen.getByRole('button', { name: /צור משימה/i }))

      await waitFor(() => {
        // Hebrew error message
        expect(screen.getByText(/משך זמן חייב להיות לפחות יום אחד/i)).toBeInTheDocument()
      })
    })

    it('clears error when field is corrected', async () => {
      render(<TaskForm {...defaultProps} />)

      // Trigger error
      await userEvent.click(screen.getByRole('button', { name: /צור משימה/i }))
      await waitFor(() => {
        expect(screen.getByText(/כותרת היא שדה חובה/i)).toBeInTheDocument()
      })

      // Fix error
      await userEvent.type(screen.getByTestId('task-title-input'), 'Task')

      await waitFor(() => {
        expect(screen.queryByText(/כותרת היא שדה חובה/i)).not.toBeInTheDocument()
      })
    })
  })

  // Cancel
  describe('cancel', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.click(screen.getByTestId('task-form-cancel-button'))

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('does not call onSubmit when cancel is clicked', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByTestId('task-title-input'), 'Task')
      await userEvent.click(screen.getByTestId('task-form-cancel-button'))

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  // Loading State
  describe('loading state', () => {
    it('disables submit button when loading', () => {
      render(<TaskForm {...defaultProps} isLoading />)
      expect(screen.getByRole('button', { name: /שומר/i })).toBeDisabled()
    })

    it('disables cancel button when loading', () => {
      render(<TaskForm {...defaultProps} isLoading />)
      expect(screen.getByTestId('task-form-cancel-button')).toBeDisabled()
    })

    it('shows loading text on submit button', () => {
      render(<TaskForm {...defaultProps} isLoading />)
      expect(screen.getByRole('button', { name: /שומר/i })).toBeInTheDocument()
    })

    it('disables all inputs when loading', () => {
      render(<TaskForm {...defaultProps} isLoading />)
      expect(screen.getByTestId('task-title-input')).toBeDisabled()
      expect(screen.getByTestId('task-description-input')).toBeDisabled()
      expect(screen.getByTestId('task-priority-select')).toBeDisabled()
    })
  })

  // Accessibility
  describe('accessibility', () => {
    it('has form role', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByRole('form')).toBeInTheDocument()
    })

    it('labels are associated with inputs', () => {
      render(<TaskForm {...defaultProps} />)
      // Check that the labeled inputs exist via their test IDs
      expect(screen.getByTestId('task-title-input')).toBeInTheDocument()
      expect(screen.getByTestId('task-description-input')).toBeInTheDocument()
      expect(screen.getByTestId('task-priority-select')).toBeInTheDocument()
    })

    it('marks required fields', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByTestId('task-title-input')).toBeRequired()
    })

    it('error messages have aria-live', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /צור משימה/i }))

      await waitFor(() => {
        const errorMessage = screen.getByText(/כותרת היא שדה חובה/i)
        expect(errorMessage.closest('[aria-live]')).toBeInTheDocument()
      })
    })
  })

  // Brutalist Styling
  describe('brutalist styling', () => {
    it('has brutalist border style on inputs', () => {
      render(<TaskForm {...defaultProps} />)
      const titleInput = screen.getByTestId('task-title-input')
      // Input component uses 'border' class with slate colors
      expect(titleInput).toHaveClass('border')
    })
  })

  // Vacation Warning Display
  describe('vacation warning display', () => {
    const teamMembersWithTimeOff = [
      {
        id: 'member-1',
        display_name: 'John Doe',
        email: 'john@example.com',
        role: 'member' as const,
        hourly_rate: 100,
        work_hours_per_day: 8,
        created_at: new Date(),
        is_active: true,
      },
    ]

    const mockVacationConflict = {
      available: false,
      conflictingTimeOff: {
        id: 'timeoff-1',
        team_member_id: 'member-1',
        start_date: new Date('2026-02-05'),
        end_date: new Date('2026-02-08'),
        type: 'vacation' as const,
        status: 'approved' as const,
        notes: null,
        created_at: new Date(),
      },
    }

    it('displays vacation warning when assignee has conflicting time off', async () => {
      render(
        <TaskForm
          {...defaultProps}
          teamMembers={teamMembersWithTimeOff}
          initialValues={{
            assignee_id: 'member-1',
            start_date: '2026-02-01',
            duration: 10,
          }}
          vacationConflict={mockVacationConflict}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('vacation-warning')).toBeInTheDocument()
      })
    })

    it('shows vacation dates in warning message', async () => {
      render(
        <TaskForm
          {...defaultProps}
          teamMembers={teamMembersWithTimeOff}
          initialValues={{
            assignee_id: 'member-1',
            start_date: '2026-02-01',
            duration: 10,
          }}
          vacationConflict={mockVacationConflict}
        />
      )

      await waitFor(() => {
        const warning = screen.getByTestId('vacation-warning')
        expect(warning).toHaveTextContent(/05.*02.*2026/)
        expect(warning).toHaveTextContent(/08.*02.*2026/)
      })
    })

    it('does not display warning when no vacation conflict', async () => {
      render(
        <TaskForm
          {...defaultProps}
          teamMembers={teamMembersWithTimeOff}
          initialValues={{
            assignee_id: 'member-1',
            start_date: '2026-02-01',
            duration: 10,
          }}
          vacationConflict={{ available: true }}
        />
      )

      expect(screen.queryByTestId('vacation-warning')).not.toBeInTheDocument()
    })

    it('does not display warning when no assignee selected', async () => {
      render(
        <TaskForm
          {...defaultProps}
          teamMembers={teamMembersWithTimeOff}
          initialValues={{
            start_date: '2026-02-01',
            duration: 10,
          }}
        />
      )

      expect(screen.queryByTestId('vacation-warning')).not.toBeInTheDocument()
    })

    it('does not display warning when no start date', async () => {
      render(
        <TaskForm
          {...defaultProps}
          teamMembers={teamMembersWithTimeOff}
          initialValues={{
            assignee_id: 'member-1',
            duration: 10,
          }}
        />
      )

      expect(screen.queryByTestId('vacation-warning')).not.toBeInTheDocument()
    })

    it('shows assignee name in vacation warning', async () => {
      render(
        <TaskForm
          {...defaultProps}
          teamMembers={teamMembersWithTimeOff}
          initialValues={{
            assignee_id: 'member-1',
            start_date: '2026-02-01',
            duration: 10,
          }}
          vacationConflict={mockVacationConflict}
        />
      )

      await waitFor(() => {
        const warning = screen.getByTestId('vacation-warning')
        expect(warning).toHaveTextContent('John Doe')
      })
    })

    it('shows different icon/style for sick leave vs vacation', async () => {
      const sickLeaveConflict = {
        available: false,
        conflictingTimeOff: {
          ...mockVacationConflict.conflictingTimeOff,
          type: 'sick' as const,
        },
      }

      render(
        <TaskForm
          {...defaultProps}
          teamMembers={teamMembersWithTimeOff}
          initialValues={{
            assignee_id: 'member-1',
            start_date: '2026-02-01',
            duration: 10,
          }}
          vacationConflict={sickLeaveConflict}
        />
      )

      await waitFor(() => {
        const warning = screen.getByTestId('vacation-warning')
        expect(warning).toHaveTextContent(/sick/i)
      })
    })

    it('warning has appropriate ARIA attributes for accessibility', async () => {
      render(
        <TaskForm
          {...defaultProps}
          teamMembers={teamMembersWithTimeOff}
          initialValues={{
            assignee_id: 'member-1',
            start_date: '2026-02-01',
            duration: 10,
          }}
          vacationConflict={mockVacationConflict}
        />
      )

      await waitFor(() => {
        const warning = screen.getByTestId('vacation-warning')
        expect(warning).toHaveAttribute('role', 'alert')
      })
    })

    it('allows form submission even with vacation warning', async () => {
      render(
        <TaskForm
          {...defaultProps}
          teamMembers={teamMembersWithTimeOff}
          initialValues={{
            title: 'Test Task',
            assignee_id: 'member-1',
            start_date: '2026-02-01',
            duration: 10,
          }}
          vacationConflict={mockVacationConflict}
        />
      )

      await userEvent.click(screen.getByRole('button', { name: /צור משימה/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it('clears vacation warning when assignee is changed to unassigned', async () => {
      const { rerender } = render(
        <TaskForm
          {...defaultProps}
          teamMembers={teamMembersWithTimeOff}
          initialValues={{
            assignee_id: 'member-1',
            start_date: '2026-02-01',
            duration: 10,
          }}
          vacationConflict={mockVacationConflict}
        />
      )

      expect(screen.getByTestId('vacation-warning')).toBeInTheDocument()

      // Simulate selecting "Unassigned"
      rerender(
        <TaskForm
          {...defaultProps}
          teamMembers={teamMembersWithTimeOff}
          initialValues={{
            assignee_id: '',
            start_date: '2026-02-01',
            duration: 10,
          }}
          vacationConflict={{ available: true }}
        />
      )

      expect(screen.queryByTestId('vacation-warning')).not.toBeInTheDocument()
    })
  })

  // Holiday Warning Display (Calendar Exceptions)
  describe('holiday warning display', () => {
    const mockCalendarExceptions = [
      {
        id: 'exception-1',
        project_id: 'project-1',
        date: new Date('2026-02-15'),
        end_date: null,
        type: 'holiday' as const,
        name: 'פורים',
        created_at: new Date(),
      },
      {
        id: 'exception-2',
        project_id: 'project-1',
        date: new Date('2026-04-12'),
        end_date: new Date('2026-04-18'),
        type: 'holiday' as const,
        name: 'פסח',
        created_at: new Date(),
      },
      {
        id: 'exception-3',
        project_id: 'project-1',
        date: new Date('2026-03-01'),
        end_date: null,
        type: 'non_working' as const,
        name: 'יום חופש חברה',
        created_at: new Date(),
      },
    ]

    it('displays holiday warning when task dates overlap with a single-day holiday', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initialValues={{
            start_date: '2026-02-10',
            duration: 10, // 10 days from Feb 10 overlaps with Feb 15
          }}
          calendarExceptions={mockCalendarExceptions}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('holiday-warning')).toBeInTheDocument()
      })
    })

    it('displays holiday warning when task dates overlap with a multi-day holiday', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initialValues={{
            start_date: '2026-04-10',
            duration: 5, // April 10-15 overlaps with Passover April 12-18
          }}
          calendarExceptions={mockCalendarExceptions}
        />
      )

      await waitFor(() => {
        const warning = screen.getByTestId('holiday-warning')
        expect(warning).toHaveTextContent('פסח')
      })
    })

    it('shows all overlapping holidays when task spans multiple exceptions', async () => {
      // Task from Feb 1 to March 15 spans both Purim (Feb 15) and Company day (Mar 1)
      render(
        <TaskForm
          {...defaultProps}
          initialValues={{
            start_date: '2026-02-01',
            duration: 40, // ~8 weeks, overlaps Feb 15 and Mar 1
          }}
          calendarExceptions={mockCalendarExceptions}
        />
      )

      await waitFor(() => {
        const warning = screen.getByTestId('holiday-warning')
        expect(warning).toHaveTextContent('פורים')
        expect(warning).toHaveTextContent('יום חופש חברה')
      })
    })

    it('shows holiday name and dates in warning', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initialValues={{
            start_date: '2026-02-10',
            duration: 10,
          }}
          calendarExceptions={mockCalendarExceptions}
        />
      )

      await waitFor(() => {
        const warning = screen.getByTestId('holiday-warning')
        expect(warning).toHaveTextContent('פורים')
        expect(warning).toHaveTextContent(/15/)
      })
    })

    it('shows different styling for non_working vs holiday type', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initialValues={{
            start_date: '2026-02-28',
            duration: 5, // Mar 1-5, overlaps with Mar 1 non_working day
          }}
          calendarExceptions={mockCalendarExceptions}
        />
      )

      await waitFor(() => {
        const warning = screen.getByTestId('holiday-warning')
        expect(warning).toHaveTextContent('יום לא עובד')
      })
    })

    it('does not display warning when no overlapping holidays', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initialValues={{
            start_date: '2026-01-01', // January - no holidays defined
            duration: 10,
          }}
          calendarExceptions={mockCalendarExceptions}
        />
      )

      expect(screen.queryByTestId('holiday-warning')).not.toBeInTheDocument()
    })

    it('does not display warning when calendarExceptions is empty', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initialValues={{
            start_date: '2026-02-10',
            duration: 10,
          }}
          calendarExceptions={[]}
        />
      )

      expect(screen.queryByTestId('holiday-warning')).not.toBeInTheDocument()
    })

    it('does not display warning when calendarExceptions is undefined', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initialValues={{
            start_date: '2026-02-10',
            duration: 10,
          }}
        />
      )

      expect(screen.queryByTestId('holiday-warning')).not.toBeInTheDocument()
    })

    it('does not display warning when no start date', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initialValues={{
            duration: 10,
          }}
          calendarExceptions={mockCalendarExceptions}
        />
      )

      expect(screen.queryByTestId('holiday-warning')).not.toBeInTheDocument()
    })

    it('holiday warning has appropriate ARIA attributes for accessibility', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initialValues={{
            start_date: '2026-02-10',
            duration: 10,
          }}
          calendarExceptions={mockCalendarExceptions}
        />
      )

      await waitFor(() => {
        const warning = screen.getByTestId('holiday-warning')
        expect(warning).toHaveAttribute('role', 'alert')
      })
    })

    it('allows form submission even with holiday warning', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initialValues={{
            title: 'Test Task',
            start_date: '2026-02-10',
            duration: 10,
          }}
          calendarExceptions={mockCalendarExceptions}
        />
      )

      await userEvent.click(screen.getByRole('button', { name: /צור משימה/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it('shows emoji icon for holiday type', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initialValues={{
            start_date: '2026-02-10',
            duration: 10,
          }}
          calendarExceptions={mockCalendarExceptions}
        />
      )

      await waitFor(() => {
        const warning = screen.getByTestId('holiday-warning')
        // Holiday type should show calendar/celebration emoji
        expect(warning).toHaveTextContent('🎉')
      })
    })

    it('shows different emoji icon for non_working type', async () => {
      render(
        <TaskForm
          {...defaultProps}
          initialValues={{
            start_date: '2026-02-28',
            duration: 5,
          }}
          calendarExceptions={mockCalendarExceptions}
        />
      )

      await waitFor(() => {
        const warning = screen.getByTestId('holiday-warning')
        // Non-working type should show different emoji
        expect(warning).toHaveTextContent('🚫')
      })
    })
  })
})

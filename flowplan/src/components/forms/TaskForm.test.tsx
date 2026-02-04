/**
 * TaskForm Component Tests (TDD)
 *
 * Form for creating and editing tasks with validation.
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
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    })

    it('renders description textarea', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })

    it('renders priority select', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
    })

    it('renders duration input', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByLabelText(/duration/i)).toBeInTheDocument()
    })

    it('renders estimated hours input', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByLabelText(/estimated hours/i)).toBeInTheDocument()
    })

    it('renders start date input', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument()
    })

    it('renders cancel button', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  // Priority Options
  describe('priority options', () => {
    it('shows all priority options', () => {
      render(<TaskForm {...defaultProps} />)
      const select = screen.getByLabelText(/priority/i)

      expect(screen.getByText('Low')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
      expect(screen.getByText('High')).toBeInTheDocument()
      expect(screen.getByText('Critical')).toBeInTheDocument()
    })

    it('defaults to medium priority', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByLabelText(/priority/i)).toHaveValue('medium')
    })
  })

  // Default Values
  describe('default values', () => {
    it('duration defaults to 1', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByLabelText(/duration/i)).toHaveValue(1)
    })

    it('title is empty by default', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByLabelText(/title/i)).toHaveValue('')
    })
  })

  // Initial Values (Edit Mode)
  describe('initial values', () => {
    const initialData: TaskFormData = {
      title: 'Existing Task',
      description: 'Existing description',
      priority: 'high',
      duration: 5,
      estimated_hours: 20,
      start_date: '2024-03-15',
    }

    it('populates title from initial values', () => {
      render(<TaskForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/title/i)).toHaveValue('Existing Task')
    })

    it('populates description from initial values', () => {
      render(<TaskForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/description/i)).toHaveValue('Existing description')
    })

    it('populates priority from initial values', () => {
      render(<TaskForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/priority/i)).toHaveValue('high')
    })

    it('populates duration from initial values', () => {
      render(<TaskForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/duration/i)).toHaveValue(5)
    })

    it('shows update button text in edit mode', () => {
      render(<TaskForm {...defaultProps} initialValues={initialData} mode="edit" />)
      expect(screen.getByRole('button', { name: /update task/i })).toBeInTheDocument()
    })
  })

  // Form Submission
  describe('form submission', () => {
    it('calls onSubmit with form data on valid submit', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/title/i), 'New Task')
      await userEvent.click(screen.getByRole('button', { name: /create task/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      })
    })

    it('passes title to onSubmit', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/title/i), 'My Task Title')
      await userEvent.click(screen.getByRole('button', { name: /create task/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'My Task Title' })
        )
      })
    })

    it('passes description to onSubmit', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/title/i), 'Task')
      await userEvent.type(screen.getByLabelText(/description/i), 'Task description')
      await userEvent.click(screen.getByRole('button', { name: /create task/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ description: 'Task description' })
        )
      })
    })

    it('passes priority to onSubmit', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/title/i), 'Task')
      await userEvent.selectOptions(screen.getByLabelText(/priority/i), 'critical')
      await userEvent.click(screen.getByRole('button', { name: /create task/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 'critical' })
        )
      })
    })

    it('passes duration to onSubmit', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/title/i), 'Task')
      await userEvent.clear(screen.getByLabelText(/duration/i))
      await userEvent.type(screen.getByLabelText(/duration/i), '10')
      await userEvent.click(screen.getByRole('button', { name: /create task/i }))

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

      await userEvent.click(screen.getByRole('button', { name: /create task/i }))

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      })
    })

    it('does not call onSubmit when validation fails', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /create task/i }))

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })

    it('shows error when duration is less than 1', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/title/i), 'Task')
      await userEvent.clear(screen.getByLabelText(/duration/i))
      await userEvent.type(screen.getByLabelText(/duration/i), '0')
      await userEvent.click(screen.getByRole('button', { name: /create task/i }))

      await waitFor(() => {
        expect(screen.getByText(/duration must be at least 1/i)).toBeInTheDocument()
      })
    })

    it('clears error when field is corrected', async () => {
      render(<TaskForm {...defaultProps} />)

      // Trigger error
      await userEvent.click(screen.getByRole('button', { name: /create task/i }))
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      })

      // Fix error
      await userEvent.type(screen.getByLabelText(/title/i), 'Task')

      await waitFor(() => {
        expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument()
      })
    })
  })

  // Cancel
  describe('cancel', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('does not call onSubmit when cancel is clicked', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/title/i), 'Task')
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  // Loading State
  describe('loading state', () => {
    it('disables submit button when loading', () => {
      render(<TaskForm {...defaultProps} isLoading />)
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })

    it('disables cancel button when loading', () => {
      render(<TaskForm {...defaultProps} isLoading />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })

    it('shows loading text on submit button', () => {
      render(<TaskForm {...defaultProps} isLoading />)
      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()
    })

    it('disables all inputs when loading', () => {
      render(<TaskForm {...defaultProps} isLoading />)
      expect(screen.getByLabelText(/title/i)).toBeDisabled()
      expect(screen.getByLabelText(/description/i)).toBeDisabled()
      expect(screen.getByLabelText(/priority/i)).toBeDisabled()
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
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
    })

    it('marks required fields', () => {
      render(<TaskForm {...defaultProps} />)
      expect(screen.getByLabelText(/title/i)).toBeRequired()
    })

    it('error messages have aria-live', async () => {
      render(<TaskForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /create task/i }))

      await waitFor(() => {
        const errorMessage = screen.getByText(/title is required/i)
        expect(errorMessage.closest('[aria-live]')).toBeInTheDocument()
      })
    })
  })

  // Brutalist Styling
  describe('brutalist styling', () => {
    it('has brutalist border style on inputs', () => {
      render(<TaskForm {...defaultProps} />)
      const titleInput = screen.getByLabelText(/title/i)
      expect(titleInput).toHaveClass('border-2')
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

      // Use Hebrew text for the button
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
})

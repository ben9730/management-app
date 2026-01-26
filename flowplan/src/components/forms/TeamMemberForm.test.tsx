/**
 * TeamMemberForm Component Tests (TDD)
 *
 * Form for adding and editing team members with work schedule configuration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamMemberForm, TeamMemberFormData } from './TeamMemberForm'

const mockOnSubmit = vi.fn()
const mockOnCancel = vi.fn()

const defaultProps = {
  onSubmit: mockOnSubmit,
  onCancel: mockOnCancel,
}

describe('TeamMemberForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Basic Rendering
  describe('rendering', () => {
    it('renders form element', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByRole('form')).toBeInTheDocument()
    })

    it('renders name input', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    })

    it('renders email input', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('renders role select', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
    })

    it('renders employment type select', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByLabelText(/employment type/i)).toBeInTheDocument()
    })

    it('renders work hours input', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByLabelText(/work hours per day/i)).toBeInTheDocument()
    })

    it('renders hourly rate input', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByLabelText(/hourly rate/i)).toBeInTheDocument()
    })

    it('renders work days checkboxes', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByLabelText(/sunday/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/monday/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tuesday/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/wednesday/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/thursday/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/friday/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/saturday/i)).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument()
    })

    it('renders cancel button', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  // Role Options
  describe('role options', () => {
    it('shows all role options', () => {
      render(<TeamMemberForm {...defaultProps} />)

      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Member')).toBeInTheDocument()
    })

    it('defaults to member role', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByLabelText(/role/i)).toHaveValue('member')
    })
  })

  // Employment Type Options
  describe('employment type options', () => {
    it('shows all employment type options', () => {
      render(<TeamMemberForm {...defaultProps} />)

      expect(screen.getByText('Full Time')).toBeInTheDocument()
      expect(screen.getByText('Part Time')).toBeInTheDocument()
      expect(screen.getByText('Contractor')).toBeInTheDocument()
    })

    it('defaults to full time', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByLabelText(/employment type/i)).toHaveValue('full_time')
    })
  })

  // Default Values
  describe('default values', () => {
    it('work hours defaults to 8', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByLabelText(/work hours per day/i)).toHaveValue(8)
    })

    it('Israeli work week is selected by default (Sun-Thu)', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByLabelText(/sunday/i)).toBeChecked()
      expect(screen.getByLabelText(/monday/i)).toBeChecked()
      expect(screen.getByLabelText(/tuesday/i)).toBeChecked()
      expect(screen.getByLabelText(/wednesday/i)).toBeChecked()
      expect(screen.getByLabelText(/thursday/i)).toBeChecked()
      expect(screen.getByLabelText(/friday/i)).not.toBeChecked()
      expect(screen.getByLabelText(/saturday/i)).not.toBeChecked()
    })
  })

  // Initial Values (Edit Mode)
  describe('initial values', () => {
    const initialData: TeamMemberFormData = {
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      employment_type: 'contractor',
      work_hours_per_day: 6,
      hourly_rate: 150,
      work_days: [1, 2, 3], // Mon, Tue, Wed
    }

    it('populates name from initial values', () => {
      render(<TeamMemberForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/name/i)).toHaveValue('John Doe')
    })

    it('populates email from initial values', () => {
      render(<TeamMemberForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/email/i)).toHaveValue('john@example.com')
    })

    it('populates role from initial values', () => {
      render(<TeamMemberForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/role/i)).toHaveValue('admin')
    })

    it('populates employment type from initial values', () => {
      render(<TeamMemberForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/employment type/i)).toHaveValue('contractor')
    })

    it('populates work hours from initial values', () => {
      render(<TeamMemberForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/work hours per day/i)).toHaveValue(6)
    })

    it('populates work days from initial values', () => {
      render(<TeamMemberForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/sunday/i)).not.toBeChecked()
      expect(screen.getByLabelText(/monday/i)).toBeChecked()
      expect(screen.getByLabelText(/tuesday/i)).toBeChecked()
      expect(screen.getByLabelText(/wednesday/i)).toBeChecked()
      expect(screen.getByLabelText(/thursday/i)).not.toBeChecked()
    })

    it('shows update button text in edit mode', () => {
      render(<TeamMemberForm {...defaultProps} initialValues={initialData} mode="edit" />)
      expect(screen.getByRole('button', { name: /update member/i })).toBeInTheDocument()
    })
  })

  // Form Submission
  describe('form submission', () => {
    it('calls onSubmit with form data on valid submit', async () => {
      render(<TeamMemberForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/name/i), 'Jane Doe')
      await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
      await userEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      })
    })

    it('passes name to onSubmit', async () => {
      render(<TeamMemberForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/name/i), 'Jane Doe')
      await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
      await userEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Jane Doe' })
        )
      })
    })

    it('passes email to onSubmit', async () => {
      render(<TeamMemberForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/name/i), 'Jane Doe')
      await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com')
      await userEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'jane@example.com' })
        )
      })
    })

    it('passes work days to onSubmit', async () => {
      render(<TeamMemberForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/name/i), 'Jane')
      await userEvent.type(screen.getByLabelText(/email/i), 'jane@test.com')
      // Default Israeli work week should be passed
      await userEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ work_days: [0, 1, 2, 3, 4] }) // Sun-Thu
        )
      })
    })
  })

  // Validation
  describe('validation', () => {
    it('shows error when name is empty', async () => {
      render(<TeamMemberForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com')
      await userEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      })
    })

    it('shows error when email is empty', async () => {
      render(<TeamMemberForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/name/i), 'Test')
      await userEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('shows error when email is invalid', async () => {
      render(<TeamMemberForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/name/i), 'Test')
      await userEvent.type(screen.getByLabelText(/email/i), 'invalid-email')
      await userEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
      })
    })

    it('shows error when no work days selected', async () => {
      render(<TeamMemberForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/name/i), 'Test')
      await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com')
      // Uncheck all default work days
      await userEvent.click(screen.getByLabelText(/sunday/i))
      await userEvent.click(screen.getByLabelText(/monday/i))
      await userEvent.click(screen.getByLabelText(/tuesday/i))
      await userEvent.click(screen.getByLabelText(/wednesday/i))
      await userEvent.click(screen.getByLabelText(/thursday/i))
      await userEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(screen.getByText(/select at least one work day/i)).toBeInTheDocument()
      })
    })

    it('does not call onSubmit when validation fails', async () => {
      render(<TeamMemberForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /add member/i }))

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })

    it('clears error when field is corrected', async () => {
      render(<TeamMemberForm {...defaultProps} />)

      // Trigger error
      await userEvent.type(screen.getByLabelText(/email/i), 'test@test.com')
      await userEvent.click(screen.getByRole('button', { name: /add member/i }))
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      })

      // Fix error
      await userEvent.type(screen.getByLabelText(/name/i), 'Test')

      await waitFor(() => {
        expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument()
      })
    })
  })

  // Cancel
  describe('cancel', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      render(<TeamMemberForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })

  // Loading State
  describe('loading state', () => {
    it('disables submit button when loading', () => {
      render(<TeamMemberForm {...defaultProps} isLoading />)
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })

    it('disables cancel button when loading', () => {
      render(<TeamMemberForm {...defaultProps} isLoading />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })

    it('disables all inputs when loading', () => {
      render(<TeamMemberForm {...defaultProps} isLoading />)
      expect(screen.getByLabelText(/name/i)).toBeDisabled()
      expect(screen.getByLabelText(/email/i)).toBeDisabled()
      expect(screen.getByLabelText(/role/i)).toBeDisabled()
    })
  })

  // Accessibility
  describe('accessibility', () => {
    it('has form role', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByRole('form')).toBeInTheDocument()
    })

    it('labels are associated with inputs', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('marks required fields', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByLabelText(/name/i)).toBeRequired()
      expect(screen.getByLabelText(/email/i)).toBeRequired()
    })

    it('work days group has accessible label', () => {
      render(<TeamMemberForm {...defaultProps} />)
      expect(screen.getByRole('group', { name: /work days/i })).toBeInTheDocument()
    })
  })
})

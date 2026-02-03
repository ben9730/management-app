/**
 * TimeOffForm Component Tests
 *
 * TDD: Tests written FIRST before implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeOffForm, type TimeOffFormProps } from './TimeOffForm'
import type { TeamMember } from '@/types/entities'

// Mock team members
const mockTeamMembers: TeamMember[] = [
  {
    id: 'member-1',
    user_id: 'user-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    role: 'member',
    hourly_rate: null,
    created_at: new Date(),
  },
  {
    id: 'member-2',
    user_id: 'user-2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    role: 'admin',
    hourly_rate: null,
    created_at: new Date(),
  },
]

describe('TimeOffForm', () => {
  const defaultProps: TimeOffFormProps = {
    teamMembers: mockTeamMembers,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the form with all required fields', () => {
      render(<TimeOffForm {...defaultProps} />)

      // User/Team Member selector
      expect(screen.getByLabelText(/team member|employee/i)).toBeInTheDocument()

      // Date fields
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()

      // Type selector
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument()

      // Notes field (optional)
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()

      // Submit and Cancel buttons
      expect(screen.getByRole('button', { name: /submit|save|add/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('displays team members in dropdown', () => {
      render(<TimeOffForm {...defaultProps} />)

      const memberSelect = screen.getByLabelText(/team member|employee/i)
      expect(memberSelect).toBeInTheDocument()

      // Check options are present
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('displays time off type options', () => {
      render(<TimeOffForm {...defaultProps} />)

      const typeSelect = screen.getByLabelText(/type/i)
      expect(typeSelect).toBeInTheDocument()

      // Check type options
      expect(screen.getByRole('option', { name: /vacation/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /sick/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /personal/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /other/i })).toBeInTheDocument()
    })

    it('renders in RTL direction', () => {
      render(<TimeOffForm {...defaultProps} />)
      const form = screen.getByRole('form')
      expect(form).toHaveAttribute('dir', 'rtl')
    })
  })

  describe('Validation', () => {
    it('shows error when submitting without selecting team member', async () => {
      const user = userEvent.setup()
      render(<TimeOffForm {...defaultProps} />)

      // Fill other required fields
      await user.type(screen.getByLabelText(/start date/i), '2024-03-01')
      await user.type(screen.getByLabelText(/end date/i), '2024-03-05')

      // Submit without selecting member
      await user.click(screen.getByRole('button', { name: /submit|save|add/i }))

      // Look specifically for the error message element
      expect(await screen.findByText('Team member is required')).toBeInTheDocument()
      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when start date is missing', async () => {
      const user = userEvent.setup()
      render(<TimeOffForm {...defaultProps} />)

      // Select member and end date only
      await user.selectOptions(screen.getByLabelText(/team member|employee/i), 'user-1')
      await user.type(screen.getByLabelText(/end date/i), '2024-03-05')

      await user.click(screen.getByRole('button', { name: /submit|save|add/i }))

      expect(await screen.findByText(/start date.*required/i)).toBeInTheDocument()
      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when end date is before start date', async () => {
      const user = userEvent.setup()
      render(<TimeOffForm {...defaultProps} />)

      await user.selectOptions(screen.getByLabelText(/team member|employee/i), 'user-1')
      await user.type(screen.getByLabelText(/start date/i), '2024-03-10')
      await user.type(screen.getByLabelText(/end date/i), '2024-03-05')

      await user.click(screen.getByRole('button', { name: /submit|save|add/i }))

      expect(await screen.findByText(/end date.*after.*start|invalid.*date/i)).toBeInTheDocument()
      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Submission', () => {
    it('calls onSubmit with correct data when form is valid', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<TimeOffForm {...defaultProps} onSubmit={onSubmit} />)

      // Fill form
      await user.selectOptions(screen.getByLabelText(/team member|employee/i), 'user-1')
      await user.type(screen.getByLabelText(/start date/i), '2024-03-01')
      await user.type(screen.getByLabelText(/end date/i), '2024-03-05')
      await user.selectOptions(screen.getByLabelText(/type/i), 'vacation')
      await user.type(screen.getByLabelText(/notes/i), 'Family vacation')

      await user.click(screen.getByRole('button', { name: /submit|save|add/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          user_id: 'user-1',
          start_date: '2024-03-01',
          end_date: '2024-03-05',
          type: 'vacation',
          notes: 'Family vacation',
        })
      })
    })

    it('calls onSubmit without notes when notes field is empty', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<TimeOffForm {...defaultProps} onSubmit={onSubmit} />)

      await user.selectOptions(screen.getByLabelText(/team member|employee/i), 'user-1')
      await user.type(screen.getByLabelText(/start date/i), '2024-03-01')
      await user.type(screen.getByLabelText(/end date/i), '2024-03-05')
      await user.selectOptions(screen.getByLabelText(/type/i), 'sick')

      await user.click(screen.getByRole('button', { name: /submit|save|add/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          user_id: 'user-1',
          start_date: '2024-03-01',
          end_date: '2024-03-05',
          type: 'sick',
          notes: undefined,
        })
      })
    })
  })

  describe('Cancel', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<TimeOffForm {...defaultProps} onCancel={onCancel} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('disables all inputs when isLoading is true', () => {
      render(<TimeOffForm {...defaultProps} isLoading />)

      expect(screen.getByLabelText(/team member|employee/i)).toBeDisabled()
      expect(screen.getByLabelText(/start date/i)).toBeDisabled()
      expect(screen.getByLabelText(/end date/i)).toBeDisabled()
      expect(screen.getByLabelText(/type/i)).toBeDisabled()
      expect(screen.getByLabelText(/notes/i)).toBeDisabled()
    })

    it('shows loading indicator on submit button', () => {
      render(<TimeOffForm {...defaultProps} isLoading />)

      const submitButton = screen.getByRole('button', { name: /saving/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Edit Mode', () => {
    it('populates form with initial values in edit mode', () => {
      render(
        <TimeOffForm
          {...defaultProps}
          mode="edit"
          initialValues={{
            user_id: 'user-2',
            start_date: '2024-04-01',
            end_date: '2024-04-03',
            type: 'personal',
            notes: 'Personal matters',
          }}
        />
      )

      expect(screen.getByLabelText(/team member|employee/i)).toHaveValue('user-2')
      expect(screen.getByLabelText(/start date/i)).toHaveValue('2024-04-01')
      expect(screen.getByLabelText(/end date/i)).toHaveValue('2024-04-03')
      expect(screen.getByLabelText(/type/i)).toHaveValue('personal')
      expect(screen.getByLabelText(/notes/i)).toHaveValue('Personal matters')
    })

    it('shows update button text in edit mode', () => {
      render(<TimeOffForm {...defaultProps} mode="edit" />)

      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument()
    })
  })
})

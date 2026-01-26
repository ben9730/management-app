/**
 * ProjectForm Component Tests (TDD)
 *
 * Form for creating and editing projects with validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectForm, ProjectFormData } from './ProjectForm'

const mockOnSubmit = vi.fn()
const mockOnCancel = vi.fn()

const defaultProps = {
  onSubmit: mockOnSubmit,
  onCancel: mockOnCancel,
}

describe('ProjectForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Basic Rendering
  describe('rendering', () => {
    it('renders form element', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByRole('form')).toBeInTheDocument()
    })

    it('renders project name input', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
    })

    it('renders description textarea', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })

    it('renders start date input', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
    })

    it('renders end date input', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
    })

    it('renders status select', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument()
    })

    it('renders cancel button', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  // Status Options
  describe('status options', () => {
    it('shows all status options', () => {
      render(<ProjectForm {...defaultProps} />)

      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Archived')).toBeInTheDocument()
    })

    it('defaults to active status', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByLabelText(/status/i)).toHaveValue('active')
    })
  })

  // Default Values
  describe('default values', () => {
    it('project name is empty by default', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByLabelText(/project name/i)).toHaveValue('')
    })

    it('description is empty by default', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByLabelText(/description/i)).toHaveValue('')
    })
  })

  // Initial Values (Edit Mode)
  describe('initial values', () => {
    const initialData: ProjectFormData = {
      name: 'Existing Project',
      description: 'Project description',
      status: 'completed',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    }

    it('populates name from initial values', () => {
      render(<ProjectForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/project name/i)).toHaveValue('Existing Project')
    })

    it('populates description from initial values', () => {
      render(<ProjectForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/description/i)).toHaveValue('Project description')
    })

    it('populates status from initial values', () => {
      render(<ProjectForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/status/i)).toHaveValue('completed')
    })

    it('populates start date from initial values', () => {
      render(<ProjectForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/start date/i)).toHaveValue('2024-01-01')
    })

    it('populates end date from initial values', () => {
      render(<ProjectForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/end date/i)).toHaveValue('2024-12-31')
    })

    it('shows update button text in edit mode', () => {
      render(<ProjectForm {...defaultProps} initialValues={initialData} mode="edit" />)
      expect(screen.getByRole('button', { name: /update project/i })).toBeInTheDocument()
    })
  })

  // Form Submission
  describe('form submission', () => {
    it('calls onSubmit with form data on valid submit', async () => {
      render(<ProjectForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/project name/i), 'New Project')
      await userEvent.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      })
    })

    it('passes name to onSubmit', async () => {
      render(<ProjectForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/project name/i), 'My Project')
      await userEvent.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'My Project' })
        )
      })
    })

    it('passes description to onSubmit', async () => {
      render(<ProjectForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/project name/i), 'Project')
      await userEvent.type(screen.getByLabelText(/description/i), 'Project description')
      await userEvent.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ description: 'Project description' })
        )
      })
    })

    it('passes status to onSubmit', async () => {
      render(<ProjectForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/project name/i), 'Project')
      await userEvent.selectOptions(screen.getByLabelText(/status/i), 'archived')
      await userEvent.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'archived' })
        )
      })
    })

    it('passes dates to onSubmit', async () => {
      render(<ProjectForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/project name/i), 'Project')
      await userEvent.type(screen.getByLabelText(/start date/i), '2024-01-15')
      await userEvent.type(screen.getByLabelText(/end date/i), '2024-06-30')
      await userEvent.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            start_date: '2024-01-15',
            end_date: '2024-06-30',
          })
        )
      })
    })
  })

  // Validation
  describe('validation', () => {
    it('shows error when name is empty', async () => {
      render(<ProjectForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(screen.getByText(/project name is required/i)).toBeInTheDocument()
      })
    })

    it('does not call onSubmit when validation fails', async () => {
      render(<ProjectForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })

    it('shows error when end date is before start date', async () => {
      render(<ProjectForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/project name/i), 'Project')
      await userEvent.type(screen.getByLabelText(/start date/i), '2024-06-01')
      await userEvent.type(screen.getByLabelText(/end date/i), '2024-01-01')
      await userEvent.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument()
      })
    })

    it('clears error when field is corrected', async () => {
      render(<ProjectForm {...defaultProps} />)

      // Trigger error
      await userEvent.click(screen.getByRole('button', { name: /create project/i }))
      await waitFor(() => {
        expect(screen.getByText(/project name is required/i)).toBeInTheDocument()
      })

      // Fix error
      await userEvent.type(screen.getByLabelText(/project name/i), 'Project')

      await waitFor(() => {
        expect(screen.queryByText(/project name is required/i)).not.toBeInTheDocument()
      })
    })
  })

  // Cancel
  describe('cancel', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      render(<ProjectForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('does not call onSubmit when cancel is clicked', async () => {
      render(<ProjectForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/project name/i), 'Project')
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  // Loading State
  describe('loading state', () => {
    it('disables submit button when loading', () => {
      render(<ProjectForm {...defaultProps} isLoading />)
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })

    it('disables cancel button when loading', () => {
      render(<ProjectForm {...defaultProps} isLoading />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })

    it('shows loading text on submit button', () => {
      render(<ProjectForm {...defaultProps} isLoading />)
      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()
    })

    it('disables all inputs when loading', () => {
      render(<ProjectForm {...defaultProps} isLoading />)
      expect(screen.getByLabelText(/project name/i)).toBeDisabled()
      expect(screen.getByLabelText(/description/i)).toBeDisabled()
      expect(screen.getByLabelText(/status/i)).toBeDisabled()
    })
  })

  // Accessibility
  describe('accessibility', () => {
    it('has form role', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByRole('form')).toBeInTheDocument()
    })

    it('labels are associated with inputs', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
    })

    it('marks required fields', () => {
      render(<ProjectForm {...defaultProps} />)
      expect(screen.getByLabelText(/project name/i)).toBeRequired()
    })

    it('error messages have aria-live', async () => {
      render(<ProjectForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /create project/i }))

      await waitFor(() => {
        const errorMessage = screen.getByText(/project name is required/i)
        expect(errorMessage.closest('[aria-live]')).toBeInTheDocument()
      })
    })
  })

  // Brutalist Styling
  describe('brutalist styling', () => {
    it('has brutalist border style on inputs', () => {
      render(<ProjectForm {...defaultProps} />)
      const nameInput = screen.getByLabelText(/project name/i)
      expect(nameInput).toHaveClass('border-2')
    })
  })
})

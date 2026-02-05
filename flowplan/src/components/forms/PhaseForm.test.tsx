/**
 * PhaseForm Component Tests (TDD)
 *
 * Form for creating and editing project phases with validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhaseForm, PhaseFormData } from './PhaseForm'

const mockOnSubmit = vi.fn()
const mockOnCancel = vi.fn()

const defaultProps = {
  onSubmit: mockOnSubmit,
  onCancel: mockOnCancel,
}

describe('PhaseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Basic Rendering
  describe('rendering', () => {
    it('renders form element', () => {
      render(<PhaseForm {...defaultProps} />)
      expect(screen.getByRole('form')).toBeInTheDocument()
    })

    it('renders name input with Hebrew label', () => {
      render(<PhaseForm {...defaultProps} />)
      expect(screen.getByLabelText(/שם השלב/i)).toBeInTheDocument()
    })

    it('renders description textarea', () => {
      render(<PhaseForm {...defaultProps} />)
      expect(screen.getByLabelText(/תיאור/i)).toBeInTheDocument()
    })

    it('renders start date input', () => {
      render(<PhaseForm {...defaultProps} />)
      expect(screen.getByLabelText(/תאריך התחלה/i)).toBeInTheDocument()
    })

    it('renders end date input', () => {
      render(<PhaseForm {...defaultProps} />)
      expect(screen.getByLabelText(/תאריך סיום/i)).toBeInTheDocument()
    })

    it('renders submit button with Hebrew text', () => {
      render(<PhaseForm {...defaultProps} />)
      expect(screen.getByRole('button', { name: /צור שלב/i })).toBeInTheDocument()
    })

    it('renders cancel button', () => {
      render(<PhaseForm {...defaultProps} />)
      expect(screen.getByRole('button', { name: /ביטול/i })).toBeInTheDocument()
    })
  })

  // Default Values
  describe('default values', () => {
    it('name is empty by default', () => {
      render(<PhaseForm {...defaultProps} />)
      expect(screen.getByLabelText(/שם השלב/i)).toHaveValue('')
    })

    it('description is empty by default', () => {
      render(<PhaseForm {...defaultProps} />)
      expect(screen.getByLabelText(/תיאור/i)).toHaveValue('')
    })
  })

  // Validation
  describe('validation', () => {
    it('shows error when name is empty', async () => {
      render(<PhaseForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /צור שלב/i }))

      await waitFor(() => {
        expect(screen.getByText(/שם השלב הוא שדה חובה/i)).toBeInTheDocument()
      })
    })

    it('does not call onSubmit when validation fails', async () => {
      render(<PhaseForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /צור שלב/i }))

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })

    it('clears error when field is corrected', async () => {
      render(<PhaseForm {...defaultProps} />)

      // Trigger error
      await userEvent.click(screen.getByRole('button', { name: /צור שלב/i }))
      await waitFor(() => {
        expect(screen.getByText(/שם השלב הוא שדה חובה/i)).toBeInTheDocument()
      })

      // Fix error
      await userEvent.type(screen.getByLabelText(/שם השלב/i), 'שלב חדש')

      await waitFor(() => {
        expect(screen.queryByText(/שם השלב הוא שדה חובה/i)).not.toBeInTheDocument()
      })
    })
  })

  // Form Submission
  describe('form submission', () => {
    it('calls onSubmit with form data on valid submit', async () => {
      render(<PhaseForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/שם השלב/i), 'שלב תכנון')
      await userEvent.click(screen.getByRole('button', { name: /צור שלב/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      })
    })

    it('passes name to onSubmit', async () => {
      render(<PhaseForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/שם השלב/i), 'שלב ביצוע')
      await userEvent.click(screen.getByRole('button', { name: /צור שלב/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'שלב ביצוע' })
        )
      })
    })

    it('passes description to onSubmit', async () => {
      render(<PhaseForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/שם השלב/i), 'שלב')
      await userEvent.type(screen.getByLabelText(/תיאור/i), 'תיאור השלב')
      await userEvent.click(screen.getByRole('button', { name: /צור שלב/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ description: 'תיאור השלב' })
        )
      })
    })

    it('passes dates to onSubmit', async () => {
      render(<PhaseForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/שם השלב/i), 'שלב')

      const startDateInput = screen.getByLabelText(/תאריך התחלה/i)
      const endDateInput = screen.getByLabelText(/תאריך סיום/i)

      await userEvent.type(startDateInput, '2026-02-01')
      await userEvent.type(endDateInput, '2026-02-28')

      await userEvent.click(screen.getByRole('button', { name: /צור שלב/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            start_date: '2026-02-01',
            end_date: '2026-02-28',
          })
        )
      })
    })
  })

  // Initial Values (Edit Mode)
  describe('initial values (edit mode)', () => {
    const initialData: PhaseFormData = {
      name: 'שלב קיים',
      description: 'תיאור קיים',
      start_date: '2026-01-01',
      end_date: '2026-01-31',
    }

    it('populates fields from initial values', () => {
      render(<PhaseForm {...defaultProps} initialValues={initialData} />)
      expect(screen.getByLabelText(/שם השלב/i)).toHaveValue('שלב קיים')
      expect(screen.getByLabelText(/תיאור/i)).toHaveValue('תיאור קיים')
    })

    it('shows update button text in edit mode', () => {
      render(<PhaseForm {...defaultProps} initialValues={initialData} mode="edit" />)
      expect(screen.getByRole('button', { name: /עדכן שלב/i })).toBeInTheDocument()
    })
  })

  // Loading State
  describe('loading state', () => {
    it('disables submit button when loading', () => {
      render(<PhaseForm {...defaultProps} isLoading />)
      expect(screen.getByRole('button', { name: /שומר/i })).toBeDisabled()
    })

    it('disables cancel button when loading', () => {
      render(<PhaseForm {...defaultProps} isLoading />)
      expect(screen.getByRole('button', { name: /ביטול/i })).toBeDisabled()
    })

    it('shows loading text on submit button', () => {
      render(<PhaseForm {...defaultProps} isLoading />)
      expect(screen.getByRole('button', { name: /שומר/i })).toBeInTheDocument()
    })

    it('disables all inputs when loading', () => {
      render(<PhaseForm {...defaultProps} isLoading />)
      expect(screen.getByLabelText(/שם השלב/i)).toBeDisabled()
      expect(screen.getByLabelText(/תיאור/i)).toBeDisabled()
    })
  })

  // Cancel
  describe('cancel', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      render(<PhaseForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /ביטול/i }))

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('does not call onSubmit when cancel is clicked', async () => {
      render(<PhaseForm {...defaultProps} />)

      await userEvent.type(screen.getByLabelText(/שם השלב/i), 'שלב')
      await userEvent.click(screen.getByRole('button', { name: /ביטול/i }))

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  // RTL and Hebrew
  describe('RTL and Hebrew', () => {
    it('has dir="rtl" on form', () => {
      render(<PhaseForm {...defaultProps} />)
      expect(screen.getByRole('form')).toHaveAttribute('dir', 'rtl')
    })
  })

  // Accessibility
  describe('accessibility', () => {
    it('has form role', () => {
      render(<PhaseForm {...defaultProps} />)
      expect(screen.getByRole('form')).toBeInTheDocument()
    })

    it('labels are associated with inputs', () => {
      render(<PhaseForm {...defaultProps} />)
      expect(screen.getByLabelText(/שם השלב/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/תיאור/i)).toBeInTheDocument()
    })

    it('marks required fields', () => {
      render(<PhaseForm {...defaultProps} />)
      expect(screen.getByLabelText(/שם השלב/i)).toBeRequired()
    })

    it('error messages have aria-live', async () => {
      render(<PhaseForm {...defaultProps} />)

      await userEvent.click(screen.getByRole('button', { name: /צור שלב/i }))

      await waitFor(() => {
        const errorMessage = screen.getByText(/שם השלב הוא שדה חובה/i)
        expect(errorMessage.closest('[aria-live]')).toBeInTheDocument()
      })
    })
  })
})

/**
 * FindingForm Component Tests
 *
 * TDD: Tests written FIRST before implementation.
 * Tests for the Findings Center form component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FindingForm, type FindingFormProps, type FindingFormData } from './FindingForm'
import type { Task, FindingSeverity, FindingStatus } from '@/types/entities'

// Mock tasks for the dropdown
const mockTasks: Task[] = [
  {
    id: 'task-1',
    project_id: 'project-1',
    phase_id: 'phase-1',
    title: 'Review Financial Statements',
    description: 'Review Q1 financial statements',
    status: 'in_progress',
    priority: 'high',
    assignee_id: null,
    duration: 5,
    estimated_hours: 40,
    start_date: null,
    end_date: null,
    es: null,
    ef: null,
    ls: null,
    lf: null,
    slack: 0,
    is_critical: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 'task-2',
    project_id: 'project-1',
    phase_id: 'phase-1',
    title: 'Inventory Audit',
    description: 'Physical inventory count',
    status: 'pending',
    priority: 'medium',
    assignee_id: null,
    duration: 3,
    estimated_hours: 24,
    start_date: null,
    end_date: null,
    es: null,
    ef: null,
    ls: null,
    lf: null,
    slack: 0,
    is_critical: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
]

describe('FindingForm', () => {
  const defaultProps: FindingFormProps = {
    tasks: mockTasks,
    mode: 'create',
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the form with all required fields', () => {
      render(<FindingForm {...defaultProps} />)

      // Task selector (Hebrew: משימה)
      expect(screen.getByLabelText(/משימה/i)).toBeInTheDocument()

      // Severity selector (Hebrew: חומרה)
      expect(screen.getByLabelText(/חומרה/i)).toBeInTheDocument()

      // Finding description (Hebrew: תיאור הממצא)
      expect(screen.getByLabelText(/תיאור הממצא/i)).toBeInTheDocument()

      // Root cause (Hebrew: סיבת שורש)
      expect(screen.getByLabelText(/סיבת שורש/i)).toBeInTheDocument()

      // CAPA (Hebrew: פעולה מתקנת/מונעת)
      expect(screen.getByLabelText(/פעולה מתקנת|CAPA/i)).toBeInTheDocument()

      // Due date (Hebrew: תאריך יעד)
      expect(screen.getByLabelText(/תאריך יעד/i)).toBeInTheDocument()

      // Submit and Cancel buttons (Hebrew: שמור, ביטול)
      expect(screen.getByRole('button', { name: /שמור|save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /ביטול|cancel/i })).toBeInTheDocument()
    })

    it('displays tasks in dropdown', () => {
      render(<FindingForm {...defaultProps} />)

      const taskSelect = screen.getByLabelText(/משימה/i)
      expect(taskSelect).toBeInTheDocument()

      // Check task options are present
      expect(screen.getByText('Review Financial Statements')).toBeInTheDocument()
      expect(screen.getByText('Inventory Audit')).toBeInTheDocument()
    })

    it('displays severity options in Hebrew', () => {
      render(<FindingForm {...defaultProps} />)

      const severitySelect = screen.getByLabelText(/חומרה/i)
      expect(severitySelect).toBeInTheDocument()

      // Check severity options (Hebrew)
      expect(screen.getByRole('option', { name: /קריטי/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /גבוה/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /בינוני/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /נמוך/i })).toBeInTheDocument()
    })

    it('renders in RTL direction', () => {
      render(<FindingForm {...defaultProps} />)
      const form = screen.getByRole('form')
      expect(form).toHaveAttribute('dir', 'rtl')
    })

    it('does not show status field in create mode', () => {
      render(<FindingForm {...defaultProps} mode="create" />)

      // Status field should NOT be present in create mode
      expect(screen.queryByLabelText(/סטטוס/i)).not.toBeInTheDocument()
    })

    it('shows status field in edit mode', () => {
      render(<FindingForm {...defaultProps} mode="edit" />)

      // Status field should be present in edit mode
      expect(screen.getByLabelText(/סטטוס/i)).toBeInTheDocument()

      // Check status options (Hebrew)
      expect(screen.getByRole('option', { name: /פתוח/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /בתהליך/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /סגור/i })).toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('shows error when submitting without selecting a task', async () => {
      const user = userEvent.setup()
      render(<FindingForm {...defaultProps} />)

      // Fill finding description but not task
      const findingTextarea = screen.getByLabelText(/תיאור הממצא/i)
      await user.type(findingTextarea, 'This is a test finding description that is long enough')

      // Select severity
      await user.selectOptions(screen.getByLabelText(/חומרה/i), 'high')

      // Submit without selecting task
      await user.click(screen.getByRole('button', { name: /שמור|save/i }))

      // Expect Hebrew validation error
      expect(await screen.findByText(/משימה.*חובה|יש לבחור משימה/i)).toBeInTheDocument()
      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when finding description is missing', async () => {
      const user = userEvent.setup()
      render(<FindingForm {...defaultProps} />)

      // Select task and severity but not finding
      await user.selectOptions(screen.getByLabelText(/משימה/i), 'task-1')
      await user.selectOptions(screen.getByLabelText(/חומרה/i), 'high')

      await user.click(screen.getByRole('button', { name: /שמור|save/i }))

      // Expect Hebrew validation error
      expect(await screen.findByText(/תיאור.*חובה|יש להזין תיאור/i)).toBeInTheDocument()
      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })

    it('shows error when finding description is too short (less than 10 chars)', async () => {
      const user = userEvent.setup()
      render(<FindingForm {...defaultProps} />)

      // Fill form with short finding
      await user.selectOptions(screen.getByLabelText(/משימה/i), 'task-1')
      await user.selectOptions(screen.getByLabelText(/חומרה/i), 'high')
      await user.type(screen.getByLabelText(/תיאור הממצא/i), 'short')

      await user.click(screen.getByRole('button', { name: /שמור|save/i }))

      // Expect Hebrew validation error for minimum length
      expect(await screen.findByText(/לפחות 10 תווים|תיאור קצר מדי/i)).toBeInTheDocument()
      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })

    it('clears validation error when field is corrected', async () => {
      const user = userEvent.setup()
      render(<FindingForm {...defaultProps} />)

      // Submit empty form
      await user.click(screen.getByRole('button', { name: /שמור|save/i }))

      // Error should appear
      expect(await screen.findByText(/משימה.*חובה|יש לבחור משימה/i)).toBeInTheDocument()

      // Fix the error by selecting a task
      await user.selectOptions(screen.getByLabelText(/משימה/i), 'task-1')

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/משימה.*חובה|יש לבחור משימה/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Submission', () => {
    it('calls onSubmit with correct data when form is valid in create mode', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<FindingForm {...defaultProps} onSubmit={onSubmit} />)

      // Fill form
      await user.selectOptions(screen.getByLabelText(/משימה/i), 'task-1')
      await user.selectOptions(screen.getByLabelText(/חומרה/i), 'critical')
      await user.type(screen.getByLabelText(/תיאור הממצא/i), 'Critical finding in financial statements')
      await user.type(screen.getByLabelText(/סיבת שורש/i), 'Lack of proper review process')
      await user.type(screen.getByLabelText(/פעולה מתקנת|CAPA/i), 'Implement dual review process')
      await user.type(screen.getByLabelText(/תאריך יעד/i), '2024-06-15')

      await user.click(screen.getByRole('button', { name: /שמור|save/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          task_id: 'task-1',
          severity: 'critical',
          finding: 'Critical finding in financial statements',
          root_cause: 'Lack of proper review process',
          capa: 'Implement dual review process',
          due_date: expect.any(Date),
        })
      })
    })

    it('calls onSubmit with status in edit mode', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(
        <FindingForm
          {...defaultProps}
          mode="edit"
          onSubmit={onSubmit}
          initialValues={{
            task_id: 'task-1',
            severity: 'high',
            finding: 'Existing finding description',
            status: 'open',
          }}
        />
      )

      // Change status
      await user.selectOptions(screen.getByLabelText(/סטטוס/i), 'in_progress')

      await user.click(screen.getByRole('button', { name: /עדכן|update/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'in_progress',
          })
        )
      })
    })

    it('calls onSubmit without optional fields when they are empty', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<FindingForm {...defaultProps} onSubmit={onSubmit} />)

      // Fill only required fields
      await user.selectOptions(screen.getByLabelText(/משימה/i), 'task-2')
      await user.selectOptions(screen.getByLabelText(/חומרה/i), 'low')
      await user.type(screen.getByLabelText(/תיאור הממצא/i), 'Minor finding in inventory records')

      await user.click(screen.getByRole('button', { name: /שמור|save/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          task_id: 'task-2',
          severity: 'low',
          finding: 'Minor finding in inventory records',
          root_cause: null,
          capa: null,
          due_date: null,
        })
      })
    })
  })

  describe('Cancel', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<FindingForm {...defaultProps} onCancel={onCancel} />)

      await user.click(screen.getByRole('button', { name: /ביטול|cancel/i }))

      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('disables all inputs when isLoading is true', () => {
      render(<FindingForm {...defaultProps} isLoading />)

      expect(screen.getByLabelText(/משימה/i)).toBeDisabled()
      expect(screen.getByLabelText(/חומרה/i)).toBeDisabled()
      expect(screen.getByLabelText(/תיאור הממצא/i)).toBeDisabled()
      expect(screen.getByLabelText(/סיבת שורש/i)).toBeDisabled()
      expect(screen.getByLabelText(/פעולה מתקנת|CAPA/i)).toBeDisabled()
      expect(screen.getByLabelText(/תאריך יעד/i)).toBeDisabled()
    })

    it('shows loading indicator on submit button', () => {
      render(<FindingForm {...defaultProps} isLoading />)

      const submitButton = screen.getByRole('button', { name: /שומר|saving/i })
      expect(submitButton).toBeDisabled()
    })

    it('disables cancel button when loading', () => {
      render(<FindingForm {...defaultProps} isLoading />)

      expect(screen.getByRole('button', { name: /ביטול|cancel/i })).toBeDisabled()
    })
  })

  describe('Edit Mode', () => {
    it('populates form with initial values in edit mode', () => {
      const initialValues: Partial<FindingFormData> = {
        task_id: 'task-2',
        severity: 'medium',
        finding: 'Existing finding for testing',
        root_cause: 'Root cause explanation',
        capa: 'Corrective action plan',
        due_date: new Date('2024-07-01'),
        status: 'in_progress',
      }

      render(
        <FindingForm
          {...defaultProps}
          mode="edit"
          initialValues={initialValues}
        />
      )

      expect(screen.getByLabelText(/משימה/i)).toHaveValue('task-2')
      expect(screen.getByLabelText(/חומרה/i)).toHaveValue('medium')
      expect(screen.getByLabelText(/תיאור הממצא/i)).toHaveValue('Existing finding for testing')
      expect(screen.getByLabelText(/סיבת שורש/i)).toHaveValue('Root cause explanation')
      expect(screen.getByLabelText(/פעולה מתקנת|CAPA/i)).toHaveValue('Corrective action plan')
      expect(screen.getByLabelText(/תאריך יעד/i)).toHaveValue('2024-07-01')
      expect(screen.getByLabelText(/סטטוס/i)).toHaveValue('in_progress')
    })

    it('shows update button text in edit mode', () => {
      render(<FindingForm {...defaultProps} mode="edit" />)

      expect(screen.getByRole('button', { name: /עדכן|update/i })).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty tasks array gracefully', () => {
      render(<FindingForm {...defaultProps} tasks={[]} />)

      const taskSelect = screen.getByLabelText(/משימה/i)
      expect(taskSelect).toBeInTheDocument()
      // Should still render without crashing
    })

    it('trims whitespace from text fields before submission', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<FindingForm {...defaultProps} onSubmit={onSubmit} />)

      await user.selectOptions(screen.getByLabelText(/משימה/i), 'task-1')
      await user.selectOptions(screen.getByLabelText(/חומרה/i), 'low')
      await user.type(screen.getByLabelText(/תיאור הממצא/i), '  Finding with spaces  ')
      await user.type(screen.getByLabelText(/סיבת שורש/i), '  Root cause with spaces  ')

      await user.click(screen.getByRole('button', { name: /שמור|save/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            finding: 'Finding with spaces',
            root_cause: 'Root cause with spaces',
          })
        )
      })
    })

    it('handles date string in initialValues', () => {
      const initialValues = {
        task_id: 'task-1',
        severity: 'high' as FindingSeverity,
        finding: 'Test finding',
        due_date: '2024-08-15', // String instead of Date
      }

      render(
        <FindingForm
          {...defaultProps}
          mode="edit"
          initialValues={initialValues as any}
        />
      )

      expect(screen.getByLabelText(/תאריך יעד/i)).toHaveValue('2024-08-15')
    })
  })
})

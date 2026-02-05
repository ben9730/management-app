/**
 * TaskForm Assignee Selection Tests
 *
 * TDD: Tests for multi-assignee selection functionality in TaskForm.
 * These tests verify the team member assignment feature using MultiSelect.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskForm, type TaskFormProps } from './TaskForm'
import type { TeamMember } from '@/types/entities'

// Mock team members for assignment
const mockTeamMembers: TeamMember[] = [
  {
    id: 'member-1',
    user_id: 'user-1',
    first_name: 'David',
    last_name: 'Cohen',
    email: 'david@example.com',
    role: 'member',
    hourly_rate: null,
    created_at: new Date(),
  },
  {
    id: 'member-2',
    user_id: 'user-2',
    first_name: 'Sarah',
    last_name: 'Levy',
    email: 'sarah@example.com',
    role: 'admin',
    hourly_rate: null,
    created_at: new Date(),
  },
  {
    id: 'member-3',
    user_id: 'user-3',
    first_name: 'Michael',
    last_name: 'Ben-David',
    email: 'michael@example.com',
    role: 'member',
    hourly_rate: null,
    created_at: new Date(),
  },
]

describe('TaskForm - Multi-Assignee Selection', () => {
  const defaultProps: TaskFormProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    teamMembers: mockTeamMembers,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders assignee multi-select when teamMembers prop is provided', () => {
      render(<TaskForm {...defaultProps} />)

      expect(screen.getByTestId('multi-select-trigger')).toBeInTheDocument()
    })

    it('does not render assignee select when teamMembers prop is empty', () => {
      render(<TaskForm {...defaultProps} teamMembers={[]} />)

      expect(screen.queryByTestId('multi-select-trigger')).not.toBeInTheDocument()
    })

    it('does not render assignee select when teamMembers prop is undefined', () => {
      const { teamMembers, ...propsWithoutMembers } = defaultProps
      render(<TaskForm {...propsWithoutMembers} />)

      expect(screen.queryByTestId('multi-select-trigger')).not.toBeInTheDocument()
    })

    it('displays team members in the dropdown when clicked', async () => {
      const user = userEvent.setup()
      render(<TaskForm {...defaultProps} />)

      // Open the dropdown
      const trigger = screen.getByTestId('multi-select-trigger')
      await user.click(trigger)

      // Check that dropdown is open
      const dropdown = screen.getByTestId('multi-select-dropdown')
      expect(dropdown).toBeInTheDocument()

      // Check that member names appear as options
      expect(screen.getByTestId('option-member-1')).toBeInTheDocument()
      expect(screen.getByTestId('option-member-2')).toBeInTheDocument()
      expect(screen.getByTestId('option-member-3')).toBeInTheDocument()
    })

    it('shows placeholder when no assignees selected', () => {
      render(<TaskForm {...defaultProps} />)

      const trigger = screen.getByTestId('multi-select-trigger')
      expect(trigger).toHaveTextContent('בחר אחראים...')
    })
  })

  describe('Selection', () => {
    it('allows selecting a team member', async () => {
      const user = userEvent.setup()
      render(<TaskForm {...defaultProps} />)

      // Open dropdown
      const trigger = screen.getByTestId('multi-select-trigger')
      await user.click(trigger)

      // Select a member
      await user.click(screen.getByTestId('option-member-1'))

      // The selected member's name should appear in the trigger
      expect(trigger).toHaveTextContent('David Cohen')
    })

    it('allows selecting multiple team members', async () => {
      const user = userEvent.setup()
      render(<TaskForm {...defaultProps} />)

      // Open dropdown
      const trigger = screen.getByTestId('multi-select-trigger')
      await user.click(trigger)

      // Select multiple members
      await user.click(screen.getByTestId('option-member-1'))
      await user.click(screen.getByTestId('option-member-2'))

      // Both names should appear
      expect(trigger).toHaveTextContent('David Cohen')
      expect(trigger).toHaveTextContent('Sarah Levy')
    })

    it('includes assignee_ids in submitted data when selected', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<TaskForm {...defaultProps} onSubmit={onSubmit} />)

      // Fill required fields
      await user.type(screen.getByTestId('task-title-input'), 'Test Task')

      // Open dropdown and select assignees
      const trigger = screen.getByTestId('multi-select-trigger')
      await user.click(trigger)
      await user.click(screen.getByTestId('option-member-2'))

      // Submit
      const submitButton = screen.getByRole('button', { name: /צור משימה/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Task',
            assignee_id: 'member-2', // For backward compatibility
            assignee_ids: ['member-2'],
          })
        )
      })
    })

    it('submits with undefined assignee_id when no assignees selected', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<TaskForm {...defaultProps} onSubmit={onSubmit} />)

      // Fill required fields only
      await user.type(screen.getByTestId('task-title-input'), 'Unassigned Task')

      // Submit without selecting assignees
      const submitButton = screen.getByRole('button', { name: /צור משימה/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Unassigned Task',
            assignee_id: undefined,
            assignee_ids: undefined,
          })
        )
      })
    })

    it('allows deselecting a team member', async () => {
      const user = userEvent.setup()
      render(<TaskForm {...defaultProps} />)

      // Open dropdown and select
      const trigger = screen.getByTestId('multi-select-trigger')
      await user.click(trigger)
      await user.click(screen.getByTestId('option-member-1'))

      expect(trigger).toHaveTextContent('David Cohen')

      // Click again to deselect
      await user.click(screen.getByTestId('option-member-1'))

      // Should show placeholder again
      expect(trigger).toHaveTextContent('בחר אחראים...')
    })

    it('can remove assignee by clicking X button', async () => {
      const user = userEvent.setup()
      render(<TaskForm {...defaultProps} />)

      // Open dropdown and select
      const trigger = screen.getByTestId('multi-select-trigger')
      await user.click(trigger)
      await user.click(screen.getByTestId('option-member-1'))

      // Close dropdown by clicking outside
      await user.click(document.body)

      // Find and click remove button
      const removeButton = screen.getByTestId('remove-member-1')
      await user.click(removeButton)

      // Should show placeholder again
      expect(trigger).toHaveTextContent('בחר אחראים...')
    })
  })

  describe('Edit Mode', () => {
    it('pre-selects the assignee when editing a task with legacy assignee_id', () => {
      render(
        <TaskForm
          {...defaultProps}
          mode="edit"
          initialValues={{
            title: 'Existing Task',
            priority: 'high',
            duration: 3,
            assignee_id: 'member-3',
          }}
        />
      )

      const trigger = screen.getByTestId('multi-select-trigger')
      expect(trigger).toHaveTextContent('Michael Ben-David')
    })

    it('pre-selects multiple assignees when editing with assignee_ids', () => {
      render(
        <TaskForm
          {...defaultProps}
          mode="edit"
          initialValues={{
            title: 'Team Task',
            priority: 'high',
            duration: 3,
            assignee_ids: ['member-1', 'member-2'],
          }}
        />
      )

      const trigger = screen.getByTestId('multi-select-trigger')
      expect(trigger).toHaveTextContent('David Cohen')
      expect(trigger).toHaveTextContent('Sarah Levy')
    })

    it('allows adding assignees in edit mode', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(
        <TaskForm
          {...defaultProps}
          onSubmit={onSubmit}
          mode="edit"
          initialValues={{
            title: 'Existing Task',
            priority: 'medium',
            duration: 2,
            assignee_ids: ['member-1'],
          }}
        />
      )

      // Open dropdown and add another member
      const trigger = screen.getByTestId('multi-select-trigger')
      await user.click(trigger)
      await user.click(screen.getByTestId('option-member-2'))

      // Submit
      const submitButton = screen.getByRole('button', { name: /עדכן משימה/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            assignee_id: 'member-1', // First in array for backward compatibility
            assignee_ids: ['member-1', 'member-2'],
          })
        )
      })
    })

    it('allows removing all assignees in edit mode', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(
        <TaskForm
          {...defaultProps}
          onSubmit={onSubmit}
          mode="edit"
          initialValues={{
            title: 'Assigned Task',
            priority: 'low',
            duration: 1,
            assignee_ids: ['member-2'],
          }}
        />
      )

      // Remove the assignee using X button
      const removeButton = screen.getByTestId('remove-member-2')
      await user.click(removeButton)

      // Submit
      const submitButton = screen.getByRole('button', { name: /עדכן משימה/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            assignee_id: undefined,
            assignee_ids: undefined,
          })
        )
      })
    })
  })

  describe('Loading State', () => {
    it('disables assignee select when loading', () => {
      render(<TaskForm {...defaultProps} isLoading />)

      const trigger = screen.getByTestId('multi-select-trigger')
      expect(trigger).toBeDisabled()
    })
  })
})

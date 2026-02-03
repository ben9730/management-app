/**
 * TaskForm Assignee Selection Tests
 *
 * TDD: Tests for assignee selection functionality in TaskForm.
 * These tests verify the team member assignment feature.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

describe('TaskForm - Assignee Selection', () => {
  const defaultProps: TaskFormProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    teamMembers: mockTeamMembers,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders assignee dropdown when teamMembers prop is provided', () => {
      render(<TaskForm {...defaultProps} />)

      expect(screen.getByTestId('task-assignee-select')).toBeInTheDocument()
    })

    it('does not render assignee dropdown when teamMembers prop is empty', () => {
      render(<TaskForm {...defaultProps} teamMembers={[]} />)

      expect(screen.queryByTestId('task-assignee-select')).not.toBeInTheDocument()
    })

    it('does not render assignee dropdown when teamMembers prop is undefined', () => {
      const { teamMembers, ...propsWithoutMembers } = defaultProps
      render(<TaskForm {...propsWithoutMembers} />)

      expect(screen.queryByTestId('task-assignee-select')).not.toBeInTheDocument()
    })

    it('displays team members in the dropdown', () => {
      render(<TaskForm {...defaultProps} />)

      const assigneeSelect = screen.getByTestId('task-assignee-select')
      expect(assigneeSelect).toBeInTheDocument()

      // Check that member names appear as options
      expect(screen.getByRole('option', { name: /David Cohen/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /Sarah Levy/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /Michael Ben-David/i })).toBeInTheDocument()
    })

    it('includes an "unassigned" option', () => {
      render(<TaskForm {...defaultProps} />)

      expect(screen.getByRole('option', { name: /unassigned|none|select/i })).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('allows selecting a team member', async () => {
      const user = userEvent.setup()
      render(<TaskForm {...defaultProps} />)

      const assigneeSelect = screen.getByTestId('task-assignee-select')
      await user.selectOptions(assigneeSelect, 'member-1')

      expect(assigneeSelect).toHaveValue('member-1')
    })

    it('includes assignee_id in submitted data when selected', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<TaskForm {...defaultProps} onSubmit={onSubmit} />)

      // Fill required fields
      await user.type(screen.getByTestId('task-title-input'), 'Test Task')

      // Select assignee
      const assigneeSelect = screen.getByTestId('task-assignee-select')
      await user.selectOptions(assigneeSelect, 'member-2')

      // Submit (button text is in Hebrew)
      const submitButtons = screen.getAllByRole('button')
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit')!
      await user.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Task',
            assignee_id: 'member-2',
          })
        )
      })
    })

    it('submits with undefined assignee_id when "unassigned" is selected', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<TaskForm {...defaultProps} onSubmit={onSubmit} />)

      // Fill required fields
      await user.type(screen.getByTestId('task-title-input'), 'Unassigned Task')

      // Ensure unassigned is selected (default)
      const assigneeSelect = screen.getByTestId('task-assignee-select')
      expect(assigneeSelect).toHaveValue('')

      // Submit (button text is in Hebrew)
      const submitButtons = screen.getAllByRole('button')
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit')!
      await user.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Unassigned Task',
            assignee_id: undefined,
          })
        )
      })
    })
  })

  describe('Edit Mode', () => {
    it('pre-selects the assignee when editing a task', () => {
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

      const assigneeSelect = screen.getByTestId('task-assignee-select')
      expect(assigneeSelect).toHaveValue('member-3')
    })

    it('allows changing the assignee in edit mode', async () => {
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
            assignee_id: 'member-1',
          }}
        />
      )

      const assigneeSelect = screen.getByTestId('task-assignee-select')
      expect(assigneeSelect).toHaveValue('member-1')

      // Change to different member
      await user.selectOptions(assigneeSelect, 'member-2')

      // Submit (button text is in Hebrew)
      const submitButtons = screen.getAllByRole('button')
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit')!
      await user.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            assignee_id: 'member-2',
          })
        )
      })
    })

    it('allows removing assignee in edit mode', async () => {
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
            assignee_id: 'member-2',
          }}
        />
      )

      const assigneeSelect = screen.getByTestId('task-assignee-select')

      // Select unassigned
      await user.selectOptions(assigneeSelect, '')

      // Submit (button text is in Hebrew)
      const submitButtons = screen.getAllByRole('button')
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit')!
      await user.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            assignee_id: undefined,
          })
        )
      })
    })
  })

  describe('Loading State', () => {
    it('disables assignee dropdown when loading', () => {
      render(<TaskForm {...defaultProps} isLoading />)

      const assigneeSelect = screen.getByTestId('task-assignee-select')
      expect(assigneeSelect).toBeDisabled()
    })
  })
})

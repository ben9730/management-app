/**
 * TaskForm Multi-Assignee Tests (TDD)
 *
 * Tests for multi-assignee functionality in TaskForm component.
 * Bug Report: When a task has multiple assignees, only ONE is shown in the edit form.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskForm, TaskFormData } from './TaskForm'
import type { TeamMember } from '@/types/entities'

// Mock the team-members service to avoid Supabase initialization
vi.mock('@/services/team-members', () => ({
  checkMemberAvailability: vi.fn().mockResolvedValue({ available: true }),
}))

const mockOnSubmit = vi.fn()
const mockOnCancel = vi.fn()

// Test team members
const mockTeamMembers: TeamMember[] = [
  {
    id: 'member-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    email: 'ben@example.com',
    first_name: 'Ben',
    last_name: 'Gutman',
    display_name: 'Ben Gutman',
    role: 'admin',
    employment_type: 'full_time',
    weekly_capacity_hours: 40,
    work_days: [0, 1, 2, 3, 4],
    work_hours_per_day: 8,
    hourly_rate: 100,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  } as unknown as TeamMember,
  {
    id: 'member-2',
    organization_id: 'org-1',
    user_id: 'user-2',
    email: 'sarah@example.com',
    first_name: 'Sarah',
    last_name: 'Cohen',
    display_name: 'Sarah Cohen',
    role: 'member',
    employment_type: 'full_time',
    weekly_capacity_hours: 40,
    work_days: [0, 1, 2, 3, 4],
    work_hours_per_day: 8,
    hourly_rate: 80,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  } as unknown as TeamMember,
  {
    id: 'member-3',
    organization_id: 'org-1',
    user_id: 'user-3',
    email: 'david@example.com',
    first_name: 'David',
    last_name: 'Levi',
    display_name: 'David Levi',
    role: 'member',
    employment_type: 'part_time',
    weekly_capacity_hours: 20,
    work_days: [0, 1, 2],
    work_hours_per_day: 6,
    hourly_rate: 60,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  } as unknown as TeamMember,
]

const defaultProps = {
  onSubmit: mockOnSubmit,
  onCancel: mockOnCancel,
  teamMembers: mockTeamMembers,
}

/**
 * Helper to get the multi-select container by its trigger button
 */
function getMultiSelectContainer() {
  // The MultiSelect has a trigger button with data-testid="multi-select-trigger"
  // But the whole component is wrapped in a div. Find by the trigger and get parent.
  const trigger = screen.getByTestId('multi-select-trigger')
  return trigger.parentElement!
}

describe('TaskForm Multi-Assignee Support', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Multi-Assignee Selection UI', () => {
    it('renders multi-select for assignees when teamMembers provided', () => {
      render(<TaskForm {...defaultProps} />)
      // MultiSelect renders with a trigger button
      expect(screen.getByTestId('multi-select-trigger')).toBeInTheDocument()
    })

    it('shows all team members as options when dropdown opened', async () => {
      render(<TaskForm {...defaultProps} />)

      // Open the dropdown by clicking the trigger
      await userEvent.click(screen.getByTestId('multi-select-trigger'))

      // Now options should be visible in the dropdown
      await waitFor(() => {
        expect(screen.getByTestId('option-member-1')).toBeInTheDocument()
        expect(screen.getByTestId('option-member-2')).toBeInTheDocument()
        expect(screen.getByTestId('option-member-3')).toBeInTheDocument()
      })
    })
  })

  describe('Edit Mode with Multiple Assignees', () => {
    it('pre-selects ALL assignees in edit mode when multiple assignee_ids provided', async () => {
      const initialValues: Partial<TaskFormData> = {
        title: 'Test Task',
        assignee_ids: ['member-1', 'member-2'], // Two assignees
      }

      render(
        <TaskForm
          {...defaultProps}
          mode="edit"
          initialValues={initialValues}
        />
      )

      // Wait for the component to render with initial values
      // The trigger button should show both selected names as tags
      await waitFor(() => {
        const trigger = screen.getByTestId('multi-select-trigger')
        expect(trigger).toHaveTextContent('Ben Gutman')
        expect(trigger).toHaveTextContent('Sarah Cohen')
      })
    })

    it('pre-selects THREE assignees in edit mode', async () => {
      const initialValues: Partial<TaskFormData> = {
        title: 'Test Task',
        assignee_ids: ['member-1', 'member-2', 'member-3'], // Three assignees
      }

      render(
        <TaskForm
          {...defaultProps}
          mode="edit"
          initialValues={initialValues}
        />
      )

      await waitFor(() => {
        const trigger = screen.getByTestId('multi-select-trigger')
        expect(trigger).toHaveTextContent('Ben Gutman')
        expect(trigger).toHaveTextContent('Sarah Cohen')
        expect(trigger).toHaveTextContent('David Levi')
      })
    })

    it('updates form when assignee_ids prop changes (async loading scenario)', async () => {
      // Simulate initial render without assignee_ids (data still loading)
      const { rerender } = render(
        <TaskForm
          {...defaultProps}
          mode="edit"
          initialValues={{
            title: 'Test Task',
            assignee_ids: [], // Empty initially
          }}
        />
      )

      // Verify no assignees selected initially - trigger shows placeholder
      const trigger = screen.getByTestId('multi-select-trigger')
      expect(trigger).not.toHaveTextContent('Ben Gutman')
      expect(trigger).not.toHaveTextContent('Sarah Cohen')

      // Simulate data loaded - rerender with assignee_ids
      rerender(
        <TaskForm
          {...defaultProps}
          mode="edit"
          initialValues={{
            title: 'Test Task',
            assignee_ids: ['member-1', 'member-2'],
          }}
        />
      )

      // Now both assignees should be selected
      await waitFor(() => {
        expect(trigger).toHaveTextContent('Ben Gutman')
        expect(trigger).toHaveTextContent('Sarah Cohen')
      })
    })
  })

  describe('Form Submission with Multiple Assignees', () => {
    it('includes ALL assignee_ids in onSubmit when multiple selected', async () => {
      const initialValues: Partial<TaskFormData> = {
        title: 'Test Task',
        assignee_ids: ['member-1', 'member-2'],
      }

      render(
        <TaskForm
          {...defaultProps}
          mode="edit"
          initialValues={initialValues}
        />
      )

      await userEvent.click(screen.getByRole('button', { name: /עדכן משימה/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            assignee_ids: ['member-1', 'member-2'],
          })
        )
      })
    })

    it('sets assignee_id to first selected for backward compatibility', async () => {
      const initialValues: Partial<TaskFormData> = {
        title: 'Test Task',
        assignee_ids: ['member-1', 'member-2'],
      }

      render(
        <TaskForm
          {...defaultProps}
          mode="edit"
          initialValues={initialValues}
        />
      )

      await userEvent.click(screen.getByRole('button', { name: /עדכן משימה/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            assignee_id: 'member-1', // First selected for legacy compatibility
          })
        )
      })
    })
  })

  describe('Backward Compatibility', () => {
    it('handles legacy single assignee_id and converts to assignee_ids array', () => {
      const initialValues: Partial<TaskFormData> = {
        title: 'Legacy Task',
        assignee_id: 'member-1', // Legacy single assignee
      }

      render(
        <TaskForm
          {...defaultProps}
          mode="edit"
          initialValues={initialValues}
        />
      )

      const trigger = screen.getByTestId('multi-select-trigger')
      expect(trigger).toHaveTextContent('Ben Gutman')
    })

    it('prefers assignee_ids over assignee_id when both provided', async () => {
      const initialValues: Partial<TaskFormData> = {
        title: 'Task with Both',
        assignee_id: 'member-1', // Legacy
        assignee_ids: ['member-2', 'member-3'], // New multi-assignee
      }

      render(
        <TaskForm
          {...defaultProps}
          mode="edit"
          initialValues={initialValues}
        />
      )

      await waitFor(() => {
        const trigger = screen.getByTestId('multi-select-trigger')
        // Should show the assignee_ids, not the legacy assignee_id
        expect(trigger).toHaveTextContent('Sarah Cohen')
        expect(trigger).toHaveTextContent('David Levi')
        // Legacy assignee_id should NOT be shown since assignee_ids takes precedence
        expect(trigger).not.toHaveTextContent('Ben Gutman')
      })
    })
  })
})

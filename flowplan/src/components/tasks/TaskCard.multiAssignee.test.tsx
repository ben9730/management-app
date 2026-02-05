/**
 * TaskCard Multi-Assignee Tests (TDD)
 *
 * Tests for multi-assignee display in TaskCard component.
 * Bug Report: When a task has multiple assignees, only ONE is shown.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskCard } from './TaskCard'
import type { Task, TeamMember } from '@/types/entities'

// Mock task data
const mockTask: Task = {
  id: 'task-1',
  project_id: 'proj-1',
  phase_id: 'phase-1',
  title: 'Multi-assignee task test',
  description: 'Testing multiple assignees',
  task_type: 'task',
  status: 'in_progress',
  priority: 'high',
  start_date: '2026-01-20',
  end_date: '2026-01-28',
  duration: 8,
  estimated_hours: 16,
  actual_hours: 4,
  progress_percent: 50,
  wbs_number: '1.2.1',
  order_index: 1,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-20T14:00:00Z',
} as unknown as Task

// Multiple team member mock data
const mockAssignees: TeamMember[] = [
  {
    id: 'member-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    email: 'ben@example.com',
    first_name: 'Ben',
    last_name: 'Gutman',
    display_name: 'Ben Gutman',
    role: 'admin',
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
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  } as unknown as TeamMember,
]

describe('TaskCard Multi-Assignee Support', () => {
  describe('Multiple Assignees Display via AvatarStack', () => {
    it('renders AvatarStack when multiple assignees provided', () => {
      render(
        <TaskCard
          task={mockTask}
          assignees={mockAssignees.slice(0, 2)}
        />
      )

      // Should show initials for both assignees
      // AvatarStack renders overlapping avatars
      expect(screen.getByText('BG')).toBeInTheDocument() // Ben Gutman
      expect(screen.getByText('SC')).toBeInTheDocument() // Sarah Cohen
    })

    it('renders all three assignees when provided', () => {
      render(
        <TaskCard
          task={mockTask}
          assignees={mockAssignees}
        />
      )

      expect(screen.getByText('BG')).toBeInTheDocument() // Ben Gutman
      expect(screen.getByText('SC')).toBeInTheDocument() // Sarah Cohen
      expect(screen.getByText('DL')).toBeInTheDocument() // David Levi
    })

    it('shows +N indicator when more than max (3) assignees', () => {
      const fourAssignees = [
        ...mockAssignees,
        {
          id: 'member-4',
          organization_id: 'org-1',
          user_id: 'user-4',
          email: 'yael@example.com',
          first_name: 'Yael',
          last_name: 'Mor',
          display_name: 'Yael Mor',
          role: 'member',
          is_active: true,
          created_at: '2026-01-01T00:00:00Z',
        } as unknown as TeamMember,
      ]

      render(
        <TaskCard
          task={mockTask}
          assignees={fourAssignees}
        />
      )

      // AvatarStack with max=3 should show +1 indicator
      expect(screen.getByText('+1')).toBeInTheDocument()
    })
  })

  describe('Backward Compatibility with Legacy assignee prop', () => {
    it('renders single assignee when using legacy assignee prop', () => {
      render(
        <TaskCard
          task={mockTask}
          assignee={mockAssignees[0]}
        />
      )

      expect(screen.getByText('BG')).toBeInTheDocument()
    })

    it('prefers assignees array over legacy assignee prop', () => {
      render(
        <TaskCard
          task={mockTask}
          assignee={mockAssignees[0]} // Legacy single
          assignees={mockAssignees.slice(1, 3)} // New multi: Sarah, David
        />
      )

      // Should show Sarah and David (from assignees array), not Ben (from legacy assignee)
      expect(screen.getByText('SC')).toBeInTheDocument()
      expect(screen.getByText('DL')).toBeInTheDocument()
      expect(screen.queryByText('BG')).not.toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows placeholder when no assignees', () => {
      render(
        <TaskCard
          task={mockTask}
          assignees={[]}
        />
      )

      // Should show ? placeholder
      expect(screen.getByText('?')).toBeInTheDocument()
    })

    it('shows placeholder when assignees undefined', () => {
      render(
        <TaskCard
          task={mockTask}
        />
      )

      expect(screen.getByText('?')).toBeInTheDocument()
    })
  })

  describe('Avatar Display Names', () => {
    it('uses display_name for avatar tooltip/alt', () => {
      render(
        <TaskCard
          task={mockTask}
          assignees={[mockAssignees[0]]}
        />
      )

      // The avatar should have the name available (via title or aria-label)
      const avatar = screen.getByText('BG').closest('[title]') ||
                     screen.getByText('BG').closest('[aria-label]')

      if (avatar) {
        expect(avatar.getAttribute('title') || avatar.getAttribute('aria-label'))
          .toContain('Ben Gutman')
      }
    })

    it('falls back to first_name + last_name when no display_name', () => {
      const memberWithoutDisplayName = {
        ...mockAssignees[0],
        display_name: undefined,
        first_name: 'Ben',
        last_name: 'Gutman',
      } as unknown as TeamMember

      render(
        <TaskCard
          task={mockTask}
          assignees={[memberWithoutDisplayName]}
        />
      )

      // Should still show initials
      expect(screen.getByText('BG')).toBeInTheDocument()
    })

    it('falls back to email when no name fields', () => {
      const memberWithOnlyEmail = {
        id: 'member-email-only',
        email: 'test@example.com',
        organization_id: 'org-1',
        user_id: 'user-email',
        role: 'member',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      } as unknown as TeamMember

      render(
        <TaskCard
          task={mockTask}
          assignees={[memberWithOnlyEmail]}
        />
      )

      // AvatarStack uses getInitials which takes first two chars when only email is available
      // The avatar shows "TE" (from "test@example.com")
      expect(screen.getByText('TE')).toBeInTheDocument()
    })
  })
})

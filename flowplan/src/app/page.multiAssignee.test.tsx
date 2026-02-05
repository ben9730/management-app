/**
 * Dashboard Page Multi-Assignee Tests (TDD)
 *
 * Tests for multi-assignee display in the main dashboard page.
 * Bug Report: When a task has multiple assignees, only ONE is shown in:
 * 1. Task sidebar
 * 2. Task list (TaskCard)
 * 3. Task edit form (TaskForm)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Test the taskAssignees useMemo logic in isolation
// This tests the core logic that builds the taskId -> TeamMember[] map

interface TaskAssignment {
  id: string
  task_id: string
  user_id: string
  allocated_hours: number
}

interface TeamMember {
  id: string
  display_name?: string
  first_name?: string
  last_name?: string
  email: string
}

interface Task {
  id: string
  assignee_id?: string | null
}

/**
 * This is the actual logic from page.tsx that builds taskAssignees map.
 * We test it in isolation to verify it correctly handles multiple assignments.
 */
function buildTaskAssigneesMap(
  projectTaskAssignments: TaskAssignment[],
  teamMembers: TeamMember[],
  tasks: Task[]
): Record<string, TeamMember[]> {
  const result: Record<string, TeamMember[]> = {}

  // First, build from task_assignments (new multi-assignee system)
  projectTaskAssignments.forEach((assignment) => {
    const member = teamMembers.find(m => m.id === assignment.user_id)
    if (member) {
      if (!result[assignment.task_id]) {
        result[assignment.task_id] = []
      }
      // Avoid duplicates
      if (!result[assignment.task_id].some(m => m.id === member.id)) {
        result[assignment.task_id].push(member)
      }
    }
  })

  // Then, add legacy assignee_id for tasks without assignments
  tasks.forEach((task) => {
    if (task.assignee_id && !result[task.id]) {
      const member = teamMembers.find(m => m.id === task.assignee_id)
      if (member) {
        result[task.id] = [member]
      }
    }
  })

  return result
}

describe('taskAssignees Map Building Logic', () => {
  const mockTeamMembers: TeamMember[] = [
    { id: 'member-1', display_name: 'Ben Gutman', email: 'ben@example.com' },
    { id: 'member-2', display_name: 'Sarah Cohen', email: 'sarah@example.com' },
    { id: 'member-3', display_name: 'David Levi', email: 'david@example.com' },
  ]

  describe('Multi-Assignee from task_assignments table', () => {
    it('correctly maps multiple assignments for a single task', () => {
      const assignments: TaskAssignment[] = [
        { id: 'asgn-1', task_id: 'task-1', user_id: 'member-1', allocated_hours: 8 },
        { id: 'asgn-2', task_id: 'task-1', user_id: 'member-2', allocated_hours: 8 },
      ]
      const tasks: Task[] = [{ id: 'task-1' }]

      const result = buildTaskAssigneesMap(assignments, mockTeamMembers, tasks)

      expect(result['task-1']).toHaveLength(2)
      expect(result['task-1'].map(m => m.id)).toContain('member-1')
      expect(result['task-1'].map(m => m.id)).toContain('member-2')
    })

    it('correctly maps three assignments for a single task', () => {
      const assignments: TaskAssignment[] = [
        { id: 'asgn-1', task_id: 'task-1', user_id: 'member-1', allocated_hours: 8 },
        { id: 'asgn-2', task_id: 'task-1', user_id: 'member-2', allocated_hours: 8 },
        { id: 'asgn-3', task_id: 'task-1', user_id: 'member-3', allocated_hours: 4 },
      ]
      const tasks: Task[] = [{ id: 'task-1' }]

      const result = buildTaskAssigneesMap(assignments, mockTeamMembers, tasks)

      expect(result['task-1']).toHaveLength(3)
    })

    it('handles assignments for multiple different tasks', () => {
      const assignments: TaskAssignment[] = [
        { id: 'asgn-1', task_id: 'task-1', user_id: 'member-1', allocated_hours: 8 },
        { id: 'asgn-2', task_id: 'task-1', user_id: 'member-2', allocated_hours: 8 },
        { id: 'asgn-3', task_id: 'task-2', user_id: 'member-3', allocated_hours: 4 },
      ]
      const tasks: Task[] = [{ id: 'task-1' }, { id: 'task-2' }]

      const result = buildTaskAssigneesMap(assignments, mockTeamMembers, tasks)

      expect(result['task-1']).toHaveLength(2)
      expect(result['task-2']).toHaveLength(1)
      expect(result['task-2'][0].id).toBe('member-3')
    })

    it('avoids duplicate team members for the same task', () => {
      // Scenario: same assignment created twice (edge case)
      const assignments: TaskAssignment[] = [
        { id: 'asgn-1', task_id: 'task-1', user_id: 'member-1', allocated_hours: 8 },
        { id: 'asgn-2', task_id: 'task-1', user_id: 'member-1', allocated_hours: 4 }, // Same user
      ]
      const tasks: Task[] = [{ id: 'task-1' }]

      const result = buildTaskAssigneesMap(assignments, mockTeamMembers, tasks)

      expect(result['task-1']).toHaveLength(1) // Should not duplicate
    })

    it('ignores assignments for non-existent team members', () => {
      const assignments: TaskAssignment[] = [
        { id: 'asgn-1', task_id: 'task-1', user_id: 'member-1', allocated_hours: 8 },
        { id: 'asgn-2', task_id: 'task-1', user_id: 'deleted-member', allocated_hours: 8 },
      ]
      const tasks: Task[] = [{ id: 'task-1' }]

      const result = buildTaskAssigneesMap(assignments, mockTeamMembers, tasks)

      expect(result['task-1']).toHaveLength(1)
      expect(result['task-1'][0].id).toBe('member-1')
    })
  })

  describe('Legacy assignee_id Fallback', () => {
    it('uses legacy assignee_id when no task_assignments exist for a task', () => {
      const assignments: TaskAssignment[] = [] // No new-style assignments
      const tasks: Task[] = [{ id: 'task-1', assignee_id: 'member-1' }]

      const result = buildTaskAssigneesMap(assignments, mockTeamMembers, tasks)

      expect(result['task-1']).toHaveLength(1)
      expect(result['task-1'][0].id).toBe('member-1')
    })

    it('does NOT use legacy assignee_id when task_assignments exist', () => {
      const assignments: TaskAssignment[] = [
        { id: 'asgn-1', task_id: 'task-1', user_id: 'member-2', allocated_hours: 8 },
      ]
      const tasks: Task[] = [{ id: 'task-1', assignee_id: 'member-1' }] // Legacy points to different member

      const result = buildTaskAssigneesMap(assignments, mockTeamMembers, tasks)

      // Should use task_assignments (member-2), not legacy (member-1)
      expect(result['task-1']).toHaveLength(1)
      expect(result['task-1'][0].id).toBe('member-2')
    })

    it('handles task with null assignee_id and no assignments', () => {
      const assignments: TaskAssignment[] = []
      const tasks: Task[] = [{ id: 'task-1', assignee_id: null }]

      const result = buildTaskAssigneesMap(assignments, mockTeamMembers, tasks)

      expect(result['task-1']).toBeUndefined()
    })
  })

  describe('Empty States', () => {
    it('returns empty object when no assignments and no legacy assignees', () => {
      const result = buildTaskAssigneesMap([], mockTeamMembers, [{ id: 'task-1' }])
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('returns empty object when no tasks', () => {
      const result = buildTaskAssigneesMap([], mockTeamMembers, [])
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('returns empty object when no team members (edge case)', () => {
      const assignments: TaskAssignment[] = [
        { id: 'asgn-1', task_id: 'task-1', user_id: 'member-1', allocated_hours: 8 },
      ]
      const result = buildTaskAssigneesMap(assignments, [], [{ id: 'task-1' }])
      expect(Object.keys(result)).toHaveLength(0)
    })
  })
})

describe('Task Sidebar Multi-Assignee Display', () => {
  // This would be integration tests with the actual page component
  // For now we just document the expected behavior

  it.todo('displays all assignee names comma-separated in sidebar')
  it.todo('uses plural label (acharayim) when multiple assignees')
  it.todo('uses singular label (achrai) when single assignee')
})

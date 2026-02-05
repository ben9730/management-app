/**
 * useTaskAssignments Hook Tests (TDD)
 *
 * Tests for task assignment hooks including multi-assignee support.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useTaskAssignments,
  useTaskAssignmentsByProject,
  taskAssignmentKeys,
} from './use-task-assignments'

// Mock the task-assignments service
vi.mock('@/services/task-assignments', () => ({
  getTaskAssignments: vi.fn(),
  getTaskAssignmentsByProject: vi.fn(),
  getTaskAssignment: vi.fn(),
  createTaskAssignment: vi.fn(),
  updateTaskAssignment: vi.fn(),
  deleteTaskAssignment: vi.fn(),
}))

import {
  getTaskAssignments,
  getTaskAssignmentsByProject,
} from '@/services/task-assignments'

const mockedGetTaskAssignments = vi.mocked(getTaskAssignments)
const mockedGetTaskAssignmentsByProject = vi.mocked(getTaskAssignmentsByProject)

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useTaskAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Query Key Structure', () => {
    it('has correct query key for task assignments list', () => {
      expect(taskAssignmentKeys.listByTask('task-1')).toEqual([
        'task-assignments',
        'list',
        'task',
        'task-1',
      ])
    })

    it('has correct query key for project assignments list', () => {
      expect(taskAssignmentKeys.listByProject('proj-1')).toEqual([
        'task-assignments',
        'list',
        'project',
        'proj-1',
      ])
    })
  })

  describe('useTaskAssignments (by task ID)', () => {
    it('returns ALL assignments for a task with multiple assignees', async () => {
      const mockAssignments = [
        {
          id: 'asgn-1',
          task_id: 'task-1',
          user_id: 'member-1',
          allocated_hours: 8,
          actual_hours: 0,
          notes: null,
          created_at: '2026-01-15T10:00:00Z',
        },
        {
          id: 'asgn-2',
          task_id: 'task-1',
          user_id: 'member-2',
          allocated_hours: 16,
          actual_hours: 4,
          notes: null,
          created_at: '2026-01-15T10:00:00Z',
        },
        {
          id: 'asgn-3',
          task_id: 'task-1',
          user_id: 'member-3',
          allocated_hours: 8,
          actual_hours: 2,
          notes: 'Part-time work',
          created_at: '2026-01-15T11:00:00Z',
        },
      ]

      mockedGetTaskAssignments.mockResolvedValue({
        data: mockAssignments,
        error: null,
      })

      const { result } = renderHook(() => useTaskAssignments('task-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(3)
      expect(result.current.data?.map(a => a.user_id)).toEqual([
        'member-1',
        'member-2',
        'member-3',
      ])
    })

    it('returns empty array for task with no assignments', async () => {
      mockedGetTaskAssignments.mockResolvedValue({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => useTaskAssignments('task-no-assignees'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })

    it('does not fetch when taskId is empty', () => {
      const { result } = renderHook(() => useTaskAssignments(''), {
        wrapper: createWrapper(),
      })

      expect(mockedGetTaskAssignments).not.toHaveBeenCalled()
      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useTaskAssignmentsByProject', () => {
    it('returns ALL assignments for ALL tasks in a project', async () => {
      const mockProjectAssignments = [
        // Task 1 has 2 assignees
        {
          id: 'asgn-1',
          task_id: 'task-1',
          user_id: 'member-1',
          allocated_hours: 8,
          actual_hours: 0,
          notes: null,
          created_at: '2026-01-15T10:00:00Z',
        },
        {
          id: 'asgn-2',
          task_id: 'task-1',
          user_id: 'member-2',
          allocated_hours: 8,
          actual_hours: 0,
          notes: null,
          created_at: '2026-01-15T10:00:00Z',
        },
        // Task 2 has 1 assignee
        {
          id: 'asgn-3',
          task_id: 'task-2',
          user_id: 'member-3',
          allocated_hours: 16,
          actual_hours: 8,
          notes: null,
          created_at: '2026-01-15T11:00:00Z',
        },
        // Task 3 has 3 assignees
        {
          id: 'asgn-4',
          task_id: 'task-3',
          user_id: 'member-1',
          allocated_hours: 4,
          actual_hours: 0,
          notes: null,
          created_at: '2026-01-15T12:00:00Z',
        },
        {
          id: 'asgn-5',
          task_id: 'task-3',
          user_id: 'member-2',
          allocated_hours: 4,
          actual_hours: 0,
          notes: null,
          created_at: '2026-01-15T12:00:00Z',
        },
        {
          id: 'asgn-6',
          task_id: 'task-3',
          user_id: 'member-3',
          allocated_hours: 4,
          actual_hours: 0,
          notes: null,
          created_at: '2026-01-15T12:00:00Z',
        },
      ]

      mockedGetTaskAssignmentsByProject.mockResolvedValue({
        data: mockProjectAssignments,
        error: null,
      })

      const { result } = renderHook(() => useTaskAssignmentsByProject('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Should return ALL 6 assignments
      expect(result.current.data).toHaveLength(6)

      // Verify assignments are grouped correctly by task
      const task1Assignments = result.current.data?.filter(a => a.task_id === 'task-1')
      const task2Assignments = result.current.data?.filter(a => a.task_id === 'task-2')
      const task3Assignments = result.current.data?.filter(a => a.task_id === 'task-3')

      expect(task1Assignments).toHaveLength(2)
      expect(task2Assignments).toHaveLength(1)
      expect(task3Assignments).toHaveLength(3)
    })

    it('returns empty array for project with no task assignments', async () => {
      mockedGetTaskAssignmentsByProject.mockResolvedValue({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => useTaskAssignmentsByProject('proj-empty'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })

    it('does not fetch when projectId is empty', () => {
      const { result } = renderHook(() => useTaskAssignmentsByProject(''), {
        wrapper: createWrapper(),
      })

      expect(mockedGetTaskAssignmentsByProject).not.toHaveBeenCalled()
      expect(result.current.fetchStatus).toBe('idle')
    })

    it('handles service error gracefully', async () => {
      mockedGetTaskAssignmentsByProject.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      })

      const { result } = renderHook(() => useTaskAssignmentsByProject('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('Database connection failed')
    })
  })
})

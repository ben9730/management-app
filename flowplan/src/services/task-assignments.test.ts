/**
 * Task Assignments Service Tests (TDD)
 *
 * Tests for CRUD operations for task assignments.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTaskAssignment,
  getTaskAssignment,
  getTaskAssignments,
  getTaskAssignmentsByUser,
  getTaskAssignmentsByProject,
  updateTaskAssignment,
  deleteTaskAssignment,
} from './task-assignments'

// Mock the Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
          order: vi.fn(() => ({
            then: vi.fn(),
          })),
        })),
        order: vi.fn(() => ({
          then: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}))

import { supabase } from '@/lib/supabase'

describe('Task Assignments Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTaskAssignment', () => {
    it('creates a task assignment with required fields', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        task_id: 'task-1',
        user_id: 'user-1',
        allocated_hours: 8,
        actual_hours: 0,
        start_date: null,
        end_date: null,
        notes: null,
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockAssignment, error: null }),
          }),
        }),
      } as any)

      const result = await createTaskAssignment({
        task_id: 'task-1',
        user_id: 'user-1',
        allocated_hours: 8,
      })

      expect(result.error).toBeNull()
      expect(result.data).toEqual(mockAssignment)
    })

    it('creates a task assignment with all optional fields', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        task_id: 'task-1',
        user_id: 'user-1',
        allocated_hours: 16,
        actual_hours: 0,
        start_date: '2026-02-01',
        end_date: null,
        notes: 'High priority work',
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockAssignment, error: null }),
          }),
        }),
      } as any)

      const result = await createTaskAssignment({
        task_id: 'task-1',
        user_id: 'user-1',
        allocated_hours: 16,
        start_date: new Date('2026-02-01'),
        notes: 'High priority work',
      })

      expect(result.error).toBeNull()
      expect(result.data?.notes).toBe('High priority work')
      expect(result.data?.start_date).toBe('2026-02-01')
    })

    it('returns error when task_id is missing', async () => {
      const result = await createTaskAssignment({
        task_id: '',
        user_id: 'user-1',
        allocated_hours: 8,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('task_id')
    })

    it('returns error when user_id is missing', async () => {
      const result = await createTaskAssignment({
        task_id: 'task-1',
        user_id: '',
        allocated_hours: 8,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('user_id')
    })

    it('returns error when allocated_hours is zero or negative', async () => {
      const result = await createTaskAssignment({
        task_id: 'task-1',
        user_id: 'user-1',
        allocated_hours: 0,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('allocated_hours')
    })

    it('returns error when allocated_hours is negative', async () => {
      const result = await createTaskAssignment({
        task_id: 'task-1',
        user_id: 'user-1',
        allocated_hours: -5,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('allocated_hours')
    })

    it('handles database error gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error', code: 'PGRST001' },
            }),
          }),
        }),
      } as any)

      const result = await createTaskAssignment({
        task_id: 'task-1',
        user_id: 'user-1',
        allocated_hours: 8,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Database error')
      expect(result.error?.code).toBe('PGRST001')
    })
  })

  describe('getTaskAssignment', () => {
    it('returns a task assignment by ID', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        task_id: 'task-1',
        user_id: 'user-1',
        allocated_hours: 8,
        actual_hours: 4,
        start_date: '2026-02-01',
        end_date: null,
        notes: 'In progress',
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockAssignment, error: null }),
          }),
        }),
      } as any)

      const result = await getTaskAssignment('assignment-1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(mockAssignment)
    })

    it('returns null when assignment not found', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any)

      const result = await getTaskAssignment('non-existent')

      expect(result.error).toBeNull()
      expect(result.data).toBeNull()
    })

    it('handles database error gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Connection error', code: 'PGRST002' },
            }),
          }),
        }),
      } as any)

      const result = await getTaskAssignment('assignment-1')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Connection error')
    })
  })

  describe('getTaskAssignments', () => {
    it('returns all assignments for a task', async () => {
      const mockAssignments = [
        {
          id: 'assignment-1',
          task_id: 'task-1',
          user_id: 'user-1',
          allocated_hours: 8,
          actual_hours: 4,
          start_date: '2026-02-01',
          end_date: null,
          notes: null,
        },
        {
          id: 'assignment-2',
          task_id: 'task-1',
          user_id: 'user-2',
          allocated_hours: 16,
          actual_hours: 8,
          start_date: '2026-02-01',
          end_date: null,
          notes: 'Backend work',
        },
      ]

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockAssignments, error: null }),
          }),
        }),
      } as any)

      const result = await getTaskAssignments('task-1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(2)
    })

    it('returns empty array when no assignments exist', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any)

      const result = await getTaskAssignments('task-1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('returns empty array when data is null', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any)

      const result = await getTaskAssignments('task-1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('handles database error gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Query failed', code: 'PGRST003' },
            }),
          }),
        }),
      } as any)

      const result = await getTaskAssignments('task-1')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Query failed')
    })
  })

  describe('getTaskAssignmentsByUser', () => {
    it('returns all assignments for a user', async () => {
      const mockAssignments = [
        {
          id: 'assignment-1',
          task_id: 'task-1',
          user_id: 'user-1',
          allocated_hours: 8,
          actual_hours: 4,
          start_date: '2026-02-01',
          end_date: null,
          notes: null,
        },
        {
          id: 'assignment-3',
          task_id: 'task-2',
          user_id: 'user-1',
          allocated_hours: 24,
          actual_hours: 20,
          start_date: '2026-02-05',
          end_date: '2026-02-08',
          notes: 'Completed',
        },
      ]

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockAssignments, error: null }),
          }),
        }),
      } as any)

      const result = await getTaskAssignmentsByUser('user-1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(2)
      expect(result.data?.[0].user_id).toBe('user-1')
      expect(result.data?.[1].user_id).toBe('user-1')
    })

    it('returns empty array when user has no assignments', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any)

      const result = await getTaskAssignmentsByUser('user-with-no-assignments')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('returns empty array when data is null', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any)

      const result = await getTaskAssignmentsByUser('user-1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('handles database error gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Query failed', code: 'PGRST003' },
            }),
          }),
        }),
      } as any)

      const result = await getTaskAssignmentsByUser('user-1')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Query failed')
    })
  })

  describe('getTaskAssignmentsByProject', () => {
    it('returns ALL assignments for ALL tasks in a project (multi-assignee support)', async () => {
      // Mock data: One task with 2 assignees, another task with 1 assignee
      const mockAssignmentsWithJoin = [
        {
          id: 'assignment-1',
          task_id: 'task-1',
          user_id: 'user-1',
          allocated_hours: 8,
          actual_hours: 0,
          start_date: null,
          end_date: null,
          notes: null,
          tasks: { project_id: 'proj-1' }, // Join data
        },
        {
          id: 'assignment-2',
          task_id: 'task-1',
          user_id: 'user-2', // SECOND assignee for same task
          allocated_hours: 8,
          actual_hours: 0,
          start_date: null,
          end_date: null,
          notes: null,
          tasks: { project_id: 'proj-1' },
        },
        {
          id: 'assignment-3',
          task_id: 'task-2',
          user_id: 'user-3',
          allocated_hours: 16,
          actual_hours: 8,
          start_date: null,
          end_date: null,
          notes: null,
          tasks: { project_id: 'proj-1' },
        },
      ]

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockAssignmentsWithJoin, error: null }),
          }),
        }),
      } as any)

      const result = await getTaskAssignmentsByProject('proj-1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(3) // All 3 assignments
      // Verify task-1 has 2 assignments (multi-assignee)
      const task1Assignments = result.data?.filter(a => a.task_id === 'task-1')
      expect(task1Assignments).toHaveLength(2)
      expect(task1Assignments?.map(a => a.user_id)).toEqual(['user-1', 'user-2'])
    })

    it('strips join data from results (returns clean TaskAssignment objects)', async () => {
      const mockAssignmentsWithJoin = [
        {
          id: 'assignment-1',
          task_id: 'task-1',
          user_id: 'user-1',
          allocated_hours: 8,
          tasks: { project_id: 'proj-1' }, // This should be stripped
        },
      ]

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockAssignmentsWithJoin, error: null }),
          }),
        }),
      } as any)

      const result = await getTaskAssignmentsByProject('proj-1')

      expect(result.data?.[0]).not.toHaveProperty('tasks')
      expect(result.data?.[0].id).toBe('assignment-1')
    })

    it('returns empty array when no assignments exist', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any)

      const result = await getTaskAssignmentsByProject('proj-1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('handles database error gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Join failed', code: 'PGRST404' },
            }),
          }),
        }),
      } as any)

      const result = await getTaskAssignmentsByProject('proj-1')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Join failed')
    })
  })

  describe('updateTaskAssignment', () => {
    it('updates allocated_hours', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        task_id: 'task-1',
        user_id: 'user-1',
        allocated_hours: 16,
        actual_hours: 4,
        start_date: '2026-02-01',
        end_date: null,
        notes: null,
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockAssignment, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updateTaskAssignment('assignment-1', {
        allocated_hours: 16,
      })

      expect(result.error).toBeNull()
      expect(result.data?.allocated_hours).toBe(16)
    })

    it('updates actual_hours', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        task_id: 'task-1',
        user_id: 'user-1',
        allocated_hours: 8,
        actual_hours: 6,
        start_date: '2026-02-01',
        end_date: null,
        notes: null,
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockAssignment, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updateTaskAssignment('assignment-1', { actual_hours: 6 })

      expect(result.error).toBeNull()
      expect(result.data?.actual_hours).toBe(6)
    })

    it('updates notes', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        task_id: 'task-1',
        user_id: 'user-1',
        allocated_hours: 8,
        actual_hours: 4,
        start_date: '2026-02-01',
        end_date: null,
        notes: 'Updated notes',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockAssignment, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updateTaskAssignment('assignment-1', {
        notes: 'Updated notes',
      })

      expect(result.error).toBeNull()
      expect(result.data?.notes).toBe('Updated notes')
    })

    it('clears notes to null', async () => {
      const mockAssignment = {
        id: 'assignment-1',
        task_id: 'task-1',
        user_id: 'user-1',
        allocated_hours: 8,
        actual_hours: 4,
        start_date: '2026-02-01',
        end_date: null,
        notes: null,
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockAssignment, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updateTaskAssignment('assignment-1', { notes: null })

      expect(result.error).toBeNull()
      expect(result.data?.notes).toBeNull()
    })

    it('returns error when allocated_hours is zero or negative', async () => {
      const result = await updateTaskAssignment('assignment-1', {
        allocated_hours: 0,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('allocated_hours')
    })

    it('returns error when actual_hours is negative', async () => {
      const result = await updateTaskAssignment('assignment-1', {
        actual_hours: -1,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('actual_hours')
    })

    it('handles database error gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed', code: 'PGRST004' },
              }),
            }),
          }),
        }),
      } as any)

      const result = await updateTaskAssignment('assignment-1', { notes: 'New notes' })

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Update failed')
    })
  })

  describe('deleteTaskAssignment', () => {
    it('deletes a task assignment', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any)

      const result = await deleteTaskAssignment('assignment-1')

      expect(result.error).toBeNull()
    })

    it('handles delete error', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Record not found', code: 'PGRST116' },
          }),
        }),
      } as any)

      const result = await deleteTaskAssignment('non-existent')

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toBe('Record not found')
    })
  })
})

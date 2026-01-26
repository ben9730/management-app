/**
 * Tasks Service Tests (TDD)
 *
 * Tests for task CRUD operations service layer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTask,
  getTask,
  getTasks,
  updateTask,
  deleteTask,
  reorderTasks,
  type CreateTaskInput,
  type UpdateTaskInput,
} from './tasks'
import type { Task } from '@/types/entities'

// Mock Supabase client - use vi.hoisted to properly hoist the mock
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  in: vi.fn(),
}))

// Setup chainable mock methods
mockSupabase.from.mockReturnValue(mockSupabase)
mockSupabase.select.mockReturnValue(mockSupabase)
mockSupabase.insert.mockReturnValue(mockSupabase)
mockSupabase.update.mockReturnValue(mockSupabase)
mockSupabase.delete.mockReturnValue(mockSupabase)
mockSupabase.eq.mockReturnValue(mockSupabase)
mockSupabase.order.mockReturnValue(mockSupabase)
mockSupabase.in.mockReturnValue(mockSupabase)

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

const mockTask: Task = {
  id: 'task-1',
  project_id: 'proj-1',
  phase_id: 'phase-1',
  title: 'Test Task',
  description: 'Test description',
  task_type: 'task',
  status: 'pending',
  priority: 'medium',
  start_date: '2026-01-20',
  due_date: '2026-01-25',
  estimated_hours: 16,
  actual_hours: 0,
  progress_percent: 0,
  wbs_number: '1.1.1',
  order_index: 0,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
}

describe('Tasks Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chainable mocks
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.insert.mockReturnValue(mockSupabase)
    mockSupabase.update.mockReturnValue(mockSupabase)
    mockSupabase.delete.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.order.mockReturnValue(mockSupabase)
    mockSupabase.in.mockReturnValue(mockSupabase)
  })

  describe('createTask', () => {
    it('creates a task with required fields', async () => {
      const input: CreateTaskInput = {
        project_id: 'proj-1',
        title: 'New Task',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockTask, ...input },
        error: null,
      })

      const result = await createTask(input)

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'proj-1',
          title: 'New Task',
        })
      )
      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
    })

    it('creates a task with all optional fields', async () => {
      const input: CreateTaskInput = {
        project_id: 'proj-1',
        phase_id: 'phase-1',
        title: 'Full Task',
        description: 'Full description',
        task_type: 'milestone',
        status: 'in_progress',
        priority: 'high',
        start_date: '2026-02-01',
        due_date: '2026-02-10',
        estimated_hours: 24,
        wbs_number: '2.1.1',
        order_index: 5,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockTask, ...input, id: 'task-2' },
        error: null,
      })

      const result = await createTask(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          phase_id: 'phase-1',
          description: 'Full description',
          task_type: 'milestone',
          priority: 'high',
        })
      )
      expect(result.data?.title).toBe('Full Task')
    })

    it('returns error when creation fails', async () => {
      const input: CreateTaskInput = {
        project_id: 'proj-1',
        title: 'Failing Task',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: '500' },
      })

      const result = await createTask(input)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Database error')
    })

    it('sets default values for optional fields', async () => {
      const input: CreateTaskInput = {
        project_id: 'proj-1',
        title: 'Minimal Task',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockTask,
        error: null,
      })

      await createTask(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          task_type: 'task',
          status: 'pending',
          priority: 'medium',
          progress_percent: 0,
          actual_hours: 0,
        })
      )
    })

    it('validates title is not empty', async () => {
      const input: CreateTaskInput = {
        project_id: 'proj-1',
        title: '',
      }

      const result = await createTask(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('title')
    })

    it('validates project_id is provided', async () => {
      const input = {
        title: 'Test Task',
      } as CreateTaskInput

      const result = await createTask(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('project')
    })

    it('validates estimated_hours is positive', async () => {
      const input: CreateTaskInput = {
        project_id: 'proj-1',
        title: 'Test Task',
        estimated_hours: -5,
      }

      const result = await createTask(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('estimated_hours')
    })

    it('validates progress_percent is 0-100', async () => {
      const input: CreateTaskInput = {
        project_id: 'proj-1',
        title: 'Test Task',
        progress_percent: 150,
      }

      const result = await createTask(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('progress')
    })
  })

  describe('getTask', () => {
    it('retrieves a task by ID', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: mockTask,
        error: null,
      })

      const result = await getTask('task-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
      expect(mockSupabase.select).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'task-1')
      expect(result.data).toEqual(mockTask)
    })

    it('returns null when task not found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const result = await getTask('non-existent')

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('returns error on database failure', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection error', code: '500' },
      })

      const result = await getTask('task-1')

      expect(result.error).toBeDefined()
    })
  })

  describe('getTasks', () => {
    it('retrieves all tasks for a project', async () => {
      const tasks = [mockTask, { ...mockTask, id: 'task-2', title: 'Task 2' }]

      mockSupabase.order.mockResolvedValueOnce({
        data: tasks,
        error: null,
      })

      const result = await getTasks('proj-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
      expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', 'proj-1')
      expect(mockSupabase.order).toHaveBeenCalledWith('order_index', {
        ascending: true,
      })
      expect(result.data).toHaveLength(2)
    })

    it('returns empty array when no tasks exist', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await getTasks('proj-1')

      expect(result.data).toEqual([])
    })

    it('filters by phase_id when provided', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockTask],
        error: null,
      })

      await getTasks('proj-1', { phase_id: 'phase-1' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('phase_id', 'phase-1')
    })

    it('filters by status when provided', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockTask],
        error: null,
      })

      await getTasks('proj-1', { status: 'in_progress' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'in_progress')
    })

    it('filters by priority when provided', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockTask],
        error: null,
      })

      await getTasks('proj-1', { priority: 'high' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('priority', 'high')
    })

    it('filters by task_type when provided', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockTask],
        error: null,
      })

      await getTasks('proj-1', { task_type: 'milestone' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('task_type', 'milestone')
    })
  })

  describe('updateTask', () => {
    it('updates task fields', async () => {
      const updates: UpdateTaskInput = {
        title: 'Updated Title',
        description: 'Updated description',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockTask, ...updates },
        error: null,
      })

      const result = await updateTask('task-1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Title',
          description: 'Updated description',
        })
      )
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'task-1')
      expect(result.data?.title).toBe('Updated Title')
    })

    it('updates task status', async () => {
      const updates: UpdateTaskInput = {
        status: 'completed',
        progress_percent: 100,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockTask, ...updates },
        error: null,
      })

      const result = await updateTask('task-1', updates)

      expect(result.data?.status).toBe('completed')
      expect(result.data?.progress_percent).toBe(100)
    })

    it('updates task progress and actual hours', async () => {
      const updates: UpdateTaskInput = {
        progress_percent: 75,
        actual_hours: 12,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockTask, ...updates },
        error: null,
      })

      const result = await updateTask('task-1', updates)

      expect(result.data?.progress_percent).toBe(75)
      expect(result.data?.actual_hours).toBe(12)
    })

    it('returns error when update fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed', code: '500' },
      })

      const result = await updateTask('task-1', { title: 'New Title' })

      expect(result.error).toBeDefined()
    })

    it('sets updated_at timestamp', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: mockTask,
        error: null,
      })

      await updateTask('task-1', { title: 'New Title' })

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        })
      )
    })

    it('validates progress_percent on update', async () => {
      const result = await updateTask('task-1', { progress_percent: 110 })

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('progress')
    })
  })

  describe('deleteTask', () => {
    it('deletes a task by ID', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const result = await deleteTask('task-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'task-1')
      expect(result.error).toBeNull()
    })

    it('returns error when delete fails', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Delete failed', code: '500' },
      })

      const result = await deleteTask('task-1')

      expect(result.error).toBeDefined()
    })
  })

  describe('reorderTasks', () => {
    it('updates order_index for multiple tasks', async () => {
      const taskOrders = [
        { id: 'task-1', order_index: 2 },
        { id: 'task-2', order_index: 0 },
        { id: 'task-3', order_index: 1 },
      ]

      // Mock multiple update calls
      mockSupabase.single.mockResolvedValue({
        data: mockTask,
        error: null,
      })

      const result = await reorderTasks(taskOrders)

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks')
      expect(mockSupabase.update).toHaveBeenCalledTimes(3)
      expect(result.error).toBeNull()
    })

    it('returns error if any update fails', async () => {
      const taskOrders = [
        { id: 'task-1', order_index: 0 },
        { id: 'task-2', order_index: 1 },
      ]

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockTask, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Update failed', code: '500' },
        })

      const result = await reorderTasks(taskOrders)

      expect(result.error).toBeDefined()
    })

    it('validates order_index is non-negative', async () => {
      const taskOrders = [
        { id: 'task-1', order_index: -1 },
      ]

      const result = await reorderTasks(taskOrders)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('order_index')
    })
  })
})

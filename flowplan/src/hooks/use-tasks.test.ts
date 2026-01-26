/**
 * useTasks Hook Tests (TDD)
 *
 * Tests for React Query hooks for tasks data fetching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from './use-tasks'
import * as tasksService from '@/services/tasks'
import type { Task } from '@/types/entities'

// Mock the Supabase client to prevent env var errors
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

// Mock the tasks service
vi.mock('@/services/tasks')

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

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useTasks Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useTasks', () => {
    it('fetches tasks for a project', async () => {
      const tasks = [mockTask, { ...mockTask, id: 'task-2', title: 'Task 2' }]
      vi.mocked(tasksService.getTasks).mockResolvedValueOnce({
        data: tasks,
        error: null,
      })

      const { result } = renderHook(() => useTasks('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(tasksService.getTasks).toHaveBeenCalledWith('proj-1', undefined)
    })

    it('applies filters when provided', async () => {
      vi.mocked(tasksService.getTasks).mockResolvedValueOnce({
        data: [mockTask],
        error: null,
      })

      const { result } = renderHook(
        () => useTasks('proj-1', { status: 'in_progress' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(tasksService.getTasks).toHaveBeenCalledWith('proj-1', {
        status: 'in_progress',
      })
    })

    it('handles error state', async () => {
      vi.mocked(tasksService.getTasks).mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to fetch' },
      })

      const { result } = renderHook(() => useTasks('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useTask', () => {
    it('fetches a single task by ID', async () => {
      vi.mocked(tasksService.getTask).mockResolvedValueOnce({
        data: mockTask,
        error: null,
      })

      const { result } = renderHook(() => useTask('task-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockTask)
      expect(tasksService.getTask).toHaveBeenCalledWith('task-1')
    })

    it('is disabled when ID is not provided', () => {
      const { result } = renderHook(() => useTask(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useCreateTask', () => {
    it('creates a new task', async () => {
      vi.mocked(tasksService.createTask).mockResolvedValueOnce({
        data: mockTask,
        error: null,
      })

      const { result } = renderHook(() => useCreateTask(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        project_id: 'proj-1',
        title: 'New Task',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(tasksService.createTask).toHaveBeenCalledWith({
        project_id: 'proj-1',
        title: 'New Task',
      })
    })

    it('handles creation error', async () => {
      vi.mocked(tasksService.createTask).mockResolvedValueOnce({
        data: null,
        error: { message: 'Creation failed' },
      })

      const { result } = renderHook(() => useCreateTask(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        project_id: 'proj-1',
        title: 'Failing Task',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useUpdateTask', () => {
    it('updates an existing task', async () => {
      const updatedTask = { ...mockTask, title: 'Updated Title' }
      vi.mocked(tasksService.updateTask).mockResolvedValueOnce({
        data: updatedTask,
        error: null,
      })

      const { result } = renderHook(() => useUpdateTask(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'task-1',
        updates: { title: 'Updated Title' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(tasksService.updateTask).toHaveBeenCalledWith('task-1', {
        title: 'Updated Title',
      })
    })

    it('handles update error', async () => {
      vi.mocked(tasksService.updateTask).mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      })

      const { result } = renderHook(() => useUpdateTask(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'task-1',
        updates: { title: 'New Title' },
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useDeleteTask', () => {
    it('deletes a task', async () => {
      vi.mocked(tasksService.deleteTask).mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => useDeleteTask(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('task-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(tasksService.deleteTask).toHaveBeenCalledWith('task-1')
    })

    it('handles delete error', async () => {
      vi.mocked(tasksService.deleteTask).mockResolvedValueOnce({
        data: null,
        error: { message: 'Delete failed' },
      })

      const { result } = renderHook(() => useDeleteTask(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('task-1')

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })
})

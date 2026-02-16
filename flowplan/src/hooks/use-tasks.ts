/**
 * useTasks Hook
 *
 * React Query hooks for tasks data fetching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TasksFilter,
} from '@/services/tasks'
import type { Task } from '@/types/entities'
import { phaseKeys } from '@/hooks/use-phases'

// Query keys for cache management
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (projectId: string, filter?: TasksFilter) =>
    [...taskKeys.lists(), projectId, filter] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}

/**
 * Hook to fetch all tasks for a project
 */
export function useTasks(projectId: string, filter?: TasksFilter) {
  return useQuery({
    queryKey: taskKeys.list(projectId, filter),
    queryFn: async () => {
      const result = await getTasks(projectId, filter)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
  })
}

/**
 * Hook to fetch a single task by ID
 */
export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const result = await getTask(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const result = await createTask(input)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as Task
    },
    onSuccess: (data) => {
      // Add the new task to the detail cache
      queryClient.setQueryData(taskKeys.detail(data.id), data)
      // NOTE: Do NOT invalidate taskKeys.lists() here -- recalculate() handles cache.
      // Invalidate phases to update progress counts (DB triggers update phase counts)
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() })
    },
  })
}

/**
 * Hook to update an existing task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: UpdateTaskInput
    }) => {
      const result = await updateTask(id, updates)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as Task
    },
    onSuccess: (data) => {
      // Update the task in cache
      queryClient.setQueryData(taskKeys.detail(data.id), data)
      // NOTE: Do NOT invalidate taskKeys.lists() here.
      // All callers follow mutations with recalculate() which handles cache
      // via setQueryData + batchUpdateTaskCPMFields + invalidateQueries.
      // Invalidating here causes a race: the refetch resolves with stale DB
      // data and overwrites the optimistic CPM update from recalculate().
      // Invalidate phases to update progress counts (DB triggers update phase counts)
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() })
    },
  })
}

/**
 * Hook to delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteTask(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return id
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) })
      // NOTE: Do NOT invalidate taskKeys.lists() here -- recalculate() handles cache.
      // Invalidate phases to update progress counts (DB triggers update phase counts)
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() })
    },
  })
}

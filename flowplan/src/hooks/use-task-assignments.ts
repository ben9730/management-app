/**
 * useTaskAssignments Hook
 *
 * React Query hooks for task assignments data fetching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTaskAssignments,
  getTaskAssignment,
  getTaskAssignmentsByUser,
  getTaskAssignmentsByProject,
  createTaskAssignment,
  updateTaskAssignment,
  deleteTaskAssignment,
  type UpdateTaskAssignmentInput,
} from '@/services/task-assignments'
import type { TaskAssignment, CreateTaskAssignmentInput } from '@/types/entities'

// Query keys for cache management
export const taskAssignmentKeys = {
  all: ['task-assignments'] as const,
  lists: () => [...taskAssignmentKeys.all, 'list'] as const,
  listByTask: (taskId: string) =>
    [...taskAssignmentKeys.lists(), 'task', taskId] as const,
  listByUser: (userId: string) =>
    [...taskAssignmentKeys.lists(), 'user', userId] as const,
  listByProject: (projectId: string) =>
    [...taskAssignmentKeys.lists(), 'project', projectId] as const,
  details: () => [...taskAssignmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskAssignmentKeys.details(), id] as const,
}

/**
 * Hook to fetch all task assignments for a task
 */
export function useTaskAssignments(taskId: string) {
  return useQuery({
    queryKey: taskAssignmentKeys.listByTask(taskId),
    queryFn: async () => {
      const result = await getTaskAssignments(taskId)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
    enabled: !!taskId,
  })
}

/**
 * Hook to fetch all task assignments for a user
 */
export function useTaskAssignmentsByUser(userId: string) {
  return useQuery({
    queryKey: taskAssignmentKeys.listByUser(userId),
    queryFn: async () => {
      const result = await getTaskAssignmentsByUser(userId)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
    enabled: !!userId,
  })
}

/**
 * Hook to fetch all task assignments for a project
 * Returns all assignments for all tasks in the project
 */
export function useTaskAssignmentsByProject(projectId: string) {
  return useQuery({
    queryKey: taskAssignmentKeys.listByProject(projectId),
    queryFn: async () => {
      const result = await getTaskAssignmentsByProject(projectId)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
    enabled: !!projectId,
  })
}

/**
 * Hook to fetch a single task assignment by ID
 */
export function useTaskAssignment(id: string) {
  return useQuery({
    queryKey: taskAssignmentKeys.detail(id),
    queryFn: async () => {
      const result = await getTaskAssignment(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a new task assignment
 */
export function useCreateTaskAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTaskAssignmentInput) => {
      const result = await createTaskAssignment(input)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as TaskAssignment
    },
    onSuccess: (data) => {
      // Invalidate task-specific queries
      queryClient.invalidateQueries({
        queryKey: taskAssignmentKeys.listByTask(data.task_id),
      })
      // Invalidate user-specific queries
      queryClient.invalidateQueries({
        queryKey: taskAssignmentKeys.listByUser(data.user_id),
      })
      // Invalidate ALL project-level queries (we don't know which project)
      queryClient.invalidateQueries({
        queryKey: taskAssignmentKeys.lists(),
      })
      // Add the new assignment to the cache
      queryClient.setQueryData(taskAssignmentKeys.detail(data.id), data)
    },
  })
}

/**
 * Hook to update an existing task assignment
 */
export function useUpdateTaskAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: UpdateTaskAssignmentInput
    }) => {
      const result = await updateTaskAssignment(id, updates)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as TaskAssignment
    },
    onSuccess: (data) => {
      // Update the assignment in cache
      queryClient.setQueryData(taskAssignmentKeys.detail(data.id), data)
      // Invalidate task-specific queries
      queryClient.invalidateQueries({
        queryKey: taskAssignmentKeys.listByTask(data.task_id),
      })
      // Invalidate user-specific queries
      queryClient.invalidateQueries({
        queryKey: taskAssignmentKeys.listByUser(data.user_id),
      })
    },
  })
}

/**
 * Hook to delete a task assignment
 */
export function useDeleteTaskAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, taskId, userId }: { id: string; taskId: string; userId: string }) => {
      const result = await deleteTaskAssignment(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return { id, taskId, userId }
    },
    onSuccess: ({ id, taskId, userId }) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: taskAssignmentKeys.detail(id) })
      // Invalidate task-specific queries
      queryClient.invalidateQueries({
        queryKey: taskAssignmentKeys.listByTask(taskId),
      })
      // Invalidate user-specific queries
      queryClient.invalidateQueries({
        queryKey: taskAssignmentKeys.listByUser(userId),
      })
      // Invalidate ALL project-level queries (we don't know which project)
      queryClient.invalidateQueries({
        queryKey: taskAssignmentKeys.lists(),
      })
    },
  })
}

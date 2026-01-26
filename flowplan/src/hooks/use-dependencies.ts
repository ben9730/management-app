/**
 * useDependencies Hook
 *
 * React Query hooks for dependencies data fetching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDependencies,
  getDependency,
  getDependenciesForTask,
  createDependency,
  updateDependency,
  deleteDependency,
  type CreateDependencyInput,
  type UpdateDependencyInput,
} from '@/services/dependencies'
import type { Dependency } from '@/types/entities'

// Query keys for cache management
export const dependencyKeys = {
  all: ['dependencies'] as const,
  lists: () => [...dependencyKeys.all, 'list'] as const,
  list: (projectId: string) => [...dependencyKeys.lists(), projectId] as const,
  forTask: (taskId: string) => [...dependencyKeys.all, 'task', taskId] as const,
  details: () => [...dependencyKeys.all, 'detail'] as const,
  detail: (id: string) => [...dependencyKeys.details(), id] as const,
}

/**
 * Hook to fetch all dependencies for a project
 */
export function useDependencies(projectId: string) {
  return useQuery({
    queryKey: dependencyKeys.list(projectId),
    queryFn: async () => {
      const result = await getDependencies(projectId)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
  })
}

/**
 * Hook to fetch a single dependency by ID
 */
export function useDependency(id: string) {
  return useQuery({
    queryKey: dependencyKeys.detail(id),
    queryFn: async () => {
      const result = await getDependency(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch all dependencies for a specific task
 */
export function useDependenciesForTask(taskId: string) {
  return useQuery({
    queryKey: dependencyKeys.forTask(taskId),
    queryFn: async () => {
      const result = await getDependenciesForTask(taskId)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
    enabled: !!taskId,
  })
}

/**
 * Hook to create a new dependency
 */
export function useCreateDependency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateDependencyInput) => {
      const result = await createDependency(input)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as Dependency
    },
    onSuccess: (data) => {
      // Invalidate dependencies lists to refetch
      queryClient.invalidateQueries({ queryKey: dependencyKeys.lists() })
      // Also invalidate task-specific dependencies
      queryClient.invalidateQueries({
        queryKey: dependencyKeys.forTask(data.predecessor_id),
      })
      queryClient.invalidateQueries({
        queryKey: dependencyKeys.forTask(data.successor_id),
      })
      // Add the new dependency to the cache
      queryClient.setQueryData(dependencyKeys.detail(data.id), data)
    },
  })
}

/**
 * Hook to update an existing dependency
 */
export function useUpdateDependency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: UpdateDependencyInput
    }) => {
      const result = await updateDependency(id, updates)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as Dependency
    },
    onSuccess: (data) => {
      // Update the dependency in cache
      queryClient.setQueryData(dependencyKeys.detail(data.id), data)
      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: dependencyKeys.lists() })
      // Invalidate task-specific queries
      queryClient.invalidateQueries({
        queryKey: dependencyKeys.forTask(data.predecessor_id),
      })
      queryClient.invalidateQueries({
        queryKey: dependencyKeys.forTask(data.successor_id),
      })
    },
  })
}

/**
 * Hook to delete a dependency
 */
export function useDeleteDependency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteDependency(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return id
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: dependencyKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: dependencyKeys.lists() })
      // Note: We can't easily invalidate task-specific queries here
      // since we don't have the predecessor/successor IDs
      // The lists invalidation will handle most cases
    },
  })
}

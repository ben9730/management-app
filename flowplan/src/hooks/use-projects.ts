/**
 * useProjects Hook
 *
 * React Query hooks for projects data fetching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  type CreateProjectInput,
  type UpdateProjectInput,
  type ProjectsFilter,
} from '@/services/projects'
import type { Project } from '@/types/entities'

// Query keys for cache management
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (orgId: string, filter?: ProjectsFilter) =>
    [...projectKeys.lists(), orgId, filter] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
}

/**
 * Hook to fetch all projects for an organization
 */
export function useProjects(organizationId: string, filter?: ProjectsFilter) {
  return useQuery({
    queryKey: projectKeys.list(organizationId, filter),
    queryFn: async () => {
      const result = await getProjects(organizationId, filter)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
  })
}

/**
 * Hook to fetch a single project by ID
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const result = await getProject(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const result = await createProject(input)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as Project
    },
    onSuccess: (data) => {
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      // Also add the new project to the cache
      queryClient.setQueryData(projectKeys.detail(data.id), data)
    },
  })
}

/**
 * Hook to update an existing project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: UpdateProjectInput
    }) => {
      const result = await updateProject(id, updates)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as Project
    },
    onSuccess: (data) => {
      // Update the project in cache
      queryClient.setQueryData(projectKeys.detail(data.id), data)
      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

/**
 * Hook to delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteProject(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return id
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

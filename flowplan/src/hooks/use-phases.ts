/**
 * usePhases Hook
 *
 * React Query hooks for project phases data fetching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPhases,
  getPhase,
  createPhase,
  updatePhase,
  deletePhase,
  reorderPhases,
  type CreatePhaseInput,
  type UpdatePhaseInput,
  type PhasesFilter,
} from '@/services/phases'
import type { ProjectPhase } from '@/types/entities'

// Query keys for cache management
export const phaseKeys = {
  all: ['phases'] as const,
  lists: () => [...phaseKeys.all, 'list'] as const,
  list: (projectId: string, filter?: PhasesFilter) =>
    [...phaseKeys.lists(), projectId, filter] as const,
  details: () => [...phaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...phaseKeys.details(), id] as const,
}

/**
 * Hook to fetch all phases for a project
 */
export function usePhases(projectId: string, filter?: PhasesFilter) {
  return useQuery({
    queryKey: phaseKeys.list(projectId, filter),
    queryFn: async () => {
      const result = await getPhases(projectId, filter)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
  })
}

/**
 * Hook to fetch a single phase by ID
 */
export function usePhase(id: string) {
  return useQuery({
    queryKey: phaseKeys.detail(id),
    queryFn: async () => {
      const result = await getPhase(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a new phase
 */
export function useCreatePhase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePhaseInput) => {
      const result = await createPhase(input)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as ProjectPhase
    },
    onSuccess: (data) => {
      // Invalidate phases list to refetch
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() })
      // Add the new phase to the cache
      queryClient.setQueryData(phaseKeys.detail(data.id), data)
    },
  })
}

/**
 * Hook to update an existing phase
 */
export function useUpdatePhase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: UpdatePhaseInput
    }) => {
      const result = await updatePhase(id, updates)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as ProjectPhase
    },
    onSuccess: (data) => {
      // Update the phase in cache
      queryClient.setQueryData(phaseKeys.detail(data.id), data)
      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() })
    },
  })
}

/**
 * Hook to delete a phase
 */
export function useDeletePhase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deletePhase(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return id
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: phaseKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() })
    },
  })
}

/**
 * Hook to reorder phases within a project
 */
export function useReorderPhases() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      phaseIds,
    }: {
      projectId: string
      phaseIds: string[]
    }) => {
      const result = await reorderPhases(projectId, phaseIds)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as ProjectPhase[]
    },
    onSuccess: () => {
      // Invalidate all phase lists since order changed
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() })
    },
  })
}

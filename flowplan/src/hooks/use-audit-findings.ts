/**
 * useAuditFindings Hook
 *
 * React Query hooks for audit findings data fetching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAuditFindings,
  getAuditFinding,
  getAuditFindingsByTask,
  createAuditFinding,
  updateAuditFinding,
  deleteAuditFinding,
  type CreateAuditFindingInput,
  type UpdateAuditFindingInput,
  type AuditFindingsFilter,
} from '@/services/audit-findings'
import type { AuditFinding } from '@/types/entities'

// Query keys for cache management
export const auditFindingKeys = {
  all: ['audit-findings'] as const,
  lists: () => [...auditFindingKeys.all, 'list'] as const,
  list: (projectId: string, filter?: AuditFindingsFilter) =>
    [...auditFindingKeys.lists(), projectId, filter] as const,
  byTask: (taskId: string) =>
    [...auditFindingKeys.all, 'task', taskId] as const,
  details: () => [...auditFindingKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditFindingKeys.details(), id] as const,
}

/**
 * Hook to fetch all audit findings for a project
 */
export function useAuditFindings(projectId: string, filter?: AuditFindingsFilter) {
  return useQuery({
    queryKey: auditFindingKeys.list(projectId, filter),
    queryFn: async () => {
      const result = await getAuditFindings(projectId, filter)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
  })
}

/**
 * Hook to fetch a single audit finding by ID
 */
export function useAuditFinding(id: string) {
  return useQuery({
    queryKey: auditFindingKeys.detail(id),
    queryFn: async () => {
      const result = await getAuditFinding(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch audit findings for a specific task
 */
export function useAuditFindingsByTask(taskId: string) {
  return useQuery({
    queryKey: auditFindingKeys.byTask(taskId),
    queryFn: async () => {
      const result = await getAuditFindingsByTask(taskId)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
    enabled: !!taskId,
  })
}

/**
 * Hook to create a new audit finding
 */
export function useCreateAuditFinding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAuditFindingInput) => {
      const result = await createAuditFinding(input)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as AuditFinding
    },
    onSuccess: (data) => {
      // Invalidate findings lists to refetch
      queryClient.invalidateQueries({ queryKey: auditFindingKeys.lists() })
      // Invalidate task-specific queries
      queryClient.invalidateQueries({
        queryKey: auditFindingKeys.byTask(data.task_id),
      })
      // Add the new finding to the cache
      queryClient.setQueryData(auditFindingKeys.detail(data.id), data)
    },
  })
}

/**
 * Hook to update an existing audit finding
 */
export function useUpdateAuditFinding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: UpdateAuditFindingInput
    }) => {
      const result = await updateAuditFinding(id, updates)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as AuditFinding
    },
    onSuccess: (data) => {
      // Update the finding in cache
      queryClient.setQueryData(auditFindingKeys.detail(data.id), data)
      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: auditFindingKeys.lists() })
      // Invalidate task-specific queries
      queryClient.invalidateQueries({
        queryKey: auditFindingKeys.byTask(data.task_id),
      })
    },
  })
}

/**
 * Hook to delete an audit finding
 */
export function useDeleteAuditFinding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteAuditFinding(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return id
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: auditFindingKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: auditFindingKeys.lists() })
      // Invalidate all task-specific queries
      queryClient.invalidateQueries({
        queryKey: [...auditFindingKeys.all, 'task'],
      })
    },
  })
}

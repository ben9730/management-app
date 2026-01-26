/**
 * useTeamMembers Hook
 *
 * React Query hooks for team members data fetching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTeamMembers,
  getTeamMember,
  getTeamMembersByProject,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  type CreateTeamMemberInput,
  type UpdateTeamMemberInput,
  type TeamMembersFilter,
} from '@/services/team-members'
import type { TeamMember } from '@/types/entities'

// Query keys for cache management
export const teamMemberKeys = {
  all: ['team-members'] as const,
  lists: () => [...teamMemberKeys.all, 'list'] as const,
  list: (orgId: string, filter?: TeamMembersFilter) =>
    [...teamMemberKeys.lists(), orgId, filter] as const,
  byProject: (projectId: string) =>
    [...teamMemberKeys.all, 'project', projectId] as const,
  details: () => [...teamMemberKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamMemberKeys.details(), id] as const,
}

/**
 * Hook to fetch all team members for an organization
 */
export function useTeamMembers(organizationId: string, filter?: TeamMembersFilter) {
  return useQuery({
    queryKey: teamMemberKeys.list(organizationId, filter),
    queryFn: async () => {
      const result = await getTeamMembers(organizationId, filter)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
  })
}

/**
 * Hook to fetch a single team member by ID
 */
export function useTeamMember(id: string) {
  return useQuery({
    queryKey: teamMemberKeys.detail(id),
    queryFn: async () => {
      const result = await getTeamMember(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch team members for a specific project
 */
export function useTeamMembersByProject(projectId: string) {
  return useQuery({
    queryKey: teamMemberKeys.byProject(projectId),
    queryFn: async () => {
      const result = await getTeamMembersByProject(projectId)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
    enabled: !!projectId,
  })
}

/**
 * Hook to create a new team member
 */
export function useCreateTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTeamMemberInput) => {
      const result = await createTeamMember(input)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as TeamMember
    },
    onSuccess: (data) => {
      // Invalidate team members lists to refetch
      queryClient.invalidateQueries({ queryKey: teamMemberKeys.lists() })
      // Add the new team member to the cache
      queryClient.setQueryData(teamMemberKeys.detail(data.id), data)
    },
  })
}

/**
 * Hook to update an existing team member
 */
export function useUpdateTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: UpdateTeamMemberInput
    }) => {
      const result = await updateTeamMember(id, updates)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as TeamMember
    },
    onSuccess: (data) => {
      // Update the team member in cache
      queryClient.setQueryData(teamMemberKeys.detail(data.id), data)
      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: teamMemberKeys.lists() })
      // Also invalidate project-specific queries
      queryClient.invalidateQueries({
        queryKey: [...teamMemberKeys.all, 'project'],
      })
    },
  })
}

/**
 * Hook to delete a team member
 */
export function useDeleteTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteTeamMember(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return id
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: teamMemberKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: teamMemberKeys.lists() })
      // Invalidate project-specific queries
      queryClient.invalidateQueries({
        queryKey: [...teamMemberKeys.all, 'project'],
      })
    },
  })
}

/**
 * useTimeOff Hook
 *
 * React Query hooks for employee time off data fetching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTimeOffs,
  getTimeOff,
  getTimeOffsByUser,
  createTimeOff,
  updateTimeOff,
  deleteTimeOff,
  type CreateTimeOffInput,
  type UpdateTimeOffInput,
  type TimeOffsFilter,
  type UserTimeOffsFilter,
} from '@/services/time-off'
import type { EmployeeTimeOff } from '@/types/entities'

// Query keys for cache management
export const timeOffKeys = {
  all: ['time-off'] as const,
  lists: () => [...timeOffKeys.all, 'list'] as const,
  list: (filter: TimeOffsFilter) => [...timeOffKeys.lists(), filter] as const,
  byUser: (userId: string, filter?: UserTimeOffsFilter) =>
    [...timeOffKeys.all, 'user', userId, filter] as const,
  details: () => [...timeOffKeys.all, 'detail'] as const,
  detail: (id: string) => [...timeOffKeys.details(), id] as const,
}

/**
 * Hook to fetch all time offs within a date range
 */
export function useTimeOffs(filter: TimeOffsFilter) {
  return useQuery({
    queryKey: timeOffKeys.list(filter),
    queryFn: async () => {
      const result = await getTimeOffs(filter)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
  })
}

/**
 * Hook to fetch a single time off by ID
 */
export function useTimeOff(id: string) {
  return useQuery({
    queryKey: timeOffKeys.detail(id),
    queryFn: async () => {
      const result = await getTimeOff(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch time offs for a specific user
 */
export function useTimeOffsByUser(userId: string, filter?: UserTimeOffsFilter) {
  return useQuery({
    queryKey: timeOffKeys.byUser(userId, filter),
    queryFn: async () => {
      const result = await getTimeOffsByUser(userId, filter)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
    enabled: !!userId,
  })
}

/**
 * Hook to create a new time off
 */
export function useCreateTimeOff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTimeOffInput) => {
      const result = await createTimeOff(input)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as EmployeeTimeOff
    },
    onSuccess: (data) => {
      // Invalidate time off lists to refetch
      queryClient.invalidateQueries({ queryKey: timeOffKeys.lists() })
      // Invalidate user-specific queries
      queryClient.invalidateQueries({
        queryKey: [...timeOffKeys.all, 'user', data.team_member_id],
      })
      // Add the new time off to the cache
      queryClient.setQueryData(timeOffKeys.detail(data.id), data)
    },
  })
}

/**
 * Hook to update an existing time off
 */
export function useUpdateTimeOff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: UpdateTimeOffInput
    }) => {
      const result = await updateTimeOff(id, updates)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as EmployeeTimeOff
    },
    onSuccess: (data) => {
      // Update the time off in cache
      queryClient.setQueryData(timeOffKeys.detail(data.id), data)
      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: timeOffKeys.lists() })
      // Invalidate user-specific queries
      queryClient.invalidateQueries({
        queryKey: [...timeOffKeys.all, 'user', data.team_member_id],
      })
    },
  })
}

/**
 * Hook to delete a time off
 */
export function useDeleteTimeOff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteTimeOff(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return id
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: timeOffKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: timeOffKeys.lists() })
      // Invalidate all user-specific queries
      queryClient.invalidateQueries({
        queryKey: [...timeOffKeys.all, 'user'],
      })
    },
  })
}

/**
 * useCalendarExceptions Hook
 *
 * React Query hooks for calendar exceptions (holidays, non-working days) data fetching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCalendarExceptions,
  getCalendarException,
  createCalendarException,
  updateCalendarException,
  deleteCalendarException,
  type UpdateCalendarExceptionInput,
} from '@/services/calendar-exceptions'
import type { CalendarException, CreateCalendarExceptionInput } from '@/types/entities'

// Query keys for cache management
export const calendarExceptionKeys = {
  all: ['calendar-exceptions'] as const,
  lists: () => [...calendarExceptionKeys.all, 'list'] as const,
  list: (projectId: string) =>
    [...calendarExceptionKeys.lists(), projectId] as const,
  details: () => [...calendarExceptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...calendarExceptionKeys.details(), id] as const,
}

/**
 * Hook to fetch all calendar exceptions for a project
 */
export function useCalendarExceptions(projectId: string) {
  return useQuery({
    queryKey: calendarExceptionKeys.list(projectId),
    queryFn: async () => {
      const result = await getCalendarExceptions(projectId)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
    enabled: !!projectId,
  })
}

/**
 * Hook to fetch a single calendar exception by ID
 */
export function useCalendarException(id: string) {
  return useQuery({
    queryKey: calendarExceptionKeys.detail(id),
    queryFn: async () => {
      const result = await getCalendarException(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a new calendar exception
 */
export function useCreateCalendarException() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCalendarExceptionInput) => {
      const result = await createCalendarException(input)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as CalendarException
    },
    onSuccess: (data) => {
      // Invalidate exceptions list to refetch
      queryClient.invalidateQueries({ queryKey: calendarExceptionKeys.lists() })
      // Add the new exception to the cache
      queryClient.setQueryData(calendarExceptionKeys.detail(data.id), data)
    },
  })
}

/**
 * Hook to update an existing calendar exception
 */
export function useUpdateCalendarException() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: UpdateCalendarExceptionInput
    }) => {
      const result = await updateCalendarException(id, updates)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data as CalendarException
    },
    onSuccess: (data) => {
      // Update the exception in cache
      queryClient.setQueryData(calendarExceptionKeys.detail(data.id), data)
      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: calendarExceptionKeys.lists() })
    },
  })
}

/**
 * Hook to delete a calendar exception
 */
export function useDeleteCalendarException() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteCalendarException(id)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return id
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: calendarExceptionKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: calendarExceptionKeys.lists() })
    },
  })
}

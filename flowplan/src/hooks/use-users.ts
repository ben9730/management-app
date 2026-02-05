/**
 * useUsers Hook
 *
 * React Query hooks for fetching registered users.
 */

import { useQuery } from '@tanstack/react-query'
import {
  getRegisteredUsers,
  getRegisteredUserById,
  type RegisteredUser,
} from '@/services/users'

// Query keys for cache management
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  registered: () => [...userKeys.lists(), 'registered'] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

/**
 * Hook to fetch all registered users
 * Filters out test users automatically
 */
export function useRegisteredUsers() {
  return useQuery({
    queryKey: userKeys.registered(),
    queryFn: async () => {
      const result = await getRegisteredUsers()
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

/**
 * Hook to fetch a single user by ID
 */
export function useRegisteredUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: async () => {
      const result = await getRegisteredUserById(userId)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    enabled: Boolean(userId),
  })
}

export type { RegisteredUser }

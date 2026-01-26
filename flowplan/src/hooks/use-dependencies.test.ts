/**
 * useDependencies Hook Tests (TDD)
 *
 * Tests for React Query hooks for dependencies data fetching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useDependencies,
  useDependency,
  useDependenciesForTask,
  useCreateDependency,
  useUpdateDependency,
  useDeleteDependency,
} from './use-dependencies'
import * as dependenciesService from '@/services/dependencies'
import type { Dependency } from '@/types/entities'

// Mock the Supabase client to prevent env var errors
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

// Mock the dependencies service
vi.mock('@/services/dependencies')

const mockDependency: Dependency = {
  id: 'dep-1',
  predecessor_id: 'task-1',
  successor_id: 'task-2',
  dependency_type: 'finish_to_start',
  lag_days: 0,
  created_at: '2026-01-15T10:00:00Z',
}

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useDependencies Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useDependencies', () => {
    it('fetches all dependencies for a project', async () => {
      const dependencies = [
        mockDependency,
        { ...mockDependency, id: 'dep-2', predecessor_id: 'task-2', successor_id: 'task-3' },
      ]
      vi.mocked(dependenciesService.getDependencies).mockResolvedValueOnce({
        data: dependencies,
        error: null,
      })

      const { result } = renderHook(() => useDependencies('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(dependenciesService.getDependencies).toHaveBeenCalledWith('proj-1')
    })

    it('returns empty array when no dependencies exist', async () => {
      vi.mocked(dependenciesService.getDependencies).mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => useDependencies('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([])
    })

    it('handles error state', async () => {
      vi.mocked(dependenciesService.getDependencies).mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to fetch dependencies' },
      })

      const { result } = renderHook(() => useDependencies('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useDependency', () => {
    it('fetches a single dependency by ID', async () => {
      vi.mocked(dependenciesService.getDependency).mockResolvedValueOnce({
        data: mockDependency,
        error: null,
      })

      const { result } = renderHook(() => useDependency('dep-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockDependency)
      expect(dependenciesService.getDependency).toHaveBeenCalledWith('dep-1')
    })

    it('is disabled when ID is not provided', () => {
      const { result } = renderHook(() => useDependency(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('handles not found state', async () => {
      vi.mocked(dependenciesService.getDependency).mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => useDependency('non-existent'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBeNull()
    })
  })

  describe('useDependenciesForTask', () => {
    it('fetches dependencies for a specific task', async () => {
      const dependencies = [
        mockDependency,
        { ...mockDependency, id: 'dep-3', predecessor_id: 'task-3', successor_id: 'task-1' },
      ]
      vi.mocked(dependenciesService.getDependenciesForTask).mockResolvedValueOnce({
        data: dependencies,
        error: null,
      })

      const { result } = renderHook(() => useDependenciesForTask('task-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(dependenciesService.getDependenciesForTask).toHaveBeenCalledWith('task-1')
    })

    it('is disabled when task ID is not provided', () => {
      const { result } = renderHook(() => useDependenciesForTask(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('handles error state', async () => {
      vi.mocked(dependenciesService.getDependenciesForTask).mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to fetch' },
      })

      const { result } = renderHook(() => useDependenciesForTask('task-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useCreateDependency', () => {
    it('creates a new dependency', async () => {
      vi.mocked(dependenciesService.createDependency).mockResolvedValueOnce({
        data: mockDependency,
        error: null,
      })

      const { result } = renderHook(() => useCreateDependency(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        predecessor_id: 'task-1',
        successor_id: 'task-2',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(dependenciesService.createDependency).toHaveBeenCalledWith({
        predecessor_id: 'task-1',
        successor_id: 'task-2',
      })
    })

    it('creates dependency with custom type and lag', async () => {
      const customDep = {
        ...mockDependency,
        dependency_type: 'start_to_start' as const,
        lag_days: 2,
      }
      vi.mocked(dependenciesService.createDependency).mockResolvedValueOnce({
        data: customDep,
        error: null,
      })

      const { result } = renderHook(() => useCreateDependency(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        predecessor_id: 'task-1',
        successor_id: 'task-2',
        dependency_type: 'start_to_start',
        lag_days: 2,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(dependenciesService.createDependency).toHaveBeenCalledWith({
        predecessor_id: 'task-1',
        successor_id: 'task-2',
        dependency_type: 'start_to_start',
        lag_days: 2,
      })
    })

    it('handles creation error', async () => {
      vi.mocked(dependenciesService.createDependency).mockResolvedValueOnce({
        data: null,
        error: { message: 'Predecessor and successor must be different tasks' },
      })

      const { result } = renderHook(() => useCreateDependency(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        predecessor_id: 'task-1',
        successor_id: 'task-1',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useUpdateDependency', () => {
    it('updates an existing dependency', async () => {
      const updatedDep = { ...mockDependency, lag_days: 3 }
      vi.mocked(dependenciesService.updateDependency).mockResolvedValueOnce({
        data: updatedDep,
        error: null,
      })

      const { result } = renderHook(() => useUpdateDependency(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'dep-1',
        updates: { lag_days: 3 },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(dependenciesService.updateDependency).toHaveBeenCalledWith('dep-1', {
        lag_days: 3,
      })
    })

    it('updates dependency type', async () => {
      const updatedDep = { ...mockDependency, dependency_type: 'finish_to_finish' as const }
      vi.mocked(dependenciesService.updateDependency).mockResolvedValueOnce({
        data: updatedDep,
        error: null,
      })

      const { result } = renderHook(() => useUpdateDependency(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'dep-1',
        updates: { dependency_type: 'finish_to_finish' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(dependenciesService.updateDependency).toHaveBeenCalledWith('dep-1', {
        dependency_type: 'finish_to_finish',
      })
    })

    it('handles update error', async () => {
      vi.mocked(dependenciesService.updateDependency).mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid dependency_type' },
      })

      const { result } = renderHook(() => useUpdateDependency(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'dep-1',
        updates: { dependency_type: 'invalid' as any },
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useDeleteDependency', () => {
    it('deletes a dependency', async () => {
      vi.mocked(dependenciesService.deleteDependency).mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => useDeleteDependency(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('dep-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(dependenciesService.deleteDependency).toHaveBeenCalledWith('dep-1')
    })

    it('handles delete error', async () => {
      vi.mocked(dependenciesService.deleteDependency).mockResolvedValueOnce({
        data: null,
        error: { message: 'Dependency not found' },
      })

      const { result } = renderHook(() => useDeleteDependency(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('non-existent')

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })
})

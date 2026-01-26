/**
 * usePhases Hook Tests (TDD)
 *
 * Tests for React Query hooks for project phases data fetching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  usePhases,
  usePhase,
  useCreatePhase,
  useUpdatePhase,
  useDeletePhase,
  useReorderPhases,
} from './use-phases'
import * as phasesService from '@/services/phases'
import type { ProjectPhase } from '@/types/entities'

// Mock the Supabase client to prevent env var errors
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

// Mock the phases service
vi.mock('@/services/phases')

const mockPhase: ProjectPhase = {
  id: 'phase-1',
  project_id: 'proj-1',
  name: 'הכנה',
  description: 'שלב ההכנה',
  phase_order: 1,
  status: 'active',
  start_date: new Date('2026-01-20'),
  end_date: new Date('2026-02-15'),
  total_tasks: 5,
  completed_tasks: 2,
  created_at: new Date('2026-01-15T10:00:00Z'),
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

describe('usePhases Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('usePhases', () => {
    it('fetches all phases for a project', async () => {
      const phases = [
        mockPhase,
        { ...mockPhase, id: 'phase-2', name: 'ביצוע', phase_order: 2 },
      ]
      vi.mocked(phasesService.getPhases).mockResolvedValueOnce({
        data: phases,
        error: null,
      })

      const { result } = renderHook(() => usePhases('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(phasesService.getPhases).toHaveBeenCalledWith('proj-1', undefined)
    })

    it('applies status filter when provided', async () => {
      vi.mocked(phasesService.getPhases).mockResolvedValueOnce({
        data: [mockPhase],
        error: null,
      })

      const { result } = renderHook(
        () => usePhases('proj-1', { status: 'active' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(phasesService.getPhases).toHaveBeenCalledWith('proj-1', {
        status: 'active',
      })
    })

    it('returns empty array when no phases exist', async () => {
      vi.mocked(phasesService.getPhases).mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => usePhases('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([])
    })

    it('handles error state', async () => {
      vi.mocked(phasesService.getPhases).mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to fetch phases' },
      })

      const { result } = renderHook(() => usePhases('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })
  })

  describe('usePhase', () => {
    it('fetches a single phase by ID', async () => {
      vi.mocked(phasesService.getPhase).mockResolvedValueOnce({
        data: mockPhase,
        error: null,
      })

      const { result } = renderHook(() => usePhase('phase-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockPhase)
      expect(phasesService.getPhase).toHaveBeenCalledWith('phase-1')
    })

    it('is disabled when ID is not provided', () => {
      const { result } = renderHook(() => usePhase(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('handles not found state', async () => {
      vi.mocked(phasesService.getPhase).mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => usePhase('non-existent'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBeNull()
    })
  })

  describe('useCreatePhase', () => {
    it('creates a new phase', async () => {
      vi.mocked(phasesService.createPhase).mockResolvedValueOnce({
        data: mockPhase,
        error: null,
      })

      const { result } = renderHook(() => useCreatePhase(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        project_id: 'proj-1',
        name: 'הכנה',
        phase_order: 1,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(phasesService.createPhase).toHaveBeenCalledWith({
        project_id: 'proj-1',
        name: 'הכנה',
        phase_order: 1,
      })
    })

    it('creates phase with all optional fields', async () => {
      const fullPhase = {
        ...mockPhase,
        description: 'תיאור מלא',
        start_date: new Date('2026-02-01'),
        end_date: new Date('2026-02-28'),
      }
      vi.mocked(phasesService.createPhase).mockResolvedValueOnce({
        data: fullPhase,
        error: null,
      })

      const { result } = renderHook(() => useCreatePhase(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        project_id: 'proj-1',
        name: 'ביצוע ביקורת',
        description: 'תיאור מלא',
        phase_order: 2,
        start_date: '2026-02-01',
        end_date: '2026-02-28',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('handles creation error', async () => {
      vi.mocked(phasesService.createPhase).mockResolvedValueOnce({
        data: null,
        error: { message: 'Phase name is required' },
      })

      const { result } = renderHook(() => useCreatePhase(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        project_id: 'proj-1',
        name: '',
        phase_order: 1,
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useUpdatePhase', () => {
    it('updates phase name', async () => {
      const updatedPhase = { ...mockPhase, name: 'הכנה מקדימה' }
      vi.mocked(phasesService.updatePhase).mockResolvedValueOnce({
        data: updatedPhase,
        error: null,
      })

      const { result } = renderHook(() => useUpdatePhase(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'phase-1',
        updates: { name: 'הכנה מקדימה' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(phasesService.updatePhase).toHaveBeenCalledWith('phase-1', {
        name: 'הכנה מקדימה',
      })
    })

    it('updates phase status', async () => {
      const updatedPhase = { ...mockPhase, status: 'completed' as const }
      vi.mocked(phasesService.updatePhase).mockResolvedValueOnce({
        data: updatedPhase,
        error: null,
      })

      const { result } = renderHook(() => useUpdatePhase(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'phase-1',
        updates: { status: 'completed' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('updates phase dates', async () => {
      const updatedPhase = {
        ...mockPhase,
        start_date: new Date('2026-02-01'),
        end_date: new Date('2026-02-15'),
      }
      vi.mocked(phasesService.updatePhase).mockResolvedValueOnce({
        data: updatedPhase,
        error: null,
      })

      const { result } = renderHook(() => useUpdatePhase(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'phase-1',
        updates: {
          start_date: '2026-02-01',
          end_date: '2026-02-15',
        },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('handles update error', async () => {
      vi.mocked(phasesService.updatePhase).mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid status' },
      })

      const { result } = renderHook(() => useUpdatePhase(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'phase-1',
        updates: { status: 'invalid' as any },
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useDeletePhase', () => {
    it('deletes a phase', async () => {
      vi.mocked(phasesService.deletePhase).mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => useDeletePhase(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('phase-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(phasesService.deletePhase).toHaveBeenCalledWith('phase-1')
    })

    it('handles delete error', async () => {
      vi.mocked(phasesService.deletePhase).mockResolvedValueOnce({
        data: null,
        error: { message: 'Cannot delete phase with tasks' },
      })

      const { result } = renderHook(() => useDeletePhase(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('phase-1')

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useReorderPhases', () => {
    it('reorders phases', async () => {
      const reorderedPhases = [
        { ...mockPhase, id: 'phase-2', phase_order: 1 },
        { ...mockPhase, id: 'phase-1', phase_order: 2 },
        { ...mockPhase, id: 'phase-3', phase_order: 3 },
      ]
      vi.mocked(phasesService.reorderPhases).mockResolvedValueOnce({
        data: reorderedPhases,
        error: null,
      })

      const { result } = renderHook(() => useReorderPhases(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        projectId: 'proj-1',
        phaseIds: ['phase-2', 'phase-1', 'phase-3'],
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(phasesService.reorderPhases).toHaveBeenCalledWith('proj-1', [
        'phase-2',
        'phase-1',
        'phase-3',
      ])
    })

    it('handles reorder error', async () => {
      vi.mocked(phasesService.reorderPhases).mockResolvedValueOnce({
        data: null,
        error: { message: 'At least one phase ID is required' },
      })

      const { result } = renderHook(() => useReorderPhases(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        projectId: 'proj-1',
        phaseIds: [],
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })
})

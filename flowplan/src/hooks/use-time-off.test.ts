/**
 * useTimeOff Hook Tests (TDD)
 *
 * Tests for React Query hooks for time off data fetching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useTimeOffs,
  useTimeOff,
  useTimeOffsByUser,
  useCreateTimeOff,
  useUpdateTimeOff,
  useDeleteTimeOff,
} from './use-time-off'
import * as timeOffService from '@/services/time-off'
import type { EmployeeTimeOff } from '@/types/entities'

// Mock the Supabase client to prevent env var errors
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

// Mock the time-off service
vi.mock('@/services/time-off')

const mockTimeOff: EmployeeTimeOff = {
  id: 'timeoff-1',
  user_id: 'user-1',
  start_date: new Date('2026-02-15'),
  end_date: new Date('2026-02-17'),
  type: 'vacation',
  status: 'approved',
  notes: 'חופשה שנתית',
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

describe('useTimeOff Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useTimeOffs', () => {
    it('fetches time offs within date range', async () => {
      const timeOffs = [
        mockTimeOff,
        { ...mockTimeOff, id: 'timeoff-2', user_id: 'user-2', type: 'sick' as const },
      ]
      vi.mocked(timeOffService.getTimeOffs).mockResolvedValueOnce({
        data: timeOffs,
        error: null,
      })

      const { result } = renderHook(
        () => useTimeOffs({ startDate: '2026-02-01', endDate: '2026-02-28' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(timeOffService.getTimeOffs).toHaveBeenCalledWith({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })
    })

    it('applies status filter when provided', async () => {
      vi.mocked(timeOffService.getTimeOffs).mockResolvedValueOnce({
        data: [mockTimeOff],
        error: null,
      })

      const { result } = renderHook(
        () =>
          useTimeOffs({
            startDate: '2026-02-01',
            endDate: '2026-02-28',
            status: 'approved',
          }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(timeOffService.getTimeOffs).toHaveBeenCalledWith({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        status: 'approved',
      })
    })

    it('returns empty array when no time offs exist', async () => {
      vi.mocked(timeOffService.getTimeOffs).mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const { result } = renderHook(
        () => useTimeOffs({ startDate: '2026-02-01', endDate: '2026-02-28' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([])
    })

    it('handles error state', async () => {
      vi.mocked(timeOffService.getTimeOffs).mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to fetch time offs' },
      })

      const { result } = renderHook(
        () => useTimeOffs({ startDate: '2026-02-01', endDate: '2026-02-28' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useTimeOff', () => {
    it('fetches a single time off by ID', async () => {
      vi.mocked(timeOffService.getTimeOff).mockResolvedValueOnce({
        data: mockTimeOff,
        error: null,
      })

      const { result } = renderHook(() => useTimeOff('timeoff-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockTimeOff)
      expect(timeOffService.getTimeOff).toHaveBeenCalledWith('timeoff-1')
    })

    it('is disabled when ID is not provided', () => {
      const { result } = renderHook(() => useTimeOff(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('handles not found state', async () => {
      vi.mocked(timeOffService.getTimeOff).mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => useTimeOff('non-existent'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBeNull()
    })
  })

  describe('useTimeOffsByUser', () => {
    it('fetches time offs for a specific user', async () => {
      const userTimeOffs = [
        mockTimeOff,
        { ...mockTimeOff, id: 'timeoff-3', type: 'personal' as const },
      ]
      vi.mocked(timeOffService.getTimeOffsByUser).mockResolvedValueOnce({
        data: userTimeOffs,
        error: null,
      })

      const { result } = renderHook(() => useTimeOffsByUser('user-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(timeOffService.getTimeOffsByUser).toHaveBeenCalledWith(
        'user-1',
        undefined
      )
    })

    it('applies date filter when provided', async () => {
      vi.mocked(timeOffService.getTimeOffsByUser).mockResolvedValueOnce({
        data: [mockTimeOff],
        error: null,
      })

      const { result } = renderHook(
        () =>
          useTimeOffsByUser('user-1', {
            startDate: '2026-02-01',
            endDate: '2026-02-28',
          }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(timeOffService.getTimeOffsByUser).toHaveBeenCalledWith('user-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })
    })

    it('is disabled when user ID is not provided', () => {
      const { result } = renderHook(() => useTimeOffsByUser(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useCreateTimeOff', () => {
    it('creates a new time off', async () => {
      vi.mocked(timeOffService.createTimeOff).mockResolvedValueOnce({
        data: mockTimeOff,
        error: null,
      })

      const { result } = renderHook(() => useCreateTimeOff(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        user_id: 'user-1',
        start_date: '2026-02-15',
        end_date: '2026-02-17',
        type: 'vacation',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(timeOffService.createTimeOff).toHaveBeenCalledWith({
        user_id: 'user-1',
        start_date: '2026-02-15',
        end_date: '2026-02-17',
        type: 'vacation',
      })
    })

    it('creates time off with notes', async () => {
      const timeOffWithNotes = { ...mockTimeOff, notes: 'חופשה שנתית' }
      vi.mocked(timeOffService.createTimeOff).mockResolvedValueOnce({
        data: timeOffWithNotes,
        error: null,
      })

      const { result } = renderHook(() => useCreateTimeOff(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        user_id: 'user-1',
        start_date: '2026-02-15',
        end_date: '2026-02-17',
        type: 'vacation',
        notes: 'חופשה שנתית',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('handles creation error', async () => {
      vi.mocked(timeOffService.createTimeOff).mockResolvedValueOnce({
        data: null,
        error: { message: 'End date must be after start date' },
      })

      const { result } = renderHook(() => useCreateTimeOff(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        user_id: 'user-1',
        start_date: '2026-02-17',
        end_date: '2026-02-15',
        type: 'vacation',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useUpdateTimeOff', () => {
    it('updates time off dates', async () => {
      const updatedTimeOff = {
        ...mockTimeOff,
        start_date: new Date('2026-02-18'),
        end_date: new Date('2026-02-20'),
      }
      vi.mocked(timeOffService.updateTimeOff).mockResolvedValueOnce({
        data: updatedTimeOff,
        error: null,
      })

      const { result } = renderHook(() => useUpdateTimeOff(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'timeoff-1',
        updates: {
          start_date: '2026-02-18',
          end_date: '2026-02-20',
        },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(timeOffService.updateTimeOff).toHaveBeenCalledWith('timeoff-1', {
        start_date: '2026-02-18',
        end_date: '2026-02-20',
      })
    })

    it('updates time off status', async () => {
      const updatedTimeOff = { ...mockTimeOff, status: 'rejected' as const }
      vi.mocked(timeOffService.updateTimeOff).mockResolvedValueOnce({
        data: updatedTimeOff,
        error: null,
      })

      const { result } = renderHook(() => useUpdateTimeOff(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'timeoff-1',
        updates: { status: 'rejected' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('handles update error', async () => {
      vi.mocked(timeOffService.updateTimeOff).mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid status' },
      })

      const { result } = renderHook(() => useUpdateTimeOff(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'timeoff-1',
        updates: { status: 'invalid' as any },
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useDeleteTimeOff', () => {
    it('deletes a time off', async () => {
      vi.mocked(timeOffService.deleteTimeOff).mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => useDeleteTimeOff(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('timeoff-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(timeOffService.deleteTimeOff).toHaveBeenCalledWith('timeoff-1')
    })

    it('handles delete error', async () => {
      vi.mocked(timeOffService.deleteTimeOff).mockResolvedValueOnce({
        data: null,
        error: { message: 'Record not found' },
      })

      const { result } = renderHook(() => useDeleteTimeOff(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('non-existent')

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })
})

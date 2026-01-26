/**
 * Time Off Service Tests (TDD)
 *
 * Tests for CRUD operations for employee time off.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTimeOff,
  getTimeOff,
  getTimeOffs,
  getTimeOffsByUser,
  updateTimeOff,
  deleteTimeOff,
} from './time-off'

// Mock the Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
          order: vi.fn(() => ({
            then: vi.fn(),
          })),
        })),
        or: vi.fn(() => ({
          order: vi.fn(() => ({
            then: vi.fn(),
          })),
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => ({
              then: vi.fn(),
            })),
          })),
          order: vi.fn(() => ({
            then: vi.fn(),
          })),
        })),
        order: vi.fn(() => ({
          then: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}))

import { supabase } from '@/lib/supabase'

describe('Time Off Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTimeOff', () => {
    it('creates time off with required fields', async () => {
      const mockTimeOff = {
        id: 'timeoff-1',
        user_id: 'user-1',
        start_date: '2026-02-15',
        end_date: '2026-02-17',
        type: 'vacation',
        status: 'approved',
        notes: null,
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockTimeOff, error: null }),
          }),
        }),
      } as any)

      const result = await createTimeOff({
        user_id: 'user-1',
        start_date: '2026-02-15',
        end_date: '2026-02-17',
        type: 'vacation',
      })

      expect(result.error).toBeNull()
      expect(result.data).toEqual(mockTimeOff)
    })

    it('creates time off with notes', async () => {
      const mockTimeOff = {
        id: 'timeoff-1',
        user_id: 'user-1',
        start_date: '2026-02-20',
        end_date: '2026-02-20',
        type: 'sick',
        status: 'approved',
        notes: 'שפעת',
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockTimeOff, error: null }),
          }),
        }),
      } as any)

      const result = await createTimeOff({
        user_id: 'user-1',
        start_date: '2026-02-20',
        end_date: '2026-02-20',
        type: 'sick',
        notes: 'שפעת',
      })

      expect(result.error).toBeNull()
      expect(result.data?.notes).toBe('שפעת')
    })

    it('returns error when user_id is missing', async () => {
      const result = await createTimeOff({
        user_id: '',
        start_date: '2026-02-15',
        end_date: '2026-02-17',
        type: 'vacation',
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('user_id')
    })

    it('returns error when start_date is missing', async () => {
      const result = await createTimeOff({
        user_id: 'user-1',
        start_date: '',
        end_date: '2026-02-17',
        type: 'vacation',
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('start_date')
    })

    it('returns error when end_date is before start_date', async () => {
      const result = await createTimeOff({
        user_id: 'user-1',
        start_date: '2026-02-17',
        end_date: '2026-02-15',
        type: 'vacation',
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('end_date')
    })

    it('returns error for invalid type', async () => {
      const result = await createTimeOff({
        user_id: 'user-1',
        start_date: '2026-02-15',
        end_date: '2026-02-17',
        type: 'invalid' as any,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('type')
    })
  })

  describe('getTimeOff', () => {
    it('returns a time off by ID', async () => {
      const mockTimeOff = {
        id: 'timeoff-1',
        user_id: 'user-1',
        start_date: '2026-02-15',
        end_date: '2026-02-17',
        type: 'vacation',
        status: 'approved',
        notes: null,
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockTimeOff, error: null }),
          }),
        }),
      } as any)

      const result = await getTimeOff('timeoff-1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(mockTimeOff)
    })

    it('returns null when time off not found', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any)

      const result = await getTimeOff('non-existent')

      expect(result.error).toBeNull()
      expect(result.data).toBeNull()
    })
  })

  describe('getTimeOffs', () => {
    it('returns all time offs with date range filter', async () => {
      const mockTimeOffs = [
        {
          id: 'timeoff-1',
          user_id: 'user-1',
          start_date: '2026-02-15',
          end_date: '2026-02-17',
          type: 'vacation',
          status: 'approved',
        },
        {
          id: 'timeoff-2',
          user_id: 'user-2',
          start_date: '2026-02-20',
          end_date: '2026-02-20',
          type: 'sick',
          status: 'approved',
        },
      ]

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockTimeOffs, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await getTimeOffs({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(2)
    })

    it('returns empty array when no time offs exist', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      } as any)

      const result = await getTimeOffs({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('filters by status when provided', async () => {
      const mockTimeOffs = [
        {
          id: 'timeoff-1',
          user_id: 'user-1',
          start_date: '2026-02-15',
          end_date: '2026-02-17',
          type: 'vacation',
          status: 'pending',
        },
      ]

      const mockEq = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockTimeOffs, error: null }),
      })

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              eq: mockEq,
            }),
          }),
        }),
      } as any)

      const result = await getTimeOffs({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        status: 'pending',
      })

      expect(result.error).toBeNull()
      expect(result.data?.[0].status).toBe('pending')
    })
  })

  describe('getTimeOffsByUser', () => {
    it('returns time offs for a specific user', async () => {
      const mockTimeOffs = [
        {
          id: 'timeoff-1',
          user_id: 'user-1',
          start_date: '2026-02-15',
          end_date: '2026-02-17',
          type: 'vacation',
          status: 'approved',
        },
      ]

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockTimeOffs, error: null }),
          }),
        }),
      } as any)

      const result = await getTimeOffsByUser('user-1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].user_id).toBe('user-1')
    })

    it('filters by date range when provided', async () => {
      const mockTimeOffs = [
        {
          id: 'timeoff-1',
          user_id: 'user-1',
          start_date: '2026-02-15',
          end_date: '2026-02-17',
          type: 'vacation',
          status: 'approved',
        },
      ]

      const mockGte = vi.fn().mockReturnValue({
        lte: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockTimeOffs, error: null }),
        }),
      })

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: mockGte,
          }),
        }),
      } as any)

      const result = await getTimeOffsByUser('user-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
    })
  })

  describe('updateTimeOff', () => {
    it('updates time off dates', async () => {
      const mockTimeOff = {
        id: 'timeoff-1',
        user_id: 'user-1',
        start_date: '2026-02-18',
        end_date: '2026-02-20',
        type: 'vacation',
        status: 'approved',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockTimeOff, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updateTimeOff('timeoff-1', {
        start_date: '2026-02-18',
        end_date: '2026-02-20',
      })

      expect(result.error).toBeNull()
      expect(result.data?.start_date).toBe('2026-02-18')
    })

    it('updates time off status', async () => {
      const mockTimeOff = {
        id: 'timeoff-1',
        user_id: 'user-1',
        start_date: '2026-02-15',
        end_date: '2026-02-17',
        type: 'vacation',
        status: 'rejected',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockTimeOff, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updateTimeOff('timeoff-1', { status: 'rejected' })

      expect(result.error).toBeNull()
      expect(result.data?.status).toBe('rejected')
    })

    it('returns error for invalid status', async () => {
      const result = await updateTimeOff('timeoff-1', { status: 'invalid' as any })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('status')
    })

    it('returns error when end_date is before start_date', async () => {
      const result = await updateTimeOff('timeoff-1', {
        start_date: '2026-02-20',
        end_date: '2026-02-15',
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('end_date')
    })
  })

  describe('deleteTimeOff', () => {
    it('deletes a time off', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any)

      const result = await deleteTimeOff('timeoff-1')

      expect(result.error).toBeNull()
    })

    it('handles delete error', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Record not found', code: 'PGRST116' },
          }),
        }),
      } as any)

      const result = await deleteTimeOff('timeoff-1')

      expect(result.error).not.toBeNull()
    })
  })
})

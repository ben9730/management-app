/**
 * Calendar Exceptions Service Tests (TDD)
 *
 * Tests for CRUD operations for calendar exceptions (holidays, non-working days).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createCalendarException,
  getCalendarException,
  getCalendarExceptions,
  updateCalendarException,
  deleteCalendarException,
} from './calendar-exceptions'

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

describe('Calendar Exceptions Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCalendarException', () => {
    it('creates a calendar exception with required fields', async () => {
      const mockException = {
        id: 'exception-1',
        project_id: 'proj-1',
        date: '2026-04-15',
        type: 'holiday',
        name: null,
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockException, error: null }),
          }),
        }),
      } as any)

      const result = await createCalendarException({
        project_id: 'proj-1',
        date: new Date('2026-04-15'),
        type: 'holiday',
      })

      expect(result.error).toBeNull()
      expect(result.data).toEqual(mockException)
    })

    it('creates a calendar exception with name', async () => {
      const mockException = {
        id: 'exception-1',
        project_id: 'proj-1',
        date: '2026-04-15',
        type: 'holiday',
        name: 'Passover',
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockException, error: null }),
          }),
        }),
      } as any)

      const result = await createCalendarException({
        project_id: 'proj-1',
        date: new Date('2026-04-15'),
        type: 'holiday',
        name: 'Passover',
      })

      expect(result.error).toBeNull()
      expect(result.data?.name).toBe('Passover')
    })

    it('creates a non_working exception type', async () => {
      const mockException = {
        id: 'exception-2',
        project_id: 'proj-1',
        date: '2026-12-25',
        type: 'non_working',
        name: 'Office Closed',
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockException, error: null }),
          }),
        }),
      } as any)

      const result = await createCalendarException({
        project_id: 'proj-1',
        date: new Date('2026-12-25'),
        type: 'non_working',
        name: 'Office Closed',
      })

      expect(result.error).toBeNull()
      expect(result.data?.type).toBe('non_working')
    })

    it('returns error when project_id is missing', async () => {
      const result = await createCalendarException({
        project_id: '',
        date: new Date('2026-04-15'),
        type: 'holiday',
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('project_id')
    })

    it('returns error when date is invalid', async () => {
      const result = await createCalendarException({
        project_id: 'proj-1',
        date: new Date('invalid'),
        type: 'holiday',
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('date')
    })

    it('returns error for invalid type', async () => {
      const result = await createCalendarException({
        project_id: 'proj-1',
        date: new Date('2026-04-15'),
        type: 'invalid' as any,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('type')
    })

    it('handles database error gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error', code: 'PGRST001' },
            }),
          }),
        }),
      } as any)

      const result = await createCalendarException({
        project_id: 'proj-1',
        date: new Date('2026-04-15'),
        type: 'holiday',
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Database error')
      expect(result.error?.code).toBe('PGRST001')
    })
  })

  describe('getCalendarException', () => {
    it('returns a calendar exception by ID', async () => {
      const mockException = {
        id: 'exception-1',
        project_id: 'proj-1',
        date: '2026-04-15',
        type: 'holiday',
        name: 'Passover',
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockException, error: null }),
          }),
        }),
      } as any)

      const result = await getCalendarException('exception-1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(mockException)
    })

    it('returns null when exception not found', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any)

      const result = await getCalendarException('non-existent')

      expect(result.error).toBeNull()
      expect(result.data).toBeNull()
    })

    it('handles database error gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Connection error', code: 'PGRST002' },
            }),
          }),
        }),
      } as any)

      const result = await getCalendarException('exception-1')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Connection error')
    })
  })

  describe('getCalendarExceptions', () => {
    it('returns all calendar exceptions for a project', async () => {
      const mockExceptions = [
        {
          id: 'exception-1',
          project_id: 'proj-1',
          date: '2026-04-15',
          type: 'holiday',
          name: 'Passover',
        },
        {
          id: 'exception-2',
          project_id: 'proj-1',
          date: '2026-09-26',
          type: 'holiday',
          name: 'Rosh Hashanah',
        },
        {
          id: 'exception-3',
          project_id: 'proj-1',
          date: '2026-12-25',
          type: 'non_working',
          name: 'Office Closed',
        },
      ]

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockExceptions, error: null }),
          }),
        }),
      } as any)

      const result = await getCalendarExceptions('proj-1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(3)
    })

    it('returns empty array when no exceptions exist', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any)

      const result = await getCalendarExceptions('proj-1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('returns empty array when data is null', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any)

      const result = await getCalendarExceptions('proj-1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('handles database error gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Query failed', code: 'PGRST003' },
            }),
          }),
        }),
      } as any)

      const result = await getCalendarExceptions('proj-1')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Query failed')
    })
  })

  describe('updateCalendarException', () => {
    it('updates exception date', async () => {
      const mockException = {
        id: 'exception-1',
        project_id: 'proj-1',
        date: '2026-04-16',
        type: 'holiday',
        name: 'Passover',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockException, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updateCalendarException('exception-1', {
        date: new Date('2026-04-16'),
      })

      expect(result.error).toBeNull()
      expect(result.data?.date).toBe('2026-04-16')
    })

    it('updates exception type', async () => {
      const mockException = {
        id: 'exception-1',
        project_id: 'proj-1',
        date: '2026-04-15',
        type: 'non_working',
        name: 'Passover',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockException, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updateCalendarException('exception-1', { type: 'non_working' })

      expect(result.error).toBeNull()
      expect(result.data?.type).toBe('non_working')
    })

    it('updates exception name', async () => {
      const mockException = {
        id: 'exception-1',
        project_id: 'proj-1',
        date: '2026-04-15',
        type: 'holiday',
        name: 'Updated Holiday Name',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockException, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updateCalendarException('exception-1', {
        name: 'Updated Holiday Name',
      })

      expect(result.error).toBeNull()
      expect(result.data?.name).toBe('Updated Holiday Name')
    })

    it('clears exception name to null', async () => {
      const mockException = {
        id: 'exception-1',
        project_id: 'proj-1',
        date: '2026-04-15',
        type: 'holiday',
        name: null,
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockException, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updateCalendarException('exception-1', { name: null })

      expect(result.error).toBeNull()
      expect(result.data?.name).toBeNull()
    })

    it('returns error for invalid type', async () => {
      const result = await updateCalendarException('exception-1', {
        type: 'invalid' as any,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('type')
    })

    it('returns error for invalid date', async () => {
      const result = await updateCalendarException('exception-1', {
        date: new Date('invalid'),
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('date')
    })

    it('handles database error gracefully', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed', code: 'PGRST004' },
              }),
            }),
          }),
        }),
      } as any)

      const result = await updateCalendarException('exception-1', { name: 'New Name' })

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Update failed')
    })
  })

  describe('deleteCalendarException', () => {
    it('deletes a calendar exception', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any)

      const result = await deleteCalendarException('exception-1')

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

      const result = await deleteCalendarException('non-existent')

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toBe('Record not found')
    })
  })
})

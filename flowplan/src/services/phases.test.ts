/**
 * Phases Service Tests (TDD)
 *
 * Tests for CRUD operations for project phases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createPhase,
  getPhase,
  getPhases,
  updatePhase,
  deletePhase,
  reorderPhases,
} from './phases'

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
      upsert: vi.fn(() => ({
        select: vi.fn(),
      })),
    })),
  },
}))

import { supabase } from '@/lib/supabase'

describe('Phases Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createPhase', () => {
    it('creates a phase with required fields', async () => {
      const mockPhase = {
        id: 'phase-1',
        project_id: 'proj-1',
        name: 'הכנה',
        description: null,
        phase_order: 1,
        status: 'pending',
        start_date: null,
        end_date: null,
        total_tasks: 0,
        completed_tasks: 0,
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPhase, error: null }),
          }),
        }),
      } as any)

      const result = await createPhase({
        project_id: 'proj-1',
        name: 'הכנה',
        phase_order: 1,
      })

      expect(result.error).toBeNull()
      expect(result.data).toEqual(mockPhase)
    })

    it('creates a phase with all optional fields', async () => {
      const mockPhase = {
        id: 'phase-1',
        project_id: 'proj-1',
        name: 'ביצוע ביקורת',
        description: 'שלב הביקורת העיקרי',
        phase_order: 2,
        status: 'pending',
        start_date: '2026-02-01',
        end_date: '2026-02-28',
        total_tasks: 0,
        completed_tasks: 0,
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPhase, error: null }),
          }),
        }),
      } as any)

      const result = await createPhase({
        project_id: 'proj-1',
        name: 'ביצוע ביקורת',
        description: 'שלב הביקורת העיקרי',
        phase_order: 2,
        start_date: '2026-02-01',
        end_date: '2026-02-28',
      })

      expect(result.error).toBeNull()
      expect(result.data?.description).toBe('שלב הביקורת העיקרי')
    })

    it('returns error when project_id is missing', async () => {
      const result = await createPhase({
        project_id: '',
        name: 'Test Phase',
        phase_order: 1,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('project_id')
    })

    it('returns error when name is empty', async () => {
      const result = await createPhase({
        project_id: 'proj-1',
        name: '',
        phase_order: 1,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('name')
    })

    it('returns error when name is whitespace only', async () => {
      const result = await createPhase({
        project_id: 'proj-1',
        name: '   ',
        phase_order: 1,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('name')
    })

    it('returns error when phase_order is negative', async () => {
      const result = await createPhase({
        project_id: 'proj-1',
        name: 'Test Phase',
        phase_order: -1,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('phase_order')
    })

    it('returns error when phase_order is zero', async () => {
      const result = await createPhase({
        project_id: 'proj-1',
        name: 'Test Phase',
        phase_order: 0,
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('phase_order')
    })

    it('returns error when end_date is before start_date', async () => {
      const result = await createPhase({
        project_id: 'proj-1',
        name: 'Test Phase',
        phase_order: 1,
        start_date: '2026-02-28',
        end_date: '2026-02-01',
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('end_date')
    })
  })

  describe('getPhase', () => {
    it('returns a phase by ID', async () => {
      const mockPhase = {
        id: 'phase-1',
        project_id: 'proj-1',
        name: 'הכנה',
        description: null,
        phase_order: 1,
        status: 'pending',
        start_date: null,
        end_date: null,
        total_tasks: 5,
        completed_tasks: 2,
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockPhase, error: null }),
          }),
        }),
      } as any)

      const result = await getPhase('phase-1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(mockPhase)
    })

    it('returns null when phase not found', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any)

      const result = await getPhase('non-existent')

      expect(result.error).toBeNull()
      expect(result.data).toBeNull()
    })
  })

  describe('getPhases', () => {
    it('returns phases for a project ordered by phase_order', async () => {
      const mockPhases = [
        {
          id: 'phase-1',
          project_id: 'proj-1',
          name: 'הכנה',
          phase_order: 1,
          status: 'completed',
        },
        {
          id: 'phase-2',
          project_id: 'proj-1',
          name: 'ביצוע',
          phase_order: 2,
          status: 'active',
        },
        {
          id: 'phase-3',
          project_id: 'proj-1',
          name: 'סיכום',
          phase_order: 3,
          status: 'pending',
        },
      ]

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockPhases, error: null }),
          }),
        }),
      } as any)

      const result = await getPhases('proj-1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(3)
      expect(result.data?.[0].name).toBe('הכנה')
    })

    it('returns empty array when no phases exist', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any)

      const result = await getPhases('proj-1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('filters by status when provided', async () => {
      const mockPhases = [
        {
          id: 'phase-2',
          project_id: 'proj-1',
          name: 'ביצוע',
          phase_order: 2,
          status: 'active',
        },
      ]

      const mockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockPhases, error: null }),
        }),
      })

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      } as any)

      const result = await getPhases('proj-1', { status: 'active' })

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0].status).toBe('active')
    })
  })

  describe('updatePhase', () => {
    it('updates phase name', async () => {
      const mockPhase = {
        id: 'phase-1',
        project_id: 'proj-1',
        name: 'הכנה מקדימה',
        phase_order: 1,
        status: 'pending',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockPhase, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updatePhase('phase-1', { name: 'הכנה מקדימה' })

      expect(result.error).toBeNull()
      expect(result.data?.name).toBe('הכנה מקדימה')
    })

    it('updates phase status', async () => {
      const mockPhase = {
        id: 'phase-1',
        project_id: 'proj-1',
        name: 'הכנה',
        phase_order: 1,
        status: 'completed',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockPhase, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updatePhase('phase-1', { status: 'completed' })

      expect(result.error).toBeNull()
      expect(result.data?.status).toBe('completed')
    })

    it('updates phase dates', async () => {
      const mockPhase = {
        id: 'phase-1',
        project_id: 'proj-1',
        name: 'הכנה',
        phase_order: 1,
        status: 'active',
        start_date: '2026-02-01',
        end_date: '2026-02-15',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockPhase, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updatePhase('phase-1', {
        start_date: '2026-02-01',
        end_date: '2026-02-15',
      })

      expect(result.error).toBeNull()
      expect(result.data?.start_date).toBe('2026-02-01')
    })

    it('returns error when name is empty', async () => {
      const result = await updatePhase('phase-1', { name: '' })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('name')
    })

    it('returns error for invalid status', async () => {
      const result = await updatePhase('phase-1', { status: 'invalid' as any })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('status')
    })
  })

  describe('deletePhase', () => {
    it('deletes a phase', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any)

      const result = await deletePhase('phase-1')

      expect(result.error).toBeNull()
    })

    it('handles delete error', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Cannot delete phase with tasks', code: '23503' },
          }),
        }),
      } as any)

      const result = await deletePhase('phase-1')

      expect(result.error).not.toBeNull()
      expect(result.error?.message).toContain('Cannot delete')
    })
  })

  describe('reorderPhases', () => {
    it('reorders phases with new order', async () => {
      const mockPhases = [
        { id: 'phase-2', phase_order: 1 },
        { id: 'phase-1', phase_order: 2 },
        { id: 'phase-3', phase_order: 3 },
      ]

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: mockPhases, error: null }),
        }),
      } as any)

      const result = await reorderPhases('proj-1', ['phase-2', 'phase-1', 'phase-3'])

      expect(result.error).toBeNull()
      expect(result.data?.[0].id).toBe('phase-2')
      expect(result.data?.[0].phase_order).toBe(1)
    })

    it('returns error when phase IDs array is empty', async () => {
      const result = await reorderPhases('proj-1', [])

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('phase IDs')
    })
  })
})

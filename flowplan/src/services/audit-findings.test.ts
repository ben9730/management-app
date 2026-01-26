/**
 * Audit Findings Service Tests (TDD)
 *
 * Tests for CRUD operations for audit findings.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createAuditFinding,
  getAuditFinding,
  getAuditFindings,
  getAuditFindingsByTask,
  updateAuditFinding,
  deleteAuditFinding,
} from './audit-findings'

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

describe('Audit Findings Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createAuditFinding', () => {
    it('creates a finding with required fields', async () => {
      const mockFinding = {
        id: 'finding-1',
        task_id: 'task-1',
        severity: 'high',
        finding: 'חריגה מהתקן',
        root_cause: null,
        capa: null,
        due_date: null,
        status: 'open',
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockFinding, error: null }),
          }),
        }),
      } as any)

      const result = await createAuditFinding({
        task_id: 'task-1',
        severity: 'high',
        finding: 'חריגה מהתקן',
      })

      expect(result.error).toBeNull()
      expect(result.data).toEqual(mockFinding)
    })

    it('creates a finding with all fields', async () => {
      const mockFinding = {
        id: 'finding-1',
        task_id: 'task-1',
        severity: 'critical',
        finding: 'ליקוי קריטי בבטיחות',
        root_cause: 'היעדר תחזוקה',
        capa: 'תכנון תחזוקה שוטפת',
        due_date: '2026-02-15',
        status: 'open',
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockFinding, error: null }),
          }),
        }),
      } as any)

      const result = await createAuditFinding({
        task_id: 'task-1',
        severity: 'critical',
        finding: 'ליקוי קריטי בבטיחות',
        root_cause: 'היעדר תחזוקה',
        capa: 'תכנון תחזוקה שוטפת',
        due_date: '2026-02-15',
      })

      expect(result.error).toBeNull()
      expect(result.data?.root_cause).toBe('היעדר תחזוקה')
      expect(result.data?.capa).toBe('תכנון תחזוקה שוטפת')
    })

    it('returns error when task_id is missing', async () => {
      const result = await createAuditFinding({
        task_id: '',
        severity: 'high',
        finding: 'Test finding',
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('task_id')
    })

    it('returns error when finding is empty', async () => {
      const result = await createAuditFinding({
        task_id: 'task-1',
        severity: 'high',
        finding: '',
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('finding')
    })

    it('returns error for invalid severity', async () => {
      const result = await createAuditFinding({
        task_id: 'task-1',
        severity: 'invalid' as any,
        finding: 'Test finding',
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('severity')
    })
  })

  describe('getAuditFinding', () => {
    it('returns a finding by ID', async () => {
      const mockFinding = {
        id: 'finding-1',
        task_id: 'task-1',
        severity: 'high',
        finding: 'חריגה מהתקן',
        root_cause: 'בעיית נוהל',
        capa: 'עדכון נוהל',
        due_date: '2026-02-15',
        status: 'in_progress',
        created_at: '2026-01-15T10:00:00Z',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockFinding, error: null }),
          }),
        }),
      } as any)

      const result = await getAuditFinding('finding-1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(mockFinding)
    })

    it('returns null when finding not found', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any)

      const result = await getAuditFinding('non-existent')

      expect(result.error).toBeNull()
      expect(result.data).toBeNull()
    })
  })

  describe('getAuditFindings', () => {
    it('returns findings for a project', async () => {
      const mockFindings = [
        {
          id: 'finding-1',
          task_id: 'task-1',
          severity: 'critical',
          finding: 'ממצא קריטי',
          status: 'open',
        },
        {
          id: 'finding-2',
          task_id: 'task-2',
          severity: 'high',
          finding: 'ממצא גבוה',
          status: 'in_progress',
        },
      ]

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockFindings, error: null }),
          }),
        }),
      } as any)

      const result = await getAuditFindings('proj-1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(2)
    })

    it('filters by severity when provided', async () => {
      const mockFindings = [
        {
          id: 'finding-1',
          task_id: 'task-1',
          severity: 'critical',
          finding: 'ממצא קריטי',
          status: 'open',
        },
      ]

      const mockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockFindings, error: null }),
        }),
      })

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      } as any)

      const result = await getAuditFindings('proj-1', { severity: 'critical' })

      expect(result.error).toBeNull()
      expect(result.data?.[0].severity).toBe('critical')
    })

    it('filters by status when provided', async () => {
      const mockFindings = [
        {
          id: 'finding-2',
          task_id: 'task-2',
          severity: 'high',
          finding: 'ממצא גבוה',
          status: 'open',
        },
      ]

      const mockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockFindings, error: null }),
        }),
      })

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      } as any)

      const result = await getAuditFindings('proj-1', { status: 'open' })

      expect(result.error).toBeNull()
      expect(result.data?.[0].status).toBe('open')
    })

    it('returns empty array when no findings exist', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any)

      const result = await getAuditFindings('proj-1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })
  })

  describe('getAuditFindingsByTask', () => {
    it('returns findings for a specific task', async () => {
      const mockFindings = [
        {
          id: 'finding-1',
          task_id: 'task-1',
          severity: 'high',
          finding: 'ממצא א',
          status: 'open',
        },
        {
          id: 'finding-2',
          task_id: 'task-1',
          severity: 'medium',
          finding: 'ממצא ב',
          status: 'closed',
        },
      ]

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockFindings, error: null }),
          }),
        }),
      } as any)

      const result = await getAuditFindingsByTask('task-1')

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(2)
      expect(result.data?.[0].task_id).toBe('task-1')
    })
  })

  describe('updateAuditFinding', () => {
    it('updates finding status', async () => {
      const mockFinding = {
        id: 'finding-1',
        task_id: 'task-1',
        severity: 'high',
        finding: 'חריגה מהתקן',
        status: 'closed',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockFinding, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updateAuditFinding('finding-1', { status: 'closed' })

      expect(result.error).toBeNull()
      expect(result.data?.status).toBe('closed')
    })

    it('updates root_cause and capa', async () => {
      const mockFinding = {
        id: 'finding-1',
        task_id: 'task-1',
        severity: 'high',
        finding: 'חריגה מהתקן',
        root_cause: 'סיבת שורש חדשה',
        capa: 'פעולה מתקנת חדשה',
        status: 'in_progress',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockFinding, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updateAuditFinding('finding-1', {
        root_cause: 'סיבת שורש חדשה',
        capa: 'פעולה מתקנת חדשה',
      })

      expect(result.error).toBeNull()
      expect(result.data?.root_cause).toBe('סיבת שורש חדשה')
      expect(result.data?.capa).toBe('פעולה מתקנת חדשה')
    })

    it('updates severity', async () => {
      const mockFinding = {
        id: 'finding-1',
        task_id: 'task-1',
        severity: 'critical',
        finding: 'חריגה מהתקן',
        status: 'open',
      }

      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockFinding, error: null }),
            }),
          }),
        }),
      } as any)

      const result = await updateAuditFinding('finding-1', { severity: 'critical' })

      expect(result.error).toBeNull()
      expect(result.data?.severity).toBe('critical')
    })

    it('returns error for invalid severity', async () => {
      const result = await updateAuditFinding('finding-1', { severity: 'invalid' as any })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('severity')
    })

    it('returns error for invalid status', async () => {
      const result = await updateAuditFinding('finding-1', { status: 'invalid' as any })

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('status')
    })
  })

  describe('deleteAuditFinding', () => {
    it('deletes a finding', async () => {
      const mockFrom = vi.mocked(supabase.from)
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any)

      const result = await deleteAuditFinding('finding-1')

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

      const result = await deleteAuditFinding('finding-1')

      expect(result.error).not.toBeNull()
    })
  })
})

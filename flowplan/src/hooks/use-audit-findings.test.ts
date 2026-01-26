/**
 * useAuditFindings Hook Tests (TDD)
 *
 * Tests for React Query hooks for audit findings data fetching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useAuditFindings,
  useAuditFinding,
  useAuditFindingsByTask,
  useCreateAuditFinding,
  useUpdateAuditFinding,
  useDeleteAuditFinding,
} from './use-audit-findings'
import * as auditFindingsService from '@/services/audit-findings'
import type { AuditFinding } from '@/types/entities'

// Mock the Supabase client to prevent env var errors
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

// Mock the audit findings service
vi.mock('@/services/audit-findings')

const mockFinding: AuditFinding = {
  id: 'finding-1',
  task_id: 'task-1',
  severity: 'high',
  finding: 'חריגה מהתקן',
  root_cause: 'היעדר תחזוקה',
  capa: 'תכנון תחזוקה שוטפת',
  due_date: new Date('2026-02-15'),
  status: 'open',
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

describe('useAuditFindings Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useAuditFindings', () => {
    it('fetches audit findings for a project', async () => {
      const findings = [
        mockFinding,
        { ...mockFinding, id: 'finding-2', severity: 'critical' as const },
      ]
      vi.mocked(auditFindingsService.getAuditFindings).mockResolvedValueOnce({
        data: findings,
        error: null,
      })

      const { result } = renderHook(() => useAuditFindings('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(auditFindingsService.getAuditFindings).toHaveBeenCalledWith(
        'proj-1',
        undefined
      )
    })

    it('applies severity filter when provided', async () => {
      vi.mocked(auditFindingsService.getAuditFindings).mockResolvedValueOnce({
        data: [{ ...mockFinding, severity: 'critical' as const }],
        error: null,
      })

      const { result } = renderHook(
        () => useAuditFindings('proj-1', { severity: 'critical' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(auditFindingsService.getAuditFindings).toHaveBeenCalledWith('proj-1', {
        severity: 'critical',
      })
    })

    it('applies status filter when provided', async () => {
      vi.mocked(auditFindingsService.getAuditFindings).mockResolvedValueOnce({
        data: [mockFinding],
        error: null,
      })

      const { result } = renderHook(
        () => useAuditFindings('proj-1', { status: 'open' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(auditFindingsService.getAuditFindings).toHaveBeenCalledWith('proj-1', {
        status: 'open',
      })
    })

    it('returns empty array when no findings exist', async () => {
      vi.mocked(auditFindingsService.getAuditFindings).mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => useAuditFindings('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([])
    })

    it('handles error state', async () => {
      vi.mocked(auditFindingsService.getAuditFindings).mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to fetch findings' },
      })

      const { result } = renderHook(() => useAuditFindings('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useAuditFinding', () => {
    it('fetches a single finding by ID', async () => {
      vi.mocked(auditFindingsService.getAuditFinding).mockResolvedValueOnce({
        data: mockFinding,
        error: null,
      })

      const { result } = renderHook(() => useAuditFinding('finding-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockFinding)
      expect(auditFindingsService.getAuditFinding).toHaveBeenCalledWith('finding-1')
    })

    it('is disabled when ID is not provided', () => {
      const { result } = renderHook(() => useAuditFinding(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('handles not found state', async () => {
      vi.mocked(auditFindingsService.getAuditFinding).mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => useAuditFinding('non-existent'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBeNull()
    })
  })

  describe('useAuditFindingsByTask', () => {
    it('fetches findings for a specific task', async () => {
      const taskFindings = [
        mockFinding,
        { ...mockFinding, id: 'finding-3', severity: 'medium' as const },
      ]
      vi.mocked(auditFindingsService.getAuditFindingsByTask).mockResolvedValueOnce({
        data: taskFindings,
        error: null,
      })

      const { result } = renderHook(() => useAuditFindingsByTask('task-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(auditFindingsService.getAuditFindingsByTask).toHaveBeenCalledWith('task-1')
    })

    it('is disabled when task ID is not provided', () => {
      const { result } = renderHook(() => useAuditFindingsByTask(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useCreateAuditFinding', () => {
    it('creates a new finding', async () => {
      vi.mocked(auditFindingsService.createAuditFinding).mockResolvedValueOnce({
        data: mockFinding,
        error: null,
      })

      const { result } = renderHook(() => useCreateAuditFinding(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        task_id: 'task-1',
        severity: 'high',
        finding: 'חריגה מהתקן',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(auditFindingsService.createAuditFinding).toHaveBeenCalledWith({
        task_id: 'task-1',
        severity: 'high',
        finding: 'חריגה מהתקן',
      })
    })

    it('creates finding with all fields', async () => {
      const fullFinding = {
        ...mockFinding,
        root_cause: 'סיבה',
        capa: 'פתרון',
        due_date: new Date('2026-02-15'),
      }
      vi.mocked(auditFindingsService.createAuditFinding).mockResolvedValueOnce({
        data: fullFinding,
        error: null,
      })

      const { result } = renderHook(() => useCreateAuditFinding(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        task_id: 'task-1',
        severity: 'critical',
        finding: 'ממצא קריטי',
        root_cause: 'סיבה',
        capa: 'פתרון',
        due_date: '2026-02-15',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('handles creation error', async () => {
      vi.mocked(auditFindingsService.createAuditFinding).mockResolvedValueOnce({
        data: null,
        error: { message: 'Finding description is required' },
      })

      const { result } = renderHook(() => useCreateAuditFinding(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        task_id: 'task-1',
        severity: 'high',
        finding: '',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useUpdateAuditFinding', () => {
    it('updates finding status', async () => {
      const updatedFinding = { ...mockFinding, status: 'closed' as const }
      vi.mocked(auditFindingsService.updateAuditFinding).mockResolvedValueOnce({
        data: updatedFinding,
        error: null,
      })

      const { result } = renderHook(() => useUpdateAuditFinding(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'finding-1',
        updates: { status: 'closed' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(auditFindingsService.updateAuditFinding).toHaveBeenCalledWith(
        'finding-1',
        { status: 'closed' }
      )
    })

    it('updates root_cause and capa', async () => {
      const updatedFinding = {
        ...mockFinding,
        root_cause: 'סיבת שורש חדשה',
        capa: 'פעולה מתקנת חדשה',
      }
      vi.mocked(auditFindingsService.updateAuditFinding).mockResolvedValueOnce({
        data: updatedFinding,
        error: null,
      })

      const { result } = renderHook(() => useUpdateAuditFinding(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'finding-1',
        updates: {
          root_cause: 'סיבת שורש חדשה',
          capa: 'פעולה מתקנת חדשה',
        },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('handles update error', async () => {
      vi.mocked(auditFindingsService.updateAuditFinding).mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid status' },
      })

      const { result } = renderHook(() => useUpdateAuditFinding(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'finding-1',
        updates: { status: 'invalid' as any },
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useDeleteAuditFinding', () => {
    it('deletes a finding', async () => {
      vi.mocked(auditFindingsService.deleteAuditFinding).mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => useDeleteAuditFinding(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('finding-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(auditFindingsService.deleteAuditFinding).toHaveBeenCalledWith('finding-1')
    })

    it('handles delete error', async () => {
      vi.mocked(auditFindingsService.deleteAuditFinding).mockResolvedValueOnce({
        data: null,
        error: { message: 'Record not found' },
      })

      const { result } = renderHook(() => useDeleteAuditFinding(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('non-existent')

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })
})

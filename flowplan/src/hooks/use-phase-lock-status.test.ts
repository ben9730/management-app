/**
 * usePhaseLockStatus Hook Tests
 *
 * Tests for the derived phase lock status hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { usePhaseLockStatus } from './use-phase-lock-status'
import * as phasesService from '@/services/phases'
import * as tasksService from '@/services/tasks'
import type { ProjectPhase, Task } from '@/types/entities'

// Mock the Supabase client to prevent env var errors
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

// Mock the services (not the hooks -- let the real hooks call mocked services)
vi.mock('@/services/phases')
vi.mock('@/services/tasks')

// Also mock team-members since tasks service imports it
vi.mock('@/services/team-members', () => ({
  ensureProjectMember: vi.fn(),
}))

// Factory helpers
const makePhase = (overrides: Partial<ProjectPhase> = {}): ProjectPhase => ({
  id: 'phase-1',
  project_id: 'proj-1',
  name: 'Test Phase',
  description: null,
  phase_order: 1,
  order_index: 0,
  status: 'pending',
  start_date: null,
  end_date: null,
  total_tasks: 0,
  completed_tasks: 0,
  task_count: 0,
  completed_task_count: 0,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01').toISOString(),
  ...overrides,
})

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  project_id: 'proj-1',
  phase_id: 'phase-1',
  title: 'Test Task',
  description: null,
  status: 'pending',
  priority: 'medium',
  assignee_id: null,
  duration: 1,
  estimated_hours: null,
  start_date: null,
  end_date: null,
  es: null,
  ef: null,
  ls: null,
  lf: null,
  slack: 0,
  is_critical: false,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01').toISOString(),
  ...overrides,
})

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

describe('usePhaseLockStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns loading state initially', () => {
    // Mock services that never resolve immediately
    vi.mocked(phasesService.getPhases).mockReturnValue(new Promise(() => {}))
    vi.mocked(tasksService.getTasks).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => usePhaseLockStatus('proj-1'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
  })

  it('returns lock status after data loads', async () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1, name: 'Phase 1' }),
      makePhase({ id: 'p2', phase_order: 2, name: 'Phase 2' }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'done' }),
    ]

    vi.mocked(phasesService.getPhases).mockResolvedValueOnce({
      data: phases,
      error: null,
    })
    vi.mocked(tasksService.getTasks).mockResolvedValueOnce({
      data: tasks,
      error: null,
    })

    const { result } = renderHook(() => usePhaseLockStatus('proj-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Phase 1 complete, so phase 2 should be unlocked
    expect(result.current.isLocked('p2')).toBe(false)
    expect(result.current.lockStatus.size).toBe(2)
  })

  it('isLocked returns true for locked phase', async () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1, name: 'Phase 1' }),
      makePhase({ id: 'p2', phase_order: 2, name: 'Phase 2' }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'pending' }),
    ]

    vi.mocked(phasesService.getPhases).mockResolvedValueOnce({
      data: phases,
      error: null,
    })
    vi.mocked(tasksService.getTasks).mockResolvedValueOnce({
      data: tasks,
      error: null,
    })

    const { result } = renderHook(() => usePhaseLockStatus('proj-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isLocked('p2')).toBe(true)
  })

  it('isLocked returns false for first phase', async () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1, name: 'Phase 1' }),
      makePhase({ id: 'p2', phase_order: 2, name: 'Phase 2' }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'pending' }),
    ]

    vi.mocked(phasesService.getPhases).mockResolvedValueOnce({
      data: phases,
      error: null,
    })
    vi.mocked(tasksService.getTasks).mockResolvedValueOnce({
      data: tasks,
      error: null,
    })

    const { result } = renderHook(() => usePhaseLockStatus('proj-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isLocked('p1')).toBe(false)
  })

  it('getLockInfo returns null for unknown phase', async () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1 }),
    ]

    vi.mocked(phasesService.getPhases).mockResolvedValueOnce({
      data: phases,
      error: null,
    })
    vi.mocked(tasksService.getTasks).mockResolvedValueOnce({
      data: [],
      error: null,
    })

    const { result } = renderHook(() => usePhaseLockStatus('proj-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.getLockInfo('nonexistent')).toBeNull()
  })

  it('returns empty map when no phases exist', async () => {
    vi.mocked(phasesService.getPhases).mockResolvedValueOnce({
      data: [],
      error: null,
    })
    vi.mocked(tasksService.getTasks).mockResolvedValueOnce({
      data: [],
      error: null,
    })

    const { result } = renderHook(() => usePhaseLockStatus('proj-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.lockStatus.size).toBe(0)
  })
})

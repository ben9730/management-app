import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { toast } from 'sonner'
import { usePhaseUnlockNotifier } from './use-phase-unlock-notifier'
import type { PhaseLockInfo, ProjectPhase } from '@/types/entities'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}))

afterEach(() => {
  vi.clearAllMocks()
})

// Helpers
function makePhase(overrides: Partial<ProjectPhase> & { id: string; name: string }): ProjectPhase {
  return {
    project_id: 'proj-1',
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
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }
}

function makeLockInfo(overrides: Partial<PhaseLockInfo> & { phaseId: string }): PhaseLockInfo {
  return {
    isLocked: false,
    reason: 'first_phase',
    blockedByPhaseId: null,
    blockedByPhaseName: null,
    ...overrides,
  }
}

const phases: ProjectPhase[] = [
  makePhase({ id: 'p1', name: 'Phase 1', phase_order: 1, order_index: 0 }),
  makePhase({ id: 'p2', name: 'Phase 2', phase_order: 2, order_index: 1 }),
  makePhase({ id: 'p3', name: 'Phase 3', phase_order: 3, order_index: 2 }),
]

describe('usePhaseUnlockNotifier', () => {
  it('does not fire toast on initial render (baseline capture)', () => {
    const lockStatus = new Map<string, PhaseLockInfo>([
      ['p1', makeLockInfo({ phaseId: 'p1', isLocked: false, reason: 'first_phase' })],
      ['p2', makeLockInfo({ phaseId: 'p2', isLocked: true, reason: 'previous_phase_incomplete', blockedByPhaseId: 'p1', blockedByPhaseName: 'Phase 1' })],
    ])

    renderHook(() => usePhaseUnlockNotifier(lockStatus, phases, false, 'proj-1'))

    expect(toast.success).not.toHaveBeenCalled()
  })

  it('fires toast when phase transitions from locked to unlocked', () => {
    const lockedStatus = new Map<string, PhaseLockInfo>([
      ['p1', makeLockInfo({ phaseId: 'p1', isLocked: false, reason: 'first_phase' })],
      ['p2', makeLockInfo({ phaseId: 'p2', isLocked: true, reason: 'previous_phase_incomplete', blockedByPhaseId: 'p1', blockedByPhaseName: 'Phase 1' })],
    ])

    const unlockedStatus = new Map<string, PhaseLockInfo>([
      ['p1', makeLockInfo({ phaseId: 'p1', isLocked: false, reason: 'first_phase' })],
      ['p2', makeLockInfo({ phaseId: 'p2', isLocked: false, reason: 'previous_phase_complete' })],
    ])

    const { rerender } = renderHook(
      ({ lockStatus, isLoading }) =>
        usePhaseUnlockNotifier(lockStatus, phases, isLoading, 'proj-1'),
      {
        initialProps: { lockStatus: lockedStatus, isLoading: false },
      }
    )

    expect(toast.success).not.toHaveBeenCalled()

    // Phase 2 unlocks
    rerender({ lockStatus: unlockedStatus, isLoading: false })

    expect(toast.success).toHaveBeenCalledOnce()
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('Phase 1'),
      expect.objectContaining({
        description: expect.stringContaining('Phase 2'),
        duration: 5000,
      })
    )
  })

  it('does not fire toast when phase stays unlocked across rerenders', () => {
    const unlockedStatus = new Map<string, PhaseLockInfo>([
      ['p1', makeLockInfo({ phaseId: 'p1', isLocked: false, reason: 'first_phase' })],
      ['p2', makeLockInfo({ phaseId: 'p2', isLocked: false, reason: 'previous_phase_complete' })],
    ])

    const { rerender } = renderHook(
      ({ lockStatus, isLoading }) =>
        usePhaseUnlockNotifier(lockStatus, phases, isLoading, 'proj-1'),
      {
        initialProps: { lockStatus: unlockedStatus, isLoading: false },
      }
    )

    // Rerender with same unlock state
    rerender({ lockStatus: new Map(unlockedStatus), isLoading: false })

    expect(toast.success).not.toHaveBeenCalled()
  })

  it('does not fire toast when isLoading is true', () => {
    const lockStatus = new Map<string, PhaseLockInfo>([
      ['p1', makeLockInfo({ phaseId: 'p1', isLocked: false, reason: 'first_phase' })],
      ['p2', makeLockInfo({ phaseId: 'p2', isLocked: true, reason: 'previous_phase_incomplete', blockedByPhaseId: 'p1', blockedByPhaseName: 'Phase 1' })],
    ])

    renderHook(() => usePhaseUnlockNotifier(lockStatus, phases, true, 'proj-1'))

    expect(toast.success).not.toHaveBeenCalled()
  })

  it('resets baseline on project switch (no spurious toasts)', () => {
    const lockStatusA = new Map<string, PhaseLockInfo>([
      ['p1', makeLockInfo({ phaseId: 'p1', isLocked: false, reason: 'first_phase' })],
      ['p2', makeLockInfo({ phaseId: 'p2', isLocked: true, reason: 'previous_phase_incomplete', blockedByPhaseId: 'p1', blockedByPhaseName: 'Phase 1' })],
    ])

    const lockStatusB = new Map<string, PhaseLockInfo>([
      ['p1', makeLockInfo({ phaseId: 'p1', isLocked: false, reason: 'first_phase' })],
      ['p2', makeLockInfo({ phaseId: 'p2', isLocked: false, reason: 'previous_phase_complete' })],
    ])

    // Render with project A (phase 2 locked)
    const { rerender } = renderHook(
      ({ lockStatus, isLoading, projectId }) =>
        usePhaseUnlockNotifier(lockStatus, phases, isLoading, projectId),
      {
        initialProps: { lockStatus: lockStatusA, isLoading: false, projectId: 'proj-A' },
      }
    )

    expect(toast.success).not.toHaveBeenCalled()

    // Switch to project B (phase 2 unlocked) — should NOT fire toast
    rerender({ lockStatus: lockStatusB, isLoading: false, projectId: 'proj-B' })

    expect(toast.success).not.toHaveBeenCalled()
  })

  it('uses stable toast id to prevent duplicates', () => {
    const lockedStatus = new Map<string, PhaseLockInfo>([
      ['p1', makeLockInfo({ phaseId: 'p1', isLocked: false, reason: 'first_phase' })],
      ['p2', makeLockInfo({ phaseId: 'p2', isLocked: true, reason: 'previous_phase_incomplete', blockedByPhaseId: 'p1', blockedByPhaseName: 'Phase 1' })],
    ])

    const unlockedStatus = new Map<string, PhaseLockInfo>([
      ['p1', makeLockInfo({ phaseId: 'p1', isLocked: false, reason: 'first_phase' })],
      ['p2', makeLockInfo({ phaseId: 'p2', isLocked: false, reason: 'previous_phase_complete' })],
    ])

    const { rerender } = renderHook(
      ({ lockStatus, isLoading }) =>
        usePhaseUnlockNotifier(lockStatus, phases, isLoading, 'proj-1'),
      {
        initialProps: { lockStatus: lockedStatus, isLoading: false },
      }
    )

    rerender({ lockStatus: unlockedStatus, isLoading: false })

    expect(toast.success).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        id: 'unlock-p2',
      })
    )
  })

  it('fires multiple toasts when multiple phases unlock simultaneously', () => {
    const allLockedStatus = new Map<string, PhaseLockInfo>([
      ['p1', makeLockInfo({ phaseId: 'p1', isLocked: false, reason: 'first_phase' })],
      ['p2', makeLockInfo({ phaseId: 'p2', isLocked: true, reason: 'previous_phase_incomplete', blockedByPhaseId: 'p1', blockedByPhaseName: 'Phase 1' })],
      ['p3', makeLockInfo({ phaseId: 'p3', isLocked: true, reason: 'previous_phase_incomplete', blockedByPhaseId: 'p2', blockedByPhaseName: 'Phase 2' })],
    ])

    const allUnlockedStatus = new Map<string, PhaseLockInfo>([
      ['p1', makeLockInfo({ phaseId: 'p1', isLocked: false, reason: 'first_phase' })],
      ['p2', makeLockInfo({ phaseId: 'p2', isLocked: false, reason: 'previous_phase_complete' })],
      ['p3', makeLockInfo({ phaseId: 'p3', isLocked: false, reason: 'previous_phase_complete' })],
    ])

    const { rerender } = renderHook(
      ({ lockStatus, isLoading }) =>
        usePhaseUnlockNotifier(lockStatus, phases, isLoading, 'proj-1'),
      {
        initialProps: { lockStatus: allLockedStatus, isLoading: false },
      }
    )

    rerender({ lockStatus: allUnlockedStatus, isLoading: false })

    expect(toast.success).toHaveBeenCalledTimes(2)
  })
})

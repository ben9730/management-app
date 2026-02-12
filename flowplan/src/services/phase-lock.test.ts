/**
 * Phase Lock Service Tests (TDD)
 *
 * Tests for pure phase lock status computation.
 */

import { describe, it, expect } from 'vitest'
import { computePhaseLockStatus, isPhaseLocked } from './phase-lock'
import type { ProjectPhase, Task } from '@/types/entities'

// Factory helpers matching existing codebase patterns
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

describe('computePhaseLockStatus', () => {
  it('returns empty map for no phases', () => {
    const result = computePhaseLockStatus([], [])
    expect(result.size).toBe(0)
  })

  it('first phase is always unlocked', () => {
    const phases = [makePhase({ id: 'p1', phase_order: 1 })]
    const result = computePhaseLockStatus(phases, [])
    expect(result.get('p1')?.isLocked).toBe(false)
    expect(result.get('p1')?.reason).toBe('first_phase')
  })

  it('second phase locked when first has incomplete tasks', () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1, name: 'Phase 1' }),
      makePhase({ id: 'p2', phase_order: 2, name: 'Phase 2' }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'pending' }),
    ]
    const result = computePhaseLockStatus(phases, tasks)
    expect(result.get('p2')?.isLocked).toBe(true)
    expect(result.get('p2')?.blockedByPhaseId).toBe('p1')
    expect(result.get('p2')?.blockedByPhaseName).toBe('Phase 1')
    expect(result.get('p2')?.reason).toBe('previous_phase_incomplete')
  })

  it('second phase locked when first has mixed task statuses', () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1, name: 'Phase 1' }),
      makePhase({ id: 'p2', phase_order: 2, name: 'Phase 2' }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'done' }),
      makeTask({ id: 't2', phase_id: 'p1', status: 'in_progress' }),
    ]
    const result = computePhaseLockStatus(phases, tasks)
    expect(result.get('p2')?.isLocked).toBe(true)
    expect(result.get('p2')?.blockedByPhaseId).toBe('p1')
  })

  it('second phase unlocked when all tasks in first phase are done', () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1 }),
      makePhase({ id: 'p2', phase_order: 2 }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'done' }),
      makeTask({ id: 't2', phase_id: 'p1', status: 'done' }),
    ]
    const result = computePhaseLockStatus(phases, tasks)
    expect(result.get('p2')?.isLocked).toBe(false)
    expect(result.get('p2')?.reason).toBe('previous_phase_complete')
  })

  it('empty phase does not block next phase', () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1 }),
      makePhase({ id: 'p2', phase_order: 2 }),
    ]
    // No tasks for phase p1
    const result = computePhaseLockStatus(phases, [])
    expect(result.get('p2')?.isLocked).toBe(false)
    expect(result.get('p2')?.reason).toBe('previous_phase_complete')
  })

  it('handles non-contiguous phase_order values', () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1 }),
      makePhase({ id: 'p2', phase_order: 5 }),
      makePhase({ id: 'p3', phase_order: 10 }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'done' }),
      makeTask({ id: 't2', phase_id: 'p2', status: 'pending' }),
    ]
    const result = computePhaseLockStatus(phases, tasks)
    expect(result.get('p1')?.isLocked).toBe(false)
    expect(result.get('p2')?.isLocked).toBe(false) // p1 all done
    expect(result.get('p3')?.isLocked).toBe(true) // p2 has pending
    expect(result.get('p3')?.blockedByPhaseId).toBe('p2')
  })

  it('tasks with null phase_id are ignored', () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1 }),
      makePhase({ id: 'p2', phase_order: 2 }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'done' }),
      makeTask({ id: 't-orphan', phase_id: null, status: 'pending' }),
    ]
    const result = computePhaseLockStatus(phases, tasks)
    // Orphan task should not block phase 2
    expect(result.get('p2')?.isLocked).toBe(false)
  })

  it('chain of three phases with proper cascading', () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1, name: 'Phase 1' }),
      makePhase({ id: 'p2', phase_order: 2, name: 'Phase 2' }),
      makePhase({ id: 'p3', phase_order: 3, name: 'Phase 3' }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'done' }),
      makeTask({ id: 't2', phase_id: 'p2', status: 'pending' }),
    ]
    const result = computePhaseLockStatus(phases, tasks)
    expect(result.get('p1')?.isLocked).toBe(false) // first phase
    expect(result.get('p2')?.isLocked).toBe(false) // p1 complete
    expect(result.get('p3')?.isLocked).toBe(true) // p2 incomplete
    expect(result.get('p3')?.blockedByPhaseId).toBe('p2') // blocked by p2, not p1
    expect(result.get('p3')?.blockedByPhaseName).toBe('Phase 2')
  })

  it('single phase project is always unlocked', () => {
    const phases = [makePhase({ id: 'p1', phase_order: 1 })]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'pending' }),
      makeTask({ id: 't2', phase_id: 'p1', status: 'in_progress' }),
    ]
    const result = computePhaseLockStatus(phases, tasks)
    expect(result.get('p1')?.isLocked).toBe(false)
    expect(result.get('p1')?.reason).toBe('first_phase')
  })

  it('phases sorted correctly regardless of input order', () => {
    // Pass phases in reverse order
    const phasesReversed = [
      makePhase({ id: 'p3', phase_order: 3, name: 'Phase 3' }),
      makePhase({ id: 'p1', phase_order: 1, name: 'Phase 1' }),
      makePhase({ id: 'p2', phase_order: 2, name: 'Phase 2' }),
    ]
    // Same phases in correct order
    const phasesSorted = [
      makePhase({ id: 'p1', phase_order: 1, name: 'Phase 1' }),
      makePhase({ id: 'p2', phase_order: 2, name: 'Phase 2' }),
      makePhase({ id: 'p3', phase_order: 3, name: 'Phase 3' }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'done' }),
      makeTask({ id: 't2', phase_id: 'p2', status: 'pending' }),
    ]

    const resultReversed = computePhaseLockStatus(phasesReversed, tasks)
    const resultSorted = computePhaseLockStatus(phasesSorted, tasks)

    // Both should produce identical lock status
    expect(resultReversed.get('p1')?.isLocked).toBe(resultSorted.get('p1')?.isLocked)
    expect(resultReversed.get('p2')?.isLocked).toBe(resultSorted.get('p2')?.isLocked)
    expect(resultReversed.get('p3')?.isLocked).toBe(resultSorted.get('p3')?.isLocked)
  })
})

describe('isPhaseLocked', () => {
  it('returns true for locked phase', () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1 }),
      makePhase({ id: 'p2', phase_order: 2 }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'pending' }),
    ]
    expect(isPhaseLocked('p2', phases, tasks)).toBe(true)
  })

  it('returns false for unlocked phase', () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1 }),
      makePhase({ id: 'p2', phase_order: 2 }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'done' }),
    ]
    expect(isPhaseLocked('p2', phases, tasks)).toBe(false)
  })

  it('returns false for unknown phase id', () => {
    const phases = [makePhase({ id: 'p1', phase_order: 1 })]
    expect(isPhaseLocked('nonexistent', phases, [])).toBe(false)
  })
})

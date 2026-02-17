/**
 * Tests for syncProgressAndStatus
 *
 * Bidirectional sync between percent_complete and status,
 * with automatic actual_start_date and actual_finish_date management.
 */

import { describe, it, expect } from 'vitest'
import { syncProgressAndStatus, type ProgressSyncInput } from './progress-sync'

const TODAY = '2026-02-17'

function makeTask(overrides: Partial<ProgressSyncInput> = {}): ProgressSyncInput {
  return {
    percent_complete: 0,
    status: 'pending',
    actual_start_date: null,
    actual_finish_date: null,
    ...overrides,
  }
}

describe('syncProgressAndStatus', () => {
  // ============================================
  // Percent-driven sync
  // ============================================
  describe('percent-driven sync', () => {
    it('percent_complete=0 -> status=pending, actual_finish_date=null', () => {
      const current = makeTask({ percent_complete: 50, status: 'in_progress', actual_start_date: '2026-02-10' })
      const result = syncProgressAndStatus(current, { percent_complete: 0 }, TODAY)

      expect(result.percent_complete).toBe(0)
      expect(result.status).toBe('pending')
      expect(result.actual_finish_date).toBeNull()
    })

    it('percent_complete=50 -> status=in_progress, actual_start_date set if not already set', () => {
      const current = makeTask()
      const result = syncProgressAndStatus(current, { percent_complete: 50 }, TODAY)

      expect(result.percent_complete).toBe(50)
      expect(result.status).toBe('in_progress')
      expect(result.actual_start_date).toBe(TODAY)
    })

    it('percent_complete=100 -> status=done, actual_finish_date set, actual_start_date set if missing', () => {
      const current = makeTask()
      const result = syncProgressAndStatus(current, { percent_complete: 100 }, TODAY)

      expect(result.percent_complete).toBe(100)
      expect(result.status).toBe('done')
      expect(result.actual_finish_date).toBe(TODAY)
      expect(result.actual_start_date).toBe(TODAY)
    })

    it('percent_complete from 50 back to 0 -> status=pending, actual_finish_date=null, actual_start_date PRESERVED', () => {
      const current = makeTask({
        percent_complete: 50,
        status: 'in_progress',
        actual_start_date: '2026-02-10',
      })
      const result = syncProgressAndStatus(current, { percent_complete: 0 }, TODAY)

      expect(result.percent_complete).toBe(0)
      expect(result.status).toBe('pending')
      expect(result.actual_finish_date).toBeNull()
      // CRITICAL: actual_start_date is a historical record -- never clear it
      expect(result.actual_start_date).toBe('2026-02-10')
    })

    it('percent_complete=50 when actual_start_date already set -> actual_start_date NOT overwritten', () => {
      const current = makeTask({
        percent_complete: 20,
        status: 'in_progress',
        actual_start_date: '2026-02-10',
      })
      const result = syncProgressAndStatus(current, { percent_complete: 50 }, TODAY)

      expect(result.percent_complete).toBe(50)
      expect(result.status).toBe('in_progress')
      expect(result.actual_start_date).toBe('2026-02-10') // NOT overwritten with TODAY
    })

    it('percent_complete=100 when actual_start_date already set -> preserves original start date', () => {
      const current = makeTask({
        percent_complete: 50,
        status: 'in_progress',
        actual_start_date: '2026-02-10',
      })
      const result = syncProgressAndStatus(current, { percent_complete: 100 }, TODAY)

      expect(result.percent_complete).toBe(100)
      expect(result.status).toBe('done')
      expect(result.actual_start_date).toBe('2026-02-10')
      expect(result.actual_finish_date).toBe(TODAY)
    })

    it('percent_complete drops from 100 to 50 -> clears actual_finish_date', () => {
      const current = makeTask({
        percent_complete: 100,
        status: 'done',
        actual_start_date: '2026-02-10',
        actual_finish_date: '2026-02-15',
      })
      const result = syncProgressAndStatus(current, { percent_complete: 50 }, TODAY)

      expect(result.percent_complete).toBe(50)
      expect(result.status).toBe('in_progress')
      expect(result.actual_start_date).toBe('2026-02-10')
      expect(result.actual_finish_date).toBeNull()
    })
  })

  // ============================================
  // Status-driven sync
  // ============================================
  describe('status-driven sync', () => {
    it('status=done -> percent_complete=100, actual_finish_date set, actual_start_date set if missing', () => {
      const current = makeTask()
      const result = syncProgressAndStatus(current, { status: 'done' }, TODAY)

      expect(result.percent_complete).toBe(100)
      expect(result.status).toBe('done')
      expect(result.actual_finish_date).toBe(TODAY)
      expect(result.actual_start_date).toBe(TODAY)
    })

    it('status=pending -> percent_complete=0, actual_finish_date=null, actual_start_date preserved', () => {
      const current = makeTask({
        percent_complete: 50,
        status: 'in_progress',
        actual_start_date: '2026-02-10',
      })
      const result = syncProgressAndStatus(current, { status: 'pending' }, TODAY)

      expect(result.percent_complete).toBe(0)
      expect(result.status).toBe('pending')
      expect(result.actual_finish_date).toBeNull()
      expect(result.actual_start_date).toBe('2026-02-10')
    })

    it('status=in_progress -> percent_complete=max(current, 1), actual_start_date set if missing', () => {
      const current = makeTask()
      const result = syncProgressAndStatus(current, { status: 'in_progress' }, TODAY)

      expect(result.percent_complete).toBe(1) // max(0, 1) = 1
      expect(result.status).toBe('in_progress')
      expect(result.actual_start_date).toBe(TODAY)
    })

    it('status=in_progress with current percent=50 -> percent stays at 50', () => {
      const current = makeTask({
        percent_complete: 50,
        status: 'done',
        actual_start_date: '2026-02-10',
        actual_finish_date: '2026-02-15',
      })
      const result = syncProgressAndStatus(current, { status: 'in_progress' }, TODAY)

      expect(result.percent_complete).toBe(50) // max(50, 1) = 50
      expect(result.status).toBe('in_progress')
      expect(result.actual_finish_date).toBeNull()
    })

    it('status=done preserves existing actual_start_date', () => {
      const current = makeTask({
        percent_complete: 50,
        status: 'in_progress',
        actual_start_date: '2026-02-10',
      })
      const result = syncProgressAndStatus(current, { status: 'done' }, TODAY)

      expect(result.percent_complete).toBe(100)
      expect(result.actual_start_date).toBe('2026-02-10')
      expect(result.actual_finish_date).toBe(TODAY)
    })
  })

  // ============================================
  // Edge cases
  // ============================================
  describe('edge cases', () => {
    it('no change object -> returns current state unchanged', () => {
      const current = makeTask({
        percent_complete: 50,
        status: 'in_progress',
        actual_start_date: '2026-02-10',
        actual_finish_date: null,
      })
      const result = syncProgressAndStatus(current, {}, TODAY)

      expect(result.percent_complete).toBe(50)
      expect(result.status).toBe('in_progress')
      expect(result.actual_start_date).toBe('2026-02-10')
      expect(result.actual_finish_date).toBeNull()
    })

    it('percent_complete negative -> clamp to 0', () => {
      const current = makeTask()
      const result = syncProgressAndStatus(current, { percent_complete: -10 }, TODAY)

      expect(result.percent_complete).toBe(0)
      expect(result.status).toBe('pending')
    })

    it('percent_complete > 100 -> clamp to 100', () => {
      const current = makeTask()
      const result = syncProgressAndStatus(current, { percent_complete: 150 }, TODAY)

      expect(result.percent_complete).toBe(100)
      expect(result.status).toBe('done')
      expect(result.actual_finish_date).toBe(TODAY)
    })

    it('today defaults to current date when not provided', () => {
      const current = makeTask()
      const result = syncProgressAndStatus(current, { percent_complete: 50 })

      expect(result.percent_complete).toBe(50)
      expect(result.status).toBe('in_progress')
      expect(result.actual_start_date).toBeTruthy()
      // Should be a valid date string (YYYY-MM-DD format)
      expect(result.actual_start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})

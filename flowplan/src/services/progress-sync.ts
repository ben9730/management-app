/**
 * Progress Sync Service
 *
 * Bidirectional synchronization between percent_complete and status fields.
 * Automatically manages actual_start_date and actual_finish_date based on
 * progress transitions.
 *
 * Key behaviors (MS Project conventions):
 * - percent_complete=0 -> status='pending'
 * - percent_complete=1-99 -> status='in_progress'
 * - percent_complete=100 -> status='done'
 * - actual_start_date is set on first transition to >0% and NEVER cleared
 * - actual_finish_date is set at 100% and cleared when dropping below 100%
 */

import type { TaskStatus } from '@/types/entities'

export interface ProgressSyncInput {
  percent_complete: number
  status: TaskStatus
  actual_start_date: string | null
  actual_finish_date: string | null
}

export interface ProgressSyncChange {
  percent_complete?: number
  status?: TaskStatus
}

export interface ProgressSyncResult {
  percent_complete: number
  status: TaskStatus
  actual_start_date: string | null
  actual_finish_date: string | null
}

/**
 * Synchronize percent_complete and status bidirectionally,
 * auto-managing actual_start_date and actual_finish_date.
 *
 * @param current - Current task progress state
 * @param change - The change being applied (percent or status)
 * @param today - Injectable date string for testing (defaults to current date)
 * @returns The synchronized progress result
 */
export function syncProgressAndStatus(
  current: ProgressSyncInput,
  change: ProgressSyncChange,
  today?: string
): ProgressSyncResult {
  const todayStr = today ?? new Date().toISOString().split('T')[0]

  // No change -- return current state as-is
  if (change.percent_complete === undefined && change.status === undefined) {
    return {
      percent_complete: current.percent_complete,
      status: current.status,
      actual_start_date: current.actual_start_date,
      actual_finish_date: current.actual_finish_date,
    }
  }

  // Percent-driven sync: derive status from percent
  if (change.percent_complete !== undefined) {
    // Clamp to 0-100
    const percent = Math.max(0, Math.min(100, change.percent_complete))

    // Derive status from percent
    const status: TaskStatus =
      percent === 0 ? 'pending' :
      percent === 100 ? 'done' :
      'in_progress'

    // Manage actual dates
    const actual_start_date = resolveActualStartDate(
      current.actual_start_date,
      percent,
      todayStr
    )
    const actual_finish_date = resolveActualFinishDate(
      percent,
      todayStr
    )

    return {
      percent_complete: percent,
      status,
      actual_start_date,
      actual_finish_date,
    }
  }

  // Status-driven sync: derive percent from status
  const newStatus = change.status!

  if (newStatus === 'done') {
    const actual_start_date = current.actual_start_date ?? todayStr
    return {
      percent_complete: 100,
      status: 'done',
      actual_start_date,
      actual_finish_date: todayStr,
    }
  }

  if (newStatus === 'pending') {
    return {
      percent_complete: 0,
      status: 'pending',
      actual_start_date: current.actual_start_date, // Preserve (historical record)
      actual_finish_date: null,
    }
  }

  // status === 'in_progress'
  const percent = Math.max(current.percent_complete, 1)
  const actual_start_date = current.actual_start_date ?? todayStr
  return {
    percent_complete: percent,
    status: 'in_progress',
    actual_start_date,
    actual_finish_date: null, // Not done yet
  }
}

/**
 * Resolve actual_start_date:
 * - Set on first transition to >0% if not already set
 * - NEVER clear it (MS Project behavior: actual dates are historical records)
 */
function resolveActualStartDate(
  currentStartDate: string | null,
  newPercent: number,
  today: string
): string | null {
  if (newPercent > 0 && !currentStartDate) {
    return today
  }
  return currentStartDate
}

/**
 * Resolve actual_finish_date:
 * - Set when percent reaches 100
 * - Clear when percent drops below 100
 */
function resolveActualFinishDate(
  newPercent: number,
  today: string
): string | null {
  if (newPercent === 100) {
    return today
  }
  return null
}

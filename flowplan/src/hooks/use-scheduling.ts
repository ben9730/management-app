/**
 * useScheduling Hook
 *
 * Orchestrates CPM recalculation, batch persistence, and React Query cache updates.
 * Uses one-shot mutation pattern (NOT reactive useEffect) to prevent infinite loops.
 *
 * Design decisions:
 * - recalculate() accepts optional updatedTasks to avoid stale closure data
 * - AbortController-based serial queue prevents race conditions on rapid changes
 * - No useEffect watching task/dependency data -- triggered only by explicit mutations
 * - Calendar exceptions expanded from date ranges into individual Date objects
 * - workDays hardcoded to Israeli calendar [0,1,2,3,4] (Sun-Thu)
 */

import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTasks, taskKeys } from '@/hooks/use-tasks'
import { useDependencies } from '@/hooks/use-dependencies'
import { useCalendarExceptions } from '@/hooks/use-calendar-exceptions'
import { schedulingService } from '@/services/scheduling'
import { batchUpdateTaskCPMFields } from '@/services/tasks'
import type { Task, CalendarException } from '@/types/entities'

/**
 * Expand CalendarException date ranges into individual Date objects.
 * Only includes 'holiday' and 'non_working' types.
 */
function expandCalendarExceptions(exceptions: CalendarException[]): Date[] {
  const dates: Date[] = []
  for (const ex of exceptions) {
    if (ex.type !== 'holiday' && ex.type !== 'non_working') continue
    const start = ex.date instanceof Date ? ex.date : new Date(ex.date)
    dates.push(new Date(start))
    if (ex.end_date) {
      const end = ex.end_date instanceof Date ? ex.end_date : new Date(ex.end_date)
      const current = new Date(start)
      current.setDate(current.getDate() + 1)
      while (current <= end) {
        dates.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
    }
  }
  return dates
}

export function useScheduling(projectId: string, projectStartDate: Date | string | null) {
  const queryClient = useQueryClient()
  const { data: tasks = [] } = useTasks(projectId)
  const { data: dependencies = [] } = useDependencies(projectId)
  const { data: calendarExceptions = [] } = useCalendarExceptions(projectId)
  const persistRef = useRef<AbortController | null>(null)

  const workDays = [0, 1, 2, 3, 4] // Sun-Thu (Israeli calendar)
  const holidays = expandCalendarExceptions(calendarExceptions)

  const recalculate = useCallback(async (updatedTasks?: Task[]) => {
    const currentTasks = updatedTasks || tasks
    if (currentTasks.length === 0 || !projectStartDate) return

    const projectStart = projectStartDate instanceof Date
      ? projectStartDate
      : new Date(projectStartDate)

    // 1. Compute synchronously (fast, deterministic)
    const result = schedulingService.calculateCriticalPath(
      currentTasks,
      dependencies,
      projectStart,
      workDays,
      holidays
    )

    // 2. Optimistic update: put recalculated tasks into React Query cache immediately
    // This produces a new array reference, which triggers GanttChart re-render
    queryClient.setQueryData(
      taskKeys.list(projectId),
      result.tasks
    )

    // 3. Cancel any in-flight batch persist (serial queue: newest wins)
    if (persistRef.current) {
      persistRef.current.abort()
    }
    const controller = new AbortController()
    persistRef.current = controller

    // 4. Batch persist to DB in background
    try {
      if (!controller.signal.aborted) {
        await batchUpdateTaskCPMFields(result.tasks)
      }
    } catch (err) {
      // If aborted by a newer recalculation, ignore the error
      if (controller.signal.aborted) return
      // Log real errors but don't throw -- optimistic update already applied
      console.error('Failed to persist CPM fields:', err)
    }
  }, [tasks, dependencies, projectStartDate, calendarExceptions, projectId, queryClient, workDays, holidays])

  return {
    recalculate,
    tasks,
    dependencies,
    criticalPath: tasks.filter(t => t.is_critical).map(t => t.id),
  }
}

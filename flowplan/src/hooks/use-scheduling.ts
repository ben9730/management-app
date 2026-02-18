/**
 * useScheduling Hook
 *
 * Orchestrates CPM recalculation, batch persistence, and React Query cache updates.
 * Uses one-shot mutation pattern (NOT reactive useEffect) to prevent infinite loops.
 *
 * Design decisions:
 * - recalculate() is SYNCHRONOUS for UI responsiveness -- CPM + cache update happen
 *   immediately, DB persistence runs in the background (fire-and-forget).
 * - recalculate() accepts optional updatedTasks to avoid stale closure data
 * - AbortController-based serial queue prevents race conditions on rapid changes
 * - No useEffect watching task/dependency data -- triggered only by explicit mutations
 * - Calendar exceptions expanded from date ranges into individual Date objects
 * - workDays hardcoded to Israeli calendar [0,1,2,3,4] (Sun-Thu)
 * - workDays/holidays memoized to prevent useCallback invalidation on every render
 */

import { useCallback, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTasks, taskKeys } from '@/hooks/use-tasks'
import { useDependencies } from '@/hooks/use-dependencies'
import { useCalendarExceptions } from '@/hooks/use-calendar-exceptions'
import { schedulingService } from '@/services/scheduling'
import { batchUpdateTaskCPMFields } from '@/services/tasks'
import type { Task, Dependency, CalendarException, TeamMember, EmployeeTimeOff } from '@/types/entities'

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

// Stable reference: Israeli work week Sun-Thu
const WORK_DAYS = [0, 1, 2, 3, 4] as const

export function useScheduling(
  projectId: string,
  projectStartDate: Date | string | null,
  teamMembers: TeamMember[] = [],
  timeOff: EmployeeTimeOff[] = []
) {
  const queryClient = useQueryClient()
  const { data: tasks = [] } = useTasks(projectId)
  const { data: dependencies = [] } = useDependencies(projectId)
  const { data: calendarExceptions = [] } = useCalendarExceptions(projectId)
  const persistRef = useRef<AbortController | null>(null)

  // Memoize holidays so useCallback doesn't invalidate on every render
  const holidays = useMemo(
    () => expandCalendarExceptions(calendarExceptions),
    [calendarExceptions]
  )

  const recalculate = useCallback((updatedTasks?: Task[], updatedDependencies?: Dependency[]) => {
    const currentTasks = updatedTasks || tasks
    const currentDeps = updatedDependencies || dependencies
    if (currentTasks.length === 0 || !projectStartDate) return

    const projectStart = projectStartDate instanceof Date
      ? projectStartDate
      : new Date(projectStartDate)

    // 1. Compute synchronously (fast, deterministic)
    // Use resource-aware scheduling when team members are available and tasks have assignees
    const hasAssignees = teamMembers.length > 0 && currentTasks.some(t => t.assignee_id)
    const result = hasAssignees
      ? schedulingService.calculateWithResources(
          currentTasks,
          currentDeps,
          projectStart,
          [...WORK_DAYS],
          holidays,
          teamMembers,
          timeOff
        )
      : schedulingService.calculateCriticalPath(
          currentTasks,
          currentDeps,
          projectStart,
          [...WORK_DAYS],
          holidays
        )

    // 2. Cancel any in-flight refetches to prevent race condition.
    // The abort signal is set synchronously; we intentionally don't await cleanup.
    queryClient.cancelQueries({ queryKey: taskKeys.list(projectId) })

    // 3. Optimistic update: put recalculated tasks into React Query cache immediately
    // This produces a new array reference, which triggers GanttChart re-render
    queryClient.setQueryData(
      taskKeys.list(projectId),
      result.tasks
    )

    // 3b. Detect and notify constraint violations (fire-and-forget, no state updates)
    for (const task of result.tasks) {
      const taskAny = task as unknown as Record<string, unknown>

      if (taskAny._constraintOverridden) {
        // Find the driving predecessor for the toast message
        const taskDeps = currentDeps.filter(d => d.successor_id === task.id)
        let drivingPredName = 'משימה קודמת'
        for (const dep of taskDeps) {
          const pred = currentTasks.find(t => t.id === dep.predecessor_id)
          if (pred) {
            drivingPredName = pred.title
            break
          }
        }
        toast.warning('אילוץ הותאם', {
          description: `התלות ב-"${drivingPredName}" דורשת התחלה מאוחרת יותר מתאריך האילוץ של "${task.title}"`,
          duration: 5000,
        })
      }

      if (taskAny._fnltViolation) {
        const constraintDate = task.constraint_date
        const dateStr = constraintDate
          ? (constraintDate instanceof Date ? constraintDate : new Date(constraintDate as string)).toLocaleDateString('he-IL')
          : ''
        toast.error('אזהרת דדליין', {
          description: `"${task.title}" חורג מהדדליין (${dateStr})`,
          duration: 7000,
        })
      }
    }

    // 4. Cancel any in-flight batch persist (serial queue: newest wins)
    if (persistRef.current) {
      persistRef.current.abort()
    }
    const controller = new AbortController()
    persistRef.current = controller

    // 5. Fire-and-forget: persist to DB, then re-sync cache from DB.
    // We intentionally don't await -- the optimistic update is already applied,
    // so the UI is responsive immediately. Persistence runs in the background.
    void (async () => {
      try {
        if (!controller.signal.aborted) {
          await batchUpdateTaskCPMFields(result.tasks)
        }
        // After DB is up to date, invalidate to re-sync cache with DB truth
        if (!controller.signal.aborted) {
          await queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
        }
      } catch (err) {
        // If aborted by a newer recalculation, ignore the error
        if (controller.signal.aborted) return
        // Log real errors but don't throw -- optimistic update already applied
        console.error('Failed to persist CPM fields:', err)
      }
    })()
  }, [tasks, dependencies, projectStartDate, projectId, queryClient, holidays, teamMembers, timeOff])

  return {
    recalculate,
    tasks,
    dependencies,
    criticalPath: tasks.filter(t => t.is_critical).map(t => t.id),
  }
}

/**
 * GanttChart Component
 *
 * Interactive Gantt chart displaying tasks on a timeline with
 * duration bars, dependencies, and critical path highlighting.
 * Brutalist design style.
 */

import * as React from 'react'
import { cn, formatDateDisplay, parseDate } from '@/lib/utils'
import type { Task, Dependency, DependencyType } from '@/types/entities'

const constraintTypeLabels: Record<string, string> = {
  ASAP: 'בהקדם האפשרי',
  MSO: 'חייב להתחיל ב-',
  SNET: 'לא לפני',
  FNLT: 'לסיים לא אחרי',
}

/** Compute FNLT violation inline from persisted fields (not transient flags) */
function isFnltViolation(task: Task): boolean {
  if (task.constraint_type !== 'FNLT' || !task.constraint_date) return false
  const ef = task.ef || task.end_date
  if (!ef) return false
  const efDate = ef instanceof Date ? ef : new Date(ef as string)
  const cdDate = task.constraint_date instanceof Date
    ? task.constraint_date
    : new Date(task.constraint_date as string)
  return efDate > cdDate
}

export interface GanttChartProps {
  tasks: Task[]
  dependencies: Dependency[]
  criticalPathTaskIds?: string[]
  showDependencies?: boolean
  showTodayMarker?: boolean
  showZoomControls?: boolean
  viewMode?: 'day' | 'week' | 'month'
  dayWidth?: number
  className?: string
  onTaskClick?: (task: Task) => void
  onTaskBarClick?: (task: Task) => void
}

interface TaskPosition {
  task: Task
  left: number
  width: number
  top: number
}

const ZOOM_STEP = 10
const MIN_DAY_WIDTH = 20
const MAX_DAY_WIDTH = 100
const ROW_HEIGHT = 44 // Increased for better readability
const MIN_BAR_WIDTH = 60 // Minimum bar width for visibility
const TEXT_THRESHOLD_WIDTH = 80 // Hide text in bars narrower than this

function getDateRange(tasks: Task[]): { start: Date; end: Date } {
  if (tasks.length === 0) {
    const today = new Date()
    return { start: today, end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) }
  }

  let minDate: Date | null = null
  let maxDate: Date | null = null

  for (const task of tasks) {
    const start = parseDate(task.start_date)
    const end = parseDate(task.end_date)

    if (start && (!minDate || start < minDate)) {
      minDate = start
    }
    if (end && (!maxDate || end > maxDate)) {
      maxDate = end
    }
  }

  // Add buffer days
  const startDate = minDate || new Date()
  const endDate = maxDate || new Date()

  const buffer = 7 * 24 * 60 * 60 * 1000 // 7 days
  return {
    start: new Date(startDate.getTime() - buffer),
    end: new Date(endDate.getTime() + buffer),
  }
}

function getDaysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.ceil((end.getTime() - start.getTime()) / msPerDay)
}

function generateDateHeaders(start: Date, end: Date): { date: Date; label: string; isWeekend: boolean }[] {
  const headers: { date: Date; label: string; isWeekend: boolean }[] = []
  const current = new Date(start)

  while (current <= end) {
    const dayOfWeek = current.getDay()
    headers.push({
      date: new Date(current),
      label: current.getDate().toString(),
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6, // Friday, Saturday
    })
    current.setDate(current.getDate() + 1)
  }

  return headers
}

function getMonthLabels(start: Date, end: Date): { month: string; width: number; offset: number }[] {
  const months: { month: string; width: number; offset: number }[] = []
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  let current = new Date(start)
  let currentMonth = current.getMonth()
  let monthStart = 0
  let dayCount = 0

  while (current <= end) {
    if (current.getMonth() !== currentMonth) {
      months.push({
        month: monthNames[currentMonth],
        width: dayCount,
        offset: monthStart,
      })
      monthStart += dayCount
      dayCount = 0
      currentMonth = current.getMonth()
    }
    dayCount++
    current.setDate(current.getDate() + 1)
  }

  // Add last month
  if (dayCount > 0) {
    months.push({
      month: monthNames[currentMonth],
      width: dayCount,
      offset: monthStart,
    })
  }

  return months
}

function getDependencyEndpoints(
  depType: DependencyType,
  predPos: TaskPosition,
  succPos: TaskPosition,
  rowHeight: number
): { startX: number; startY: number; endX: number; endY: number } {
  const predBarHeight = rowHeight - 12
  const predCenterY = predPos.top + 6 + predBarHeight / 2
  const succCenterY = succPos.top + 6 + predBarHeight / 2

  // Use Math.max to ensure minimum bar width is accounted for
  const predRight = predPos.left + Math.max(predPos.width, MIN_BAR_WIDTH)
  const succRight = succPos.left + Math.max(succPos.width, MIN_BAR_WIDTH)

  switch (depType) {
    case 'FS':
      // Finish-to-Start: predecessor END -> successor START
      return { startX: predRight, startY: predCenterY, endX: succPos.left, endY: succCenterY }
    case 'SS':
      // Start-to-Start: predecessor START -> successor START
      return { startX: predPos.left, startY: predCenterY, endX: succPos.left, endY: succCenterY }
    case 'FF':
      // Finish-to-Finish: predecessor END -> successor END
      return { startX: predRight, startY: predCenterY, endX: succRight, endY: succCenterY }
    case 'SF':
      // Start-to-Finish: predecessor START -> successor END
      return { startX: predPos.left, startY: predCenterY, endX: succRight, endY: succCenterY }
    default:
      // Fallback to FS
      return { startX: predRight, startY: predCenterY, endX: succPos.left, endY: succCenterY }
  }
}

function getDependencyTooltipContent(dep: Dependency): string {
  const lagStr = dep.lag_days !== 0
    ? ` ${dep.lag_days > 0 ? '+' : ''}${dep.lag_days}d`
    : ''
  return `${dep.type}${lagStr}`
}

const GanttChartComponent = React.forwardRef<HTMLDivElement, GanttChartProps>(
  (
    {
      tasks,
      dependencies,
      criticalPathTaskIds = [],
      showDependencies = true,
      showTodayMarker = true,
      showZoomControls = false,
      viewMode = 'day',
      dayWidth: initialDayWidth = 40,
      className,
      onTaskClick,
      onTaskBarClick,
    },
    ref
  ) => {
    const [dayWidth, setDayWidth] = React.useState(initialDayWidth)
    const [hoveredTaskId, setHoveredTaskId] = React.useState<string | null>(null)
    const [hoveredDepId, setHoveredDepId] = React.useState<string | null>(null)
    const [hoveredDepPos, setHoveredDepPos] = React.useState<{ x: number; y: number } | null>(null)
    const timelineRef = React.useRef<HTMLDivElement>(null)

    // Memoize date range calculation
    const { start: dateRangeStart, end: dateRangeEnd } = React.useMemo(
      () => getDateRange(tasks),
      [tasks]
    )

    // Memoize date headers (expensive for long timelines)
    const dateHeaders = React.useMemo(
      () => generateDateHeaders(dateRangeStart, dateRangeEnd),
      [dateRangeStart, dateRangeEnd]
    )

    // Memoize month labels
    const monthLabels = React.useMemo(
      () => getMonthLabels(dateRangeStart, dateRangeEnd),
      [dateRangeStart, dateRangeEnd]
    )

    const totalDays = dateHeaders.length
    const timelineWidth = totalDays * dayWidth

    // Memoize task positions calculation
    const taskPositions: TaskPosition[] = React.useMemo(() => {
      return tasks.map((task, index) => {
        const taskStart = parseDate(task.start_date)
        const taskEnd = parseDate(task.end_date)

        if (!taskStart || !taskEnd) {
          return { task, left: 0, width: dayWidth, top: index * ROW_HEIGHT }
        }

        const startOffset = getDaysBetween(dateRangeStart, taskStart)
        const duration = getDaysBetween(taskStart, taskEnd) + 1

        return {
          task,
          left: startOffset * dayWidth,
          width: duration * dayWidth,
          top: index * ROW_HEIGHT,
        }
      })
    }, [tasks, dayWidth, dateRangeStart])

    // Calculate today's position
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayOffset = getDaysBetween(dateRangeStart, today)
    const todayPosition = todayOffset * dayWidth

    const handleZoomIn = () => {
      setDayWidth((prev) => Math.min(prev + ZOOM_STEP, MAX_DAY_WIDTH))
    }

    const handleZoomOut = () => {
      setDayWidth((prev) => Math.max(prev - ZOOM_STEP, MIN_DAY_WIDTH))
    }

    const handleScrollToToday = () => {
      if (timelineRef.current) {
        const containerWidth = timelineRef.current.clientWidth
        timelineRef.current.scrollLeft = todayPosition - containerWidth / 2
      }
    }

    const handleTaskRowClick = (task: Task) => {
      if (onTaskClick) {
        onTaskClick(task)
      }
    }

    const handleTaskRowKeyDown = (e: React.KeyboardEvent, task: Task) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (onTaskClick) {
          onTaskClick(task)
        }
      }
    }

    const handleTaskBarClick = (e: React.MouseEvent, task: Task) => {
      e.stopPropagation()
      if (onTaskBarClick) {
        onTaskBarClick(task)
      }
    }

    const hoveredTask = tasks.find((t) => t.id === hoveredTaskId)

    if (tasks.length === 0) {
      return (
        <div
          ref={ref}
          data-testid="gantt-chart"
          data-view={viewMode}
          role="figure"
          aria-label="Gantt chart - No tasks"
          className={cn(
            'border border-[var(--fp-border-light)] bg-[var(--fp-bg-secondary)] p-12 text-center rounded-lg shadow-sm',
            className
          )}
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--fp-bg-tertiary)] mb-3">
            <span className="text-2xl text-[var(--fp-text-tertiary)]">📊</span>
          </div>
          <p className="text-[var(--fp-text-secondary)] font-medium">No tasks to display</p>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        data-testid="gantt-chart"
        data-view={viewMode}
        role="figure"
        aria-label="Gantt chart showing project timeline"
        className={cn(
          'border border-[var(--fp-border-light)] bg-[var(--fp-bg-secondary)] overflow-hidden rounded-lg shadow-sm',
          className
        )}
      >
        {/* Controls */}
        <div className="flex items-center justify-between p-3 border-b border-[var(--fp-border-light)] bg-[var(--fp-bg-tertiary)]/50">
          <div className="flex items-center gap-4">
            {showTodayMarker && (
              <button
                data-testid="scroll-to-today"
                onClick={handleScrollToToday}
                className="px-3 py-1 text-xs font-bold border border-[var(--fp-border-medium)] rounded-full hover:bg-[var(--fp-border-light)] transition-colors text-[var(--fp-text-secondary)] hover:text-[var(--fp-text-primary)]"
              >
                Today
              </button>
            )}
            {/* Status Legend */}
            <div className="flex items-center gap-3 text-xs" data-testid="status-legend">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[var(--fp-status-pending)]"></span>
                <span className="text-[var(--fp-text-secondary)]">ממתין</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[var(--fp-status-warning)]"></span>
                <span className="text-[var(--fp-text-secondary)]">בביצוע</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[var(--fp-status-success)]"></span>
                <span className="text-[var(--fp-text-secondary)]">הושלם</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[var(--fp-critical)] ring-2 ring-[var(--fp-critical)]/30"></span>
                <span className="text-[var(--fp-text-secondary)]">קריטי</span>
              </div>
            </div>
          </div>
          {showZoomControls && (
            <div className="flex items-center gap-1">
              <button
                data-testid="zoom-out"
                onClick={handleZoomOut}
                disabled={dayWidth <= MIN_DAY_WIDTH}
                className="w-7 h-7 flex items-center justify-center border border-[var(--fp-border-medium)] rounded-md hover:bg-[var(--fp-bg-tertiary)] transition-colors disabled:opacity-50 text-[var(--fp-text-secondary)]"
              >
                -
              </button>
              <button
                data-testid="zoom-in"
                onClick={handleZoomIn}
                disabled={dayWidth >= MAX_DAY_WIDTH}
                className="w-7 h-7 flex items-center justify-center border border-[var(--fp-border-medium)] rounded-md hover:bg-[var(--fp-bg-tertiary)] transition-colors disabled:opacity-50 text-[var(--fp-text-secondary)]"
              >
                +
              </button>
            </div>
          )}
        </div>

        <div className="flex">
          {/* Task List Panel */}
          <div className="w-72 flex-shrink-0 border-r border-[var(--fp-border-light)]">
            {/* Header */}
            <div className="h-12 border-b border-[var(--fp-border-light)] bg-[var(--fp-bg-tertiary)]/30 flex items-center px-4">
              <span className="font-bold text-sm text-[var(--fp-text-primary)]">משימות</span>
            </div>
            {/* Task Rows */}
            <div className="bg-[var(--fp-bg-secondary)]">
              {tasks.map((task) => {
                const isCritical = criticalPathTaskIds.includes(task.id) || task.is_critical
                return (
                  <div
                    key={task.id}
                    data-testid={`task-row-${task.id}`}
                    tabIndex={0}
                    role="button"
                    onClick={() => handleTaskRowClick(task)}
                    onKeyDown={(e) => handleTaskRowKeyDown(e, task)}
                    className={cn(
                      'flex items-center gap-2 px-4 border-b border-[var(--fp-border-light)]/50 cursor-pointer hover:bg-[var(--fp-bg-tertiary)] transition-colors',
                      'focus:outline-none focus:bg-[var(--fp-bg-tertiary)]',
                      isCritical && 'bg-[var(--fp-status-error-bg)]'
                    )}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* Status indicator dot */}
                    <span className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      task.status === 'done' ? 'bg-[var(--fp-status-success)]' :
                        task.status === 'in_progress' ? 'bg-[var(--fp-status-warning)]' :
                          'bg-[var(--fp-status-pending)]'
                    )} />
                    <span className={cn(
                      'text-sm truncate flex-1 text-[var(--fp-text-primary)]',
                      task.status === 'done' && 'line-through opacity-70'
                    )} dir="auto">
                      {task.title}
                    </span>
                    {isCritical && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[var(--fp-critical)] text-white rounded font-bold flex-shrink-0">!</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Timeline Panel - force LTR so timeline flows left-to-right regardless of page RTL */}
          <div
            ref={timelineRef}
            data-testid="timeline-container"
            dir="ltr"
            className="flex-1 overflow-x-auto"
          >
            {/* Timeline Header */}
            <div
              data-testid="timeline-header"
              className="h-12 border-b border-[var(--fp-border-light)] bg-[var(--fp-bg-tertiary)]/30"
              style={{ width: timelineWidth }}
            >
              {/* Month Labels */}
              <div className="h-6 flex border-b border-[var(--fp-border-light)]">
                {monthLabels.map((month, idx) => (
                  <div
                    key={`${month.month}-${idx}`}
                    className="text-xs font-bold uppercase flex items-center justify-center border-r border-[var(--fp-border-light)] text-[var(--fp-text-primary)]"
                    style={{ width: month.width * dayWidth }}
                  >
                    {month.month}
                  </div>
                ))}
              </div>
              {/* Day Labels */}
              <div className="h-6 flex">
                {dateHeaders.map((header, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'text-xs flex items-center justify-center border-r border-[var(--fp-border-light)]/50 text-[var(--fp-text-secondary)]',
                      header.isWeekend && 'bg-[var(--fp-bg-tertiary)]/70'
                    )}
                    style={{ width: dayWidth }}
                  >
                    {header.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Body */}
            <div
              className="relative bg-[var(--fp-bg-secondary)]"
              style={{ width: timelineWidth, height: tasks.length * ROW_HEIGHT }}
            >
              {/* Grid Lines */}
              <div className="absolute inset-0 pointer-events-none">
                {dateHeaders.map((header, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'absolute top-0 bottom-0 border-r border-[var(--fp-border-light)]/50',
                      header.isWeekend && 'bg-[var(--fp-bg-tertiary)]/50'
                    )}
                    style={{ left: idx * dayWidth, width: dayWidth }}
                  />
                ))}
              </div>

              {/* Row Lines */}
              {tasks.map((_, idx) => (
                <div
                  key={idx}
                  className="absolute left-0 right-0 border-b border-[var(--fp-border-light)]/50 pointer-events-none"
                  style={{ top: (idx + 1) * ROW_HEIGHT - 1 }}
                />
              ))}

              {/* Today Marker */}
              {showTodayMarker && todayOffset >= 0 && todayOffset < totalDays && (
                <div
                  data-testid="today-marker"
                  className="absolute top-0 bottom-0 w-[3px] bg-[var(--fp-critical)] z-10 shadow-md"
                  style={{ left: todayPosition }}
                />
              )}

              {/* Task Bars */}
              {taskPositions.map(({ task, left, width, top }) => {
                const isCritical = criticalPathTaskIds.includes(task.id) || task.is_critical
                const barHeight = ROW_HEIGHT - 12
                const actualBarWidth = Math.max(width, MIN_BAR_WIDTH)
                const showText = actualBarWidth >= TEXT_THRESHOLD_WIDTH

                return (
                  <div
                    key={task.id}
                    data-testid={`task-bar-${task.id}`}
                    data-start-offset={Math.round(left / dayWidth)}
                    className={cn(
                      'absolute cursor-pointer transition-all group',
                      isCritical && 'critical-path',
                      `status-${task.status}`
                    )}
                    style={{
                      left,
                      width: actualBarWidth,
                      top: top + 6,
                      height: barHeight,
                    }}
                    onClick={(e) => handleTaskBarClick(e, task)}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                  >
                    <div
                      className={cn(
                        'w-full h-full rounded-lg relative overflow-hidden shadow-lg hover:shadow-xl transition-all border',
                        task.status === 'done' ? 'bg-[var(--fp-status-success)] border-[var(--fp-status-success)]' :
                          task.status === 'in_progress' ? 'bg-[var(--fp-status-warning)] border-[var(--fp-status-warning)]' :
                            task.status === 'pending' ? 'bg-[var(--fp-status-pending)] border-[var(--fp-status-pending)]' :
                              'bg-[var(--fp-brand-primary)] border-[var(--fp-brand-primary)]',
                        isCritical && 'ring-2 ring-[var(--fp-critical)] ring-offset-2 ring-offset-[var(--fp-bg-secondary)]',
                        'hover:scale-[1.02] hover:z-20'
                      )}
                    >
                      {/* Progress stripe pattern for in_progress */}
                      {task.status === 'in_progress' && (
                        <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
                      )}
                      {/* Checkmark icon for done tasks */}
                      {task.status === 'done' && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-white/90 text-sm">✓</span>
                      )}
                      {/* Task Title - only show if bar is wide enough */}
                      {showText ? (
                        <span className={cn(
                          'absolute inset-0 flex items-center text-sm font-bold truncate z-10 text-white',
                          task.status === 'done' ? 'px-6' : 'px-2.5'
                        )} dir="auto" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                          {task.title}
                        </span>
                      ) : (
                        // For narrow bars, show abbreviated text or just a dot
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/80" title={task.title}>
                          {task.status === 'done' ? '' : '•••'}
                        </span>
                      )}

                      {/* FNLT violation red tint overlay */}
                      {isFnltViolation(task) && (
                        <div className="absolute inset-0 bg-red-500/20 rounded pointer-events-none" />
                      )}

                      {/* Manual mode dashed border */}
                      {task.scheduling_mode === 'manual' && (
                        <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded pointer-events-none" />
                      )}
                    </div>

                    {/* MSO/SNET constraint indicator (blue dot) */}
                    {task.constraint_type && (task.constraint_type === 'MSO' || task.constraint_type === 'SNET') && (
                      <span
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center z-10 pointer-events-none"
                        title={`${constraintTypeLabels[task.constraint_type]}: ${task.constraint_date ? formatDateDisplay(task.constraint_date) : ''}`}
                      >
                        <span className="text-[7px] text-white font-bold">C</span>
                      </span>
                    )}

                    {/* FNLT constraint indicator (red dot with !) */}
                    {task.constraint_type === 'FNLT' && (
                      <span
                        className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center z-10 pointer-events-none"
                        title={`${constraintTypeLabels.FNLT}: ${task.constraint_date ? formatDateDisplay(task.constraint_date) : ''}`}
                      >
                        <span className="text-[8px] text-white font-bold">!</span>
                      </span>
                    )}

                    {/* FNLT deadline diamond — rendered below as standalone timeline marker */}
                  </div>
                )
              })}

              {/* FNLT deadline diamond markers (standalone timeline elements) */}
              {taskPositions.map(({ task, top }) => {
                if (task.constraint_type !== 'FNLT' || !task.constraint_date) return null
                const deadlineDate = task.constraint_date instanceof Date
                  ? task.constraint_date
                  : new Date(task.constraint_date as string)
                const deadlineLeft = getDaysBetween(dateRangeStart, deadlineDate) * dayWidth
                const barHeight = ROW_HEIGHT - 12
                return (
                  <div
                    key={`fnlt-${task.id}`}
                    className="absolute w-3 h-3 bg-red-500 rotate-45 z-10 pointer-events-none"
                    style={{
                      left: deadlineLeft - 6,
                      top: top + 6 + (barHeight / 2) - 6,
                    }}
                    title={`דדליין: ${formatDateDisplay(task.constraint_date)}`}
                  />
                )
              })}

              {/* Dependencies */}
              {showDependencies && (
                <svg className="absolute inset-0" style={{ width: timelineWidth, height: tasks.length * ROW_HEIGHT, pointerEvents: 'none' }}>
                  {dependencies.map((dep) => {
                    const predecessorPos = taskPositions.find((p) => p.task.id === dep.predecessor_id)
                    const successorPos = taskPositions.find((p) => p.task.id === dep.successor_id)
                    if (!predecessorPos || !successorPos) return null

                    const { startX, startY, endX, endY } = getDependencyEndpoints(
                      dep.type, predecessorPos, successorPos, ROW_HEIGHT
                    )

                    // Adaptive curve: adjust control points based on direction
                    const dx = endX - startX
                    const curveOffset = Math.max(15, Math.abs(dx) * 0.3)

                    const path = `M ${startX} ${startY} C ${startX + curveOffset} ${startY}, ${endX - curveOffset} ${endY}, ${endX} ${endY}`

                    return (
                      <g key={dep.id} data-testid={`dependency-${dep.id}`}>
                        <path
                          d={path}
                          fill="none"
                          stroke={hoveredDepId === dep.id ? 'var(--fp-brand-primary)' : 'var(--fp-border-medium)'}
                          strokeWidth={hoveredDepId === dep.id ? 2 : 1.5}
                          markerEnd="url(#arrowhead)"
                          strokeDasharray="4 2"
                        />
                        {/* Invisible wider path for easier hover detection */}
                        <path
                          d={path}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="12"
                          className="cursor-pointer"
                          style={{ pointerEvents: 'stroke' }}
                          onMouseEnter={(e) => {
                            setHoveredDepId(dep.id)
                            const rect = (e.currentTarget.ownerSVGElement?.closest('[data-testid="gantt-chart"]') as HTMLElement)?.getBoundingClientRect()
                            if (rect) {
                              setHoveredDepPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                            }
                          }}
                          onMouseMove={(e) => {
                            const rect = (e.currentTarget.ownerSVGElement?.closest('[data-testid="gantt-chart"]') as HTMLElement)?.getBoundingClientRect()
                            if (rect) {
                              setHoveredDepPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredDepId(null)
                            setHoveredDepPos(null)
                          }}
                        />
                      </g>
                    )
                  })}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="6"
                      markerHeight="4"
                      refX="5"
                      refY="2"
                      orient="auto"
                    >
                      <polygon points="0 0, 6 2, 0 4" fill="var(--fp-border-medium)" />
                    </marker>
                  </defs>
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Task Tooltip */}
        {hoveredTask && (
          <div
            data-testid="task-tooltip"
            className="fixed z-50 bg-[var(--fp-bg-secondary)] text-[var(--fp-text-primary)] px-4 py-3 text-sm border border-[var(--fp-border-light)] rounded-xl shadow-2xl pointer-events-none min-w-[200px]"
            dir="rtl"
          >
            <div className="font-bold mb-2 text-base">{hoveredTask.title}</div>
            <div className="space-y-1.5 text-[var(--fp-text-secondary)]">
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-70">📅</span>
                <span>{formatDateDisplay(hoveredTask.start_date)} - {formatDateDisplay(hoveredTask.end_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-70">⏱️</span>
                <span>משך: {hoveredTask.duration} ימים</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'px-2 py-0.5 text-xs font-bold rounded-full',
                  hoveredTask.status === 'done' ? 'bg-[var(--fp-status-success-bg)] text-[var(--fp-status-success)]' :
                    hoveredTask.status === 'in_progress' ? 'bg-[var(--fp-status-warning-bg)] text-[var(--fp-status-warning)]' :
                      'bg-[var(--fp-bg-tertiary)] text-[var(--fp-text-tertiary)]'
                )}>
                  {hoveredTask.status === 'done' ? 'הושלם' :
                    hoveredTask.status === 'in_progress' ? 'בביצוע' : 'ממתין'}
                </span>
                {(criticalPathTaskIds.includes(hoveredTask.id) || hoveredTask.is_critical) && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[var(--fp-status-error-bg)] text-[var(--fp-critical)]">
                    קריטי
                  </span>
                )}
              </div>

              {/* Constraint info */}
              {hoveredTask.constraint_type && hoveredTask.constraint_type !== 'ASAP' && (
                <div className="text-xs text-slate-400">
                  {constraintTypeLabels[hoveredTask.constraint_type]}{hoveredTask.constraint_date ? `: ${formatDateDisplay(hoveredTask.constraint_date)}` : ''}
                </div>
              )}

              {/* FNLT violation warning */}
              {isFnltViolation(hoveredTask) && (
                <div className="text-xs text-red-400 font-medium">
                  חריגה מהדדליין!
                </div>
              )}

              {/* Manual mode indicator */}
              {hoveredTask.scheduling_mode === 'manual' && (
                <div className="text-xs text-amber-400">
                  תזמון ידני
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dependency Tooltip */}
        {hoveredDepId && hoveredDepPos && (() => {
          const dep = dependencies.find(d => d.id === hoveredDepId)
          if (!dep) return null
          return (
            <div
              data-testid="dependency-tooltip"
              className="absolute z-50 bg-[var(--fp-bg-secondary)] text-[var(--fp-text-primary)] px-3 py-1.5 text-sm border border-[var(--fp-border-light)] rounded-lg shadow-xl pointer-events-none font-mono font-bold"
              style={{
                left: hoveredDepPos.x + 12,
                top: hoveredDepPos.y - 20,
              }}
            >
              {getDependencyTooltipContent(dep)}
            </div>
          )
        })()}
      </div>
    )
  }
)

GanttChartComponent.displayName = 'GanttChart'

// Memoize to prevent unnecessary re-renders when parent re-renders
const GanttChart = React.memo(GanttChartComponent)

export { GanttChart }

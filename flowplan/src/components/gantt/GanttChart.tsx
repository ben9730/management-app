/**
 * GanttChart Component
 *
 * Interactive Gantt chart displaying tasks on a timeline with
 * duration bars, dependencies, and critical path highlighting.
 * Brutalist design style.
 */

import * as React from 'react'
import { cn, formatDateDisplay, parseDate } from '@/lib/utils'
import type { Task, Dependency } from '@/types/entities'

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
const ROW_HEIGHT = 40

function getDateRange(tasks: Task[]): { start: Date; end: Date } {
  if (tasks.length === 0) {
    const today = new Date()
    return { start: today, end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) }
  }

  let minDate: Date | null = null
  let maxDate: Date | null = null

  for (const task of tasks) {
    const start = parseDate(task.start_date)
    const end = parseDate(task.due_date)

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

const GanttChart = React.forwardRef<HTMLDivElement, GanttChartProps>(
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
    const timelineRef = React.useRef<HTMLDivElement>(null)

    const { start: dateRangeStart, end: dateRangeEnd } = getDateRange(tasks)
    const dateHeaders = generateDateHeaders(dateRangeStart, dateRangeEnd)
    const monthLabels = getMonthLabels(dateRangeStart, dateRangeEnd)
    const totalDays = dateHeaders.length
    const timelineWidth = totalDays * dayWidth

    // Calculate task positions
    const taskPositions: TaskPosition[] = tasks.map((task, index) => {
      const taskStart = parseDate(task.start_date)
      const taskEnd = parseDate(task.due_date)

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
            'border-2 border-black bg-white p-8 text-center',
            className
          )}
        >
          <p className="text-gray-500 font-bold">No tasks to display</p>
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
          'border-2 border-black bg-white overflow-hidden',
          className
        )}
      >
        {/* Controls */}
        <div className="flex items-center justify-between p-2 border-b-2 border-black bg-gray-100">
          <div className="flex items-center gap-2">
            {showTodayMarker && (
              <button
                data-testid="scroll-to-today"
                onClick={handleScrollToToday}
                className="px-2 py-1 text-xs font-bold border-2 border-black hover:bg-black hover:text-white transition-colors"
              >
                Today
              </button>
            )}
          </div>
          {showZoomControls && (
            <div className="flex items-center gap-1">
              <button
                data-testid="zoom-out"
                onClick={handleZoomOut}
                disabled={dayWidth <= MIN_DAY_WIDTH}
                className="w-6 h-6 border-2 border-black font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-50"
              >
                -
              </button>
              <button
                data-testid="zoom-in"
                onClick={handleZoomIn}
                disabled={dayWidth >= MAX_DAY_WIDTH}
                className="w-6 h-6 border-2 border-black font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-50"
              >
                +
              </button>
            </div>
          )}
        </div>

        <div className="flex">
          {/* Task List Panel */}
          <div className="w-64 flex-shrink-0 border-r-2 border-black">
            {/* Header */}
            <div className="h-16 border-b-2 border-black bg-gray-100 flex items-center px-3">
              <span className="font-black text-sm uppercase">Tasks</span>
            </div>
            {/* Task Rows */}
            <div>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  data-testid={`task-row-${task.id}`}
                  tabIndex={0}
                  role="button"
                  onClick={() => handleTaskRowClick(task)}
                  onKeyDown={(e) => handleTaskRowKeyDown(e, task)}
                  className={cn(
                    'flex items-center px-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50',
                    'focus:outline-none focus:bg-gray-100'
                  )}
                  style={{ height: ROW_HEIGHT }}
                >
                  {task.wbs_number && (
                    <span className="text-xs font-mono text-gray-500 mr-2 w-10">
                      {task.wbs_number}
                    </span>
                  )}
                  <span className="text-sm truncate flex-1">{task.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Panel */}
          <div
            ref={timelineRef}
            data-testid="timeline-container"
            className="flex-1 overflow-x-auto"
          >
            {/* Timeline Header */}
            <div
              data-testid="timeline-header"
              className="h-16 border-b-2 border-black bg-gray-100"
              style={{ width: timelineWidth }}
            >
              {/* Month Labels */}
              <div className="h-8 flex border-b border-gray-300">
                {monthLabels.map((month, idx) => (
                  <div
                    key={`${month.month}-${idx}`}
                    className="text-xs font-bold uppercase flex items-center justify-center border-r border-gray-300"
                    style={{ width: month.width * dayWidth }}
                  >
                    {month.month}
                  </div>
                ))}
              </div>
              {/* Day Labels */}
              <div className="h-8 flex">
                {dateHeaders.map((header, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'text-xs flex items-center justify-center border-r border-gray-200',
                      header.isWeekend && 'bg-gray-200'
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
              className="relative"
              style={{ width: timelineWidth, height: tasks.length * ROW_HEIGHT }}
            >
              {/* Grid Lines */}
              <div className="absolute inset-0">
                {dateHeaders.map((header, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'absolute top-0 bottom-0 border-r border-gray-100',
                      header.isWeekend && 'bg-gray-50'
                    )}
                    style={{ left: idx * dayWidth, width: dayWidth }}
                  />
                ))}
              </div>

              {/* Row Lines */}
              {tasks.map((_, idx) => (
                <div
                  key={idx}
                  className="absolute left-0 right-0 border-b border-gray-200"
                  style={{ top: (idx + 1) * ROW_HEIGHT - 1 }}
                />
              ))}

              {/* Today Marker */}
              {showTodayMarker && todayOffset >= 0 && todayOffset < totalDays && (
                <div
                  data-testid="today-marker"
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{ left: todayPosition }}
                />
              )}

              {/* Task Bars */}
              {taskPositions.map(({ task, left, width, top }) => {
                const isCritical = criticalPathTaskIds.includes(task.id)
                const isMilestone = task.task_type === 'milestone'

                return (
                  <div
                    key={task.id}
                    data-testid={`task-bar-${task.id}`}
                    data-start-offset={Math.round(left / dayWidth)}
                    className={cn(
                      'absolute cursor-pointer transition-all',
                      isCritical && 'critical-path',
                      isMilestone && 'milestone',
                      `status-${task.status}`
                    )}
                    style={{
                      left,
                      width: isMilestone ? ROW_HEIGHT - 8 : width,
                      top: top + 4,
                      height: ROW_HEIGHT - 8,
                    }}
                    onClick={(e) => handleTaskBarClick(e, task)}
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                  >
                    {isMilestone ? (
                      <div
                        className={cn(
                          'w-full h-full rotate-45 transform origin-center',
                          isCritical ? 'bg-red-600' : 'bg-black'
                        )}
                      />
                    ) : (
                      <div
                        className={cn(
                          'w-full h-full border-2 border-black relative overflow-hidden',
                          task.status === 'done' && 'bg-green-200',
                          task.status === 'in_progress' && 'bg-blue-200',
                          task.status === 'pending' && 'bg-gray-200',
                          isCritical && 'border-red-600 border-3'
                        )}
                      >
                        {/* Progress Fill */}
                        <div
                          data-testid={`task-progress-${task.id}`}
                          className={cn(
                            'absolute inset-y-0 left-0',
                            task.status === 'done' && 'bg-green-500',
                            task.status === 'in_progress' && 'bg-blue-500',
                            task.status === 'pending' && 'bg-gray-400'
                          )}
                          style={{ width: `${task.progress_percent}%` }}
                        />
                        {/* Task Title */}
                        <span className="absolute inset-0 flex items-center px-2 text-xs font-bold truncate z-10">
                          {task.title}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Dependencies */}
              {showDependencies && (
                <svg className="absolute inset-0 pointer-events-none" style={{ width: timelineWidth, height: tasks.length * ROW_HEIGHT }}>
                  {dependencies.map((dep) => {
                    const predecessorPos = taskPositions.find((p) => p.task.id === dep.predecessor_id)
                    const successorPos = taskPositions.find((p) => p.task.id === dep.successor_id)

                    if (!predecessorPos || !successorPos) return null

                    const startX = predecessorPos.left + predecessorPos.width
                    const startY = predecessorPos.top + ROW_HEIGHT / 2
                    const endX = successorPos.left
                    const endY = successorPos.top + ROW_HEIGHT / 2

                    return (
                      <g key={dep.id} data-testid={`dependency-${dep.id}`}>
                        <path
                          d={`M ${startX} ${startY} L ${startX + 10} ${startY} L ${startX + 10} ${endY} L ${endX} ${endY}`}
                          fill="none"
                          stroke="#666"
                          strokeWidth="2"
                          markerEnd="url(#arrowhead)"
                        />
                      </g>
                    )
                  })}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
                    </marker>
                  </defs>
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {hoveredTask && (
          <div
            data-testid="task-tooltip"
            className="fixed z-50 bg-black text-white px-3 py-2 text-sm border-2 border-white shadow-lg"
            style={{
              pointerEvents: 'none',
            }}
          >
            <div className="font-bold">{hoveredTask.title}</div>
            <div className="text-xs mt-1">
              {formatDateDisplay(hoveredTask.start_date)} - {formatDateDisplay(hoveredTask.due_date)}
            </div>
            <div className="text-xs">Progress: {hoveredTask.progress_percent}%</div>
          </div>
        )}
      </div>
    )
  }
)

GanttChart.displayName = 'GanttChart'

export { GanttChart }

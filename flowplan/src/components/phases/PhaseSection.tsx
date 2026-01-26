/**
 * PhaseSection Component
 *
 * Displays a project phase with its tasks, progress bar,
 * and metadata. Supports collapsible view. Brutalist design.
 */

import * as React from 'react'
import { cn, formatDateDisplay, calculatePercentage } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { TaskCard } from '@/components/tasks/TaskCard'
import type { ProjectPhase, Task, TeamMember } from '@/types/entities'

export interface PhaseSectionProps {
  phase: ProjectPhase
  tasks: Task[]
  taskAssignees?: Record<string, TeamMember>
  taskSlackValues?: Record<string, number>
  criticalPathTaskIds?: string[]
  defaultCollapsed?: boolean
  className?: string
  onTaskClick?: (task: Task) => void
  onAddTask?: (phaseId: string) => void
  onTaskStatusChange?: (taskId: string, newStatus: Task['status']) => void
}

const statusDisplayMap: Record<ProjectPhase['status'], string> = {
  pending: 'Pending',
  active: 'Active',
  completed: 'Completed',
}

const statusStyleMap: Record<ProjectPhase['status'], string> = {
  pending: 'border-gray-400',
  active: 'border-blue-500',
  completed: 'border-green-500',
}

const PhaseSection = React.forwardRef<HTMLDivElement, PhaseSectionProps>(
  (
    {
      phase,
      tasks,
      taskAssignees = {},
      taskSlackValues = {},
      criticalPathTaskIds = [],
      defaultCollapsed = false,
      className,
      onTaskClick,
      onAddTask,
      onTaskStatusChange,
    },
    ref
  ) => {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
    const contentId = `phase-content-${phase.id}`

    const progressPercent = calculatePercentage(
      phase.completed_task_count,
      phase.task_count
    )

    const handleToggle = () => {
      setIsCollapsed(!isCollapsed)
    }

    const handleAddTask = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onAddTask) {
        onAddTask(phase.id)
      }
    }

    return (
      <section
        ref={ref}
        data-testid="phase-section"
        role="region"
        aria-label={`Phase: ${phase.name}`}
        className={cn(
          'border-2 border-black bg-white mb-4',
          statusStyleMap[phase.status],
          'border-l-4',
          className
        )}
      >
        {/* Phase Header */}
        <div className="flex items-start gap-4 p-4">
          <button
            data-testid="phase-header"
            aria-expanded={!isCollapsed}
            aria-controls={contentId}
            onClick={handleToggle}
            className="flex items-start gap-4 flex-1 text-left hover:bg-gray-50 transition-colors -m-4 p-4"
          >
            {/* Collapse Indicator */}
            <span
              data-testid="collapse-indicator"
              className="text-lg font-bold mt-0.5"
            >
              {isCollapsed ? '▶' : '▼'}
            </span>

            <div className="flex-1 min-w-0">
              {/* Title Row */}
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-black uppercase tracking-tight">
                  {phase.name}
                </h2>
                <Badge variant={phase.status === 'completed' ? 'success' : 'secondary'}>
                  {statusDisplayMap[phase.status]}
                </Badge>
              </div>

              {/* Description */}
              {phase.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {phase.description}
                </p>
              )}

              {/* Meta Row */}
              <div className="flex items-center gap-6 mt-2 text-sm">
                {/* Dates */}
                {phase.start_date || phase.end_date ? (
                  <span className="text-gray-600">
                    {formatDateDisplay(phase.start_date)} - {formatDateDisplay(phase.end_date)}
                  </span>
                ) : (
                  <span className="text-gray-400">No dates set</span>
                )}

                {/* Task Count */}
                <span className="font-mono">
                  {phase.completed_task_count} / {phase.task_count} tasks
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold">Progress</span>
                  <span className="font-bold">{progressPercent}%</span>
                </div>
                <div className="h-2 bg-gray-200 border border-black">
                  <div
                    data-testid="phase-progress-bar"
                    className={cn(
                      'h-full transition-all',
                      phase.status === 'completed' ? 'bg-green-600' : 'bg-black'
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </button>

          {/* Add Task Button - outside the header button */}
          {onAddTask && (
            <button
              data-testid="add-task-button"
              onClick={handleAddTask}
              className="px-3 py-1 border-2 border-black font-bold text-sm hover:bg-black hover:text-white transition-colors flex-shrink-0"
            >
              + Add Task
            </button>
          )}
        </div>

        {/* Tasks Content */}
        {!isCollapsed && (
          <div
            id={contentId}
            className="border-t-2 border-black p-4"
          >
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignee={taskAssignees[task.id]}
                    slack={taskSlackValues[task.id]}
                    isCriticalPath={criticalPathTaskIds.includes(task.id)}
                    onClick={onTaskClick}
                    onStatusChange={onTaskStatusChange}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="font-bold">No tasks in this phase</p>
                {onAddTask && (
                  <p className="mt-2">
                    <button
                      onClick={handleAddTask}
                      className="text-black underline hover:no-underline"
                    >
                      Add a task to get started
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    )
  }
)

PhaseSection.displayName = 'PhaseSection'

export { PhaseSection }

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
          'bg-white mb-6 border border-[var(--fp-border-light)] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow',
          // Left border strip via class or style - using style for dynamic colors is easier with vars
          'border-l-4',
          className
        )}
        style={{
          borderLeftColor:
            phase.status === 'completed' ? 'var(--fp-status-success)' :
              phase.status === 'active' ? 'var(--fp-brand-primary)' :
                'var(--fp-border-medium)'
        }}
      >
        {/* Phase Header */}
        <div className="flex items-center gap-4 p-4 bg-[var(--fp-bg-primary)]/30 border-b border-[var(--fp-border-light)]">
          <button
            data-testid="phase-header"
            aria-expanded={!isCollapsed}
            aria-controls={contentId}
            onClick={handleToggle}
            className="flex items-center gap-3 flex-1 text-left group"
          >
            {/* Collapse Indicator */}
            <div className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--fp-border-medium)] transition-colors text-[var(--fp-text-secondary)]">
              <span
                data-testid="collapse-indicator"
                className="text-xs transition-transform duration-200"
                style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              >
                ▼
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-[var(--fp-text-primary)] tracking-tight">
                  {phase.name}
                </h2>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2 py-0 text-[10px] font-medium border-0",
                    phase.status === 'completed' ? 'bg-[var(--fp-status-success)] text-white' :
                      phase.status === 'active' ? 'bg-[var(--fp-brand-primary)] text-white' :
                        'bg-[var(--fp-status-pending)] text-[var(--fp-text-primary)]'
                  )}
                >
                  {statusDisplayMap[phase.status]}
                </Badge>
              </div>

              {phase.description && (
                <p className="text-xs text-[var(--fp-text-secondary)] mt-0.5 truncate">
                  {phase.description}
                </p>
              )}
            </div>
          </button>

          {/* Metrics Row (Right aligned in header) */}
          <div className="flex items-center gap-6 text-xs text-[var(--fp-text-secondary)] hidden md:flex">
            {/* Dates */}
            {(phase.start_date || phase.end_date) && (
              <span className="text-[10px] bg-[var(--fp-bg-tertiary)] px-2 py-1 rounded">
                {formatDateDisplay(phase.start_date)} - {formatDateDisplay(phase.end_date)}
              </span>
            )}

            {/* Progress Mini */}
            <div className="flex items-center gap-2 min-w-[100px]">
              <div className="h-1.5 flex-1 bg-[var(--fp-border-light)] rounded-full overflow-hidden">
                <div
                  data-testid="phase-progress-bar"
                  className={cn(
                    'h-full transition-all rounded-full',
                    phase.status === 'completed' ? 'bg-[var(--fp-status-success)]' : 'bg-[var(--fp-brand-primary)]'
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-mono text-[10px] w-8 text-right">
                {progressPercent}%
              </span>
            </div>
          </div>

          {/* Add Task Button */}
          {onAddTask && (
            <button
              data-testid="add-task-button"
              onClick={handleAddTask}
              className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--fp-brand-primary)] text-white hover:opacity-90 transition-opacity shadow-sm"
              title="Add Task"
            >
              <span className="text-lg leading-none mb-0.5">+</span>
            </button>
          )}
        </div>

        {/* Tasks Content */}
        {!isCollapsed && (
          <div
            id={contentId}
            className="bg-[var(--fp-bg-tertiary)]/30"
          >
            {tasks.length > 0 ? (
              <div className="">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignee={taskAssignees[task.id]}
                    slack={taskSlackValues[task.id]}
                    isCriticalPath={criticalPathTaskIds.includes(task.id)}
                    onClick={onTaskClick}
                    onStatusChange={onTaskStatusChange}
                    className="hover:shadow-sm" // Keep hover shadow but respect TaskCard borders
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--fp-bg-tertiary)] mb-3">
                  <span className="text-2xl text-[var(--fp-text-tertiary)]">📝</span>
                </div>
                <p className="text-[var(--fp-text-secondary)] font-medium">No tasks in this phase</p>
                {onAddTask && (
                  <button
                    onClick={handleAddTask}
                    className="mt-2 text-sm text-[var(--fp-brand-primary)] hover:underline"
                  >
                    Add a task to get started
                  </button>
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

/**
 * PhaseSection Component
 *
 * Displays a project phase with its tasks, progress bar,
 * and metadata. Supports collapsible view. Brutalist design.
 */

import * as React from 'react'
import { Plus, ChevronDown, Calendar, CheckCircle2, Layout } from 'lucide-react'
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
          'bg-white mb-6 border-2 border-gray-900 rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all',
          // Left border strip 
          'border-l-8',
          className
        )}
        style={{
          borderLeftColor:
            phase.status === 'completed' ? 'var(--fp-status-success)' :
              phase.status === 'active' ? 'var(--fp-brand-primary)' :
                '#9ca3af'
        }}
      >
        {/* Phase Header */}
        <div className="flex items-center gap-4 p-4 bg-gray-100 border-b-2 border-gray-900 transition-colors">
          <button
            data-testid="phase-header"
            aria-expanded={!isCollapsed}
            aria-controls={contentId}
            onClick={handleToggle}
            className="flex items-center gap-3 flex-1 text-left group"
          >
            {/* Collapse Indicator */}
            <div
              data-testid="collapse-indicator"
              className="w-8 h-8 flex items-center justify-center rounded border-2 border-gray-900 bg-white hover:bg-gray-100 transition-all text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-none group-hover:translate-x-0.5 group-hover:translate-y-0.5"
              style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
            >
              <ChevronDown className="w-4 h-4" strokeWidth={3} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
                  {phase.name}
                </h2>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-none px-3 py-1 text-[11px] font-black border-2 border-gray-900",
                    phase.status === 'completed' ? 'bg-[#00ca72] text-white' :
                      phase.status === 'active' ? 'bg-[#a25ddc] text-white' :
                        'bg-gray-300 text-gray-900'
                  )}
                >
                  {statusDisplayMap[phase.status]}
                </Badge>
              </div>

              {phase.description && (
                <p className="text-sm text-gray-700 mt-1 font-bold">
                  {phase.description}
                </p>
              )}
            </div>
          </button>

          {/* Metrics Row (Right aligned in header) */}
          <div className="flex items-center gap-8 text-xs text-gray-900 hidden lg:flex font-black uppercase">
            {/* Dates */}
            {(phase.start_date || phase.end_date) && (
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-gray-500 mb-0.5">Timeline</span>
                <span className="text-[11px] bg-white border-2 border-gray-900 px-3 py-1 rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  {formatDateDisplay(phase.start_date)} — {formatDateDisplay(phase.end_date)}
                </span>
              </div>
            )}

            {/* Progress Mini */}
            <div className="flex flex-col items-center min-w-[140px]">
              <span className="text-[9px] text-gray-500 mb-0.5">Completion</span>
              <div className="flex items-center gap-3 w-full">
                <div className="h-5 flex-1 bg-white border-2 border-gray-900 rounded-none overflow-hidden p-0.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <div
                    data-testid="phase-progress-bar"
                    className={cn(
                      'h-full transition-all',
                      phase.status === 'completed' ? 'bg-[#00ca72]' : 'bg-[#a25ddc]'
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="font-black text-sm w-10 text-right">
                  {progressPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Add Task Button */}
          {onAddTask && (
            <button
              data-testid="add-task-button"
              onClick={handleAddTask}
              className="ml-4 w-12 h-12 flex items-center justify-center border-2 border-gray-900 bg-[#0073ea] text-white hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group"
              title="Add Task"
            >
              <Plus className="w-6 h-6 transition-transform group-hover:scale-125" strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Tasks Content */}
        {!isCollapsed && (
          <div
            id={contentId}
            className="bg-gray-50 p-1"
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

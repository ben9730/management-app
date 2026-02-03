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

const statusColorMap: Record<ProjectPhase['status'], string> = {
  pending: 'border-slate-400',
  active: 'border-indigo-500',
  completed: 'border-emerald-500',
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

    // Use database column names (total_tasks, completed_tasks) with fallback to alternatives
    const totalTasks = phase.total_tasks ?? phase.task_count ?? 0
    const completedTasks = phase.completed_tasks ?? phase.completed_task_count ?? 0
    const progressPercent = calculatePercentage(completedTasks, totalTasks)

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
        className={cn(
          'bg-card border-r-4 rounded-xl overflow-hidden custom-shadow border border-slate-200 dark:border-slate-800 transition-all',
          statusColorMap[phase.status || 'pending'],
          phase.status === 'pending' && 'opacity-70',
          className
        )}
      >
        {/* Phase Header - Accordion Style */}
        <div
          className="p-4 flex flex-wrap items-center justify-between gap-4 bg-surface/50 border-b border-slate-100 dark:border-slate-800 cursor-pointer"
          onClick={handleToggle}
          data-testid="phase-header"
        >
          <div className="flex items-center gap-4">
            <button
              className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600"
            >
              <span className={cn("material-icons text-slate-400 transition-transform duration-200", !isCollapsed && "rotate-180")}>
                expand_more
              </span>
            </button>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-3 text-foreground">
                {(phase.phase_order ?? 0) + 1}. {phase.name}
                <Badge
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold border-0 uppercase",
                    phase.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                      phase.status === 'active' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  )}
                >
                  {phase.status === 'completed' ? 'הושלם' : phase.status === 'active' ? 'פעיל' : 'PENDING'}
                </Badge>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{phase.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">לוח זמנים</p>
              <p className="text-sm font-medium text-foreground">{formatDateDisplay(phase.start_date)} - {formatDateDisplay(phase.end_date)}</p>
            </div>

            <div className="w-32 hidden sm:block">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase text-slate-400 font-bold">ביצוע</span>
                <span className="text-[10px] font-bold text-foreground">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500",
                    phase.status === 'completed' ? 'bg-emerald-500' :
                      phase.status === 'active' ? 'bg-indigo-500' : 'bg-slate-400')}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            <button
              onClick={handleAddTask}
              className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
            >
              <span className="material-icons">add_circle_outline</span>
            </button>
          </div>
        </div>

        {/* Tasks Content */}
        {!isCollapsed && (
          <div id={contentId} className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assignee={taskAssignees[task.id]}
                  slack={taskSlackValues[task.id]}
                  isCriticalPath={criticalPathTaskIds.includes(task.id)}
                  onClick={onTaskClick}
                  onStatusChange={onTaskStatusChange}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400 font-medium">אין משימות בשלב זה</p>
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

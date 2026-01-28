/**
 * TaskCard Component
 *
 * Displays individual task with priority, assignee, slack value,
 * and critical path indicator. Brutalist design style.
 */

import * as React from 'react'
import { cn, formatDateDisplay, parseDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Check, Calendar, User, Zap, Circle, Target } from 'lucide-react'
import type { Task, TeamMember } from '@/types/entities'

export interface TaskCardProps {
  task: Task
  assignee?: TeamMember | null
  slack?: number
  isCriticalPath?: boolean
  showProgress?: boolean
  compact?: boolean
  className?: string
  onClick?: (task: Task) => void
  onStatusChange?: (taskId: string, newStatus: Task['status']) => void
}

const priorityVariantMap: Record<Task['priority'], 'critical' | 'high' | 'medium' | 'low'> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
}

const statusDisplayMap: Record<Task['status'], string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Completed',
}

function isOverdue(dueDate: Date | string | null): boolean {
  if (!dueDate) return false
  const due = parseDate(dueDate)
  if (!due) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

const TaskCard = React.forwardRef<HTMLDivElement, TaskCardProps>(
  (
    {
      task,
      assignee,
      slack,
      isCriticalPath = false,
      showProgress = false,
      compact = false,
      className,
      onClick,
      onStatusChange,
    },
    ref
  ) => {
    const handleCardClick = () => {
      if (onClick) {
        onClick(task)
      }
    }

    const handleStatusToggle = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onStatusChange) {
        const newStatus = task.status === 'done' ? 'pending' : 'done'
        onStatusChange(task.id, newStatus)
      }
    }

    const overdue = isOverdue(task.due_date)


    return (
      <div
        ref={ref}
        data-testid="task-card"
        role="article"
        aria-label={`Task: ${task.title}`}
        className={cn(
          'flex items-center gap-3 p-4 bg-white border-2 border-gray-900 mb-1 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group cursor-pointer',
          isCriticalPath && 'border-l-8',
          className
        )}
        style={{
          borderLeftColor: isCriticalPath ? 'var(--fp-critical)' : 'transparent'
        }}
        onClick={handleCardClick}
      >
        {/* Status Checkbox / Completion Toggle */}
        <button
          data-testid="status-checkbox"
          aria-label={`Mark task ${task.status === 'done' ? 'incomplete' : 'complete'}`}
          onClick={handleStatusToggle}
          className={cn(
            'w-8 h-8 rounded-none border-2 border-gray-900 flex items-center justify-center transition-all bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5',
            task.status === 'done'
              ? 'bg-[#00ca72] text-white'
              : 'hover:bg-gray-100 hover:border-[#a25ddc]'
          )}
        >
          {task.status === 'done' && <Check className="w-5 h-5" strokeWidth={4} />}
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-4">

          {/* Title & WBS */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Task Type Icon */}
              <span
                data-testid="task-type-icon"
                data-type={task.task_type}
                className="text-gray-900"
              >
                {task.task_type === 'milestone' ? (
                  <Target className="w-4 h-4 text-[#e2445c]" strokeWidth={3} />
                ) : (
                  <Circle className="w-3 h-3 fill-gray-900" />
                )}
              </span>
              <h3 className="font-bold text-sm text-gray-900 truncate">
                {task.title}
              </h3>
              {task.wbs_number && (
                <span className="text-xs text-gray-500 font-mono">
                  {task.wbs_number}
                </span>
              )}
            </div>
            {!compact && task.description && (
              <p className="text-xs text-gray-700 mt-0.5 line-clamp-1">
                {task.description}
              </p>
            )}
          </div>

          {/* Meta Columns (Desktop) */}
          <div className="flex items-center gap-6">

            {/* Priority */}
            <div className="min-w-[80px] flex justify-center">
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold border-0 text-white",
                  task.priority === 'critical' ? 'bg-[var(--fp-status-error)]' :
                    task.priority === 'high' ? 'bg-[var(--fp-status-warning)]' :
                      task.priority === 'medium' ? 'bg-[var(--fp-status-info)]' :
                        'bg-gray-400'
                )}
                style={task.priority === 'critical' ? { backgroundColor: 'var(--fp-status-error)' } : {}}
              >
                {task.priority.toUpperCase()}
              </Badge>
            </div>

            {/* Status Label (optional if redundant with checkbox, but good for Monday style) */}
            <div className="min-w-[80px] hidden md:flex justify-center">
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold border-0 text-white",
                  task.status === 'done' ? 'bg-[var(--fp-status-success)]' :
                    task.status === 'in_progress' ? 'bg-[var(--fp-status-warning)]' :
                      'bg-gray-200 text-gray-900'
                )}
              >
                {statusDisplayMap[task.status]}
              </Badge>
            </div>

            {/* Due Date */}
            <div className="min-w-[100px] text-right">
              {task.due_date ? (
                <span
                  data-testid="due-date"
                  className={cn(
                    "text-xs font-semibold",
                    overdue ? 'text-[var(--fp-status-error)] font-bold' : 'text-gray-800'
                  )}
                >
                  {formatDateDisplay(task.due_date)}
                </span>
              ) : (
                <span data-testid="due-date" className="text-xs text-gray-500">
                  No due date
                </span>
              )}

              {/* Slim Slack Display */}
              {slack !== undefined && (
                <div className="text-[10px] text-[var(--fp-text-tertiary)]">
                  {slack} {slack === 1 ? 'day' : 'days'} slack
                </div>
              )}
            </div>

            {/* Assignee */}
            <div className="w-8 flex justify-center">
              {assignee ? (
                <div
                  className="w-6 h-6 rounded-full bg-[var(--fp-brand-secondary)] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
                  title={`${assignee.first_name} ${assignee.last_name}`}
                >
                  {getInitials(assignee.first_name, assignee.last_name)}
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-[var(--fp-text-tertiary)] flex items-center justify-center">
                  <span className="text-[10px] text-white">?</span>
                </div>
              )}
              {!assignee && <span className="sr-only">Unassigned</span>}
            </div>
          </div>

        </div>

        {/* Progress Bar (Bottom overlay) */}
        {showProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--fp-bg-tertiary)]">
            <div
              data-testid="progress-bar"
              className="h-full bg-[var(--fp-status-success)]"
              style={{ width: `${task.progress_percent}%` }}
            />
          </div>
        )}
      </div>
    )
  }
)

TaskCard.displayName = 'TaskCard'

export { TaskCard }

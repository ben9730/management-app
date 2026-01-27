/**
 * TaskCard Component
 *
 * Displays individual task with priority, assignee, slack value,
 * and critical path indicator. Brutalist design style.
 */

import * as React from 'react'
import { cn, formatDateDisplay, parseDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
      <article
        ref={ref}
        data-testid="task-card"
        role="article"
        aria-label={`Task: ${task.title}`}
        className={cn(
          'border-2 border-black bg-white p-3 cursor-pointer transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
          isCriticalPath && 'border-red-500 border-l-4',
          className
        )}
        onClick={handleCardClick}
      >
        <div className="flex items-start gap-3">
          {/* Critical Path Indicator */}
          <span
            data-testid="critical-path-indicator"
            className={cn(
              'text-lg font-bold leading-none mt-0.5',
              isCriticalPath ? 'text-red-600' : 'text-gray-400'
            )}
          >
            {isCriticalPath ? '■' : '□'}
          </span>

          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Task Type Icon */}
              <span
                data-testid="task-type-icon"
                data-type={task.task_type}
                className="text-sm"
              >
                {task.task_type === 'milestone' ? '◆' : '●'}
              </span>

              {/* WBS Number */}
              {task.wbs_number && (
                <span className="text-xs font-mono text-gray-500">
                  {task.wbs_number}
                </span>
              )}

              {/* Priority Badge */}
              <Badge variant={priorityVariantMap[task.priority]}>
                {task.priority.toUpperCase()}
              </Badge>

              {/* Status Badge */}
              <Badge variant="secondary">
                {statusDisplayMap[task.status]}
              </Badge>
            </div>

            {/* Title */}
            <h3 className="font-bold text-base mt-1 truncate">
              {task.title}
            </h3>

            {/* Description (only in non-compact mode) */}
            {!compact && task.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Meta Row */}
            <div className="flex items-center gap-4 mt-2 text-sm">
              {/* Due Date */}
              {task.due_date ? (
                <span
                  data-testid="due-date"
                  className={cn(overdue && 'text-red-600 font-bold')}
                >
                  {formatDateDisplay(task.due_date)}
                </span>
              ) : (
                <span data-testid="due-date" className="text-gray-400">
                  No due date
                </span>
              )}

              {/* Slack */}
              {slack !== undefined && (
                <span className="text-gray-500">
                  {slack} {slack === 1 ? 'day' : 'days'} slack
                </span>
              )}

              {/* Assignee */}
              {assignee ? (
                <div className="flex items-center gap-1">
                  <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                    {getInitials(assignee.first_name, assignee.last_name)}
                  </span>
                  <span>{assignee.first_name} {assignee.last_name}</span>
                </div>
              ) : (
                <span className="text-gray-400">Unassigned</span>
              )}
            </div>

            {/* Progress Bar */}
            {showProgress && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Progress</span>
                  <span>{task.progress_percent}%</span>
                </div>
                <div className="h-2 bg-gray-200 border border-black">
                  <div
                    data-testid="progress-bar"
                    className="h-full bg-black"
                    style={{ width: `${task.progress_percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Status Checkbox */}
          {onStatusChange && (
            <button
              data-testid="status-checkbox"
              aria-label={`Mark task ${task.status === 'done' ? 'incomplete' : 'complete'}`}
              onClick={handleStatusToggle}
              className={cn(
                'w-6 h-6 border-2 border-black flex items-center justify-center',
                'hover:bg-gray-100 transition-colors',
                task.status === 'done' && 'bg-black text-white'
              )}
            >
              {task.status === 'done' && '✓'}
            </button>
          )}
        </div>
      </article>
    )
  }
)

TaskCard.displayName = 'TaskCard'

export { TaskCard }

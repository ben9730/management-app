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
      <div
        ref={ref}
        data-testid="task-card"
        role="article"
        aria-label={`Task: ${task.title}`}
        className={cn(
          'flex items-center gap-3 p-3 bg-white border-b border-[var(--fp-border-light)] hover:bg-[var(--fp-bg-tertiary)] transition-colors group',
          isCriticalPath && 'border-l-4',
          className
        )}
        style={{
          borderLeftColor: isCriticalPath ? 'var(--fp-critical)' : 'transparent'
        }}
        onClick={handleCardClick}
      >
        {/* Critical Path Indicator (Visual only, distinct from border) */}
        {isCriticalPath && (
          <span
            data-testid="critical-path-indicator"
            className="text-[var(--fp-critical)] text-xs mr-1"
            title="Critical Path"
          >
            ■
          </span>
        )}
        {!isCriticalPath && (
          <span
            data-testid="critical-path-indicator"
            className="text-transparent text-xs mr-1 select-none"
          >
            □
          </span>
        )}

        {/* Status Checkbox / Completion Toggle */}
        <button
          data-testid="status-checkbox"
          aria-label={`Mark task ${task.status === 'done' ? 'incomplete' : 'complete'}`}
          onClick={handleStatusToggle}
          className={cn(
            'w-5 h-5 rounded-full border border-[var(--fp-border-medium)] flex items-center justify-center transition-colors',
            task.status === 'done'
              ? 'bg-[var(--fp-status-success)] border-[var(--fp-status-success)] text-white'
              : 'hover:border-[var(--fp-brand-primary)]'
          )}
        >
          {task.status === 'done' && <span className="text-xs font-bold">✓</span>}
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-4">

          {/* Title & WBS */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Task Type Icon */}
              <span
                data-testid="task-type-icon"
                data-type={task.task_type}
                className="text-[var(--fp-text-secondary)] text-xs"
              >
                {task.task_type === 'milestone' ? '◆' : '●'}
              </span>
              <h3 className="font-medium text-sm text-[var(--fp-text-primary)] truncate">
                {task.title}
              </h3>
              {task.wbs_number && (
                <span className="text-xs text-[var(--fp-text-tertiary)] font-mono">
                  {task.wbs_number}
                </span>
              )}
            </div>
            {!compact && task.description && (
              <p className="text-xs text-[var(--fp-text-secondary)] mt-0.5 line-clamp-1">
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
                        'bg-[var(--fp-status-pending)]'
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
                      'bg-[var(--fp-status-pending)] text-[var(--fp-text-secondary)]'
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
                    "text-xs",
                    overdue ? 'text-[var(--fp-status-error)] font-bold' : 'text-[var(--fp-text-secondary)]'
                  )}
                >
                  {formatDateDisplay(task.due_date)}
                </span>
              ) : (
                <span data-testid="due-date" className="text-xs text-[var(--fp-text-tertiary)]">
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

/**
 * TaskCard Component
 *
 * Displays individual task with priority, assignee, slack value,
 * and critical path indicator. Brutalist design style.
 */

import * as React from 'react'
import { cn, formatDateDisplay, parseDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { AvatarStack, AvatarData } from '@/components/ui/avatar-stack'
import { Check, Calendar, User, Zap, Circle, Target } from 'lucide-react'
import type { Task, TeamMember } from '@/types/entities'

export interface TaskCardProps {
  task: Task
  /** @deprecated Use assignees for multi-assignee support */
  assignee?: TeamMember | null
  /** Array of team members assigned to this task */
  assignees?: TeamMember[]
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

function getInitials(member?: TeamMember | null): string {
  if (!member) return '?'
  // Try display_name first
  if (member.display_name) {
    const parts = member.display_name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
    }
    return member.display_name.charAt(0).toUpperCase()
  }
  // Fall back to first_name/last_name
  const first = member.first_name?.charAt(0) || ''
  const last = member.last_name?.charAt(0) || ''
  if (first || last) return `${first}${last}`.toUpperCase()
  // Last resort: email
  return member.email?.charAt(0).toUpperCase() || '?'
}

/**
 * Convert TeamMember to AvatarData for AvatarStack
 */
function memberToAvatar(member: TeamMember): AvatarData {
  const displayName = member.display_name ||
    `${member.first_name || ''} ${member.last_name || ''}`.trim() ||
    member.email || 'Unknown'

  return {
    id: member.id,
    name: displayName,
    email: member.email,
    avatarUrl: member.avatar_url,
  }
}

const TaskCard = React.forwardRef<HTMLDivElement, TaskCardProps>(
  (
    {
      task,
      assignee,
      assignees,
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
    // Build avatar list from assignees or legacy assignee
    const avatarList = React.useMemo((): AvatarData[] => {
      if (assignees && assignees.length > 0) {
        return assignees.map(memberToAvatar)
      }
      if (assignee) {
        return [memberToAvatar(assignee)]
      }
      return []
    }, [assignees, assignee])

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

    return (
      <div
        ref={ref}
        data-testid="task-card"
        className={cn(
          'p-4 flex items-center gap-4 group hover:bg-surface/50 transition-colors cursor-pointer',
          isCriticalPath && 'border-r-4 border-emerald-500',
          className
        )}
        onClick={handleCardClick}
      >
        {/* Assignee Avatars (Right side) - use AvatarStack for multi-assignee */}
        {avatarList.length > 0 ? (
          <AvatarStack
            avatars={avatarList}
            max={3}
            size="sm"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-[10px] text-slate-300 font-bold flex-shrink-0">
            ?
          </div>
        )}

        {/* Title & Info (Middle) */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "font-semibold text-foreground truncate",
              task.status === 'done' && "text-slate-400 line-through"
            )}>
              {task.title}
            </h4>
          </div>
          {task.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">{task.description}</p>
          )}
        </div>

        {/* Meta Info (Left side) */}
        <div className="flex items-center gap-6">
          <div className="hidden md:block text-slate-500 dark:text-slate-400 text-sm">
            {formatDateDisplay(task.end_date)}
          </div>

          {/* Status Badge */}
          <span className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap",
            task.status === 'done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
              task.status === 'in_progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
          )}>
            {task.status === 'done' ? 'הושלם' : task.status === 'in_progress' ? 'בתהליך' : 'ממתין'}
          </span>

          {/* Priority Badge */}
          <span className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap",
            task.priority === 'critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
              task.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          )}>
            {task.priority.toUpperCase()}
          </span>

          {/* Checkbox */}
          <button
            data-testid="status-checkbox"
            onClick={handleStatusToggle}
            className={cn(
              "w-6 h-6 border-2 rounded flex items-center justify-center transition-all",
              task.status === 'done'
                ? "border-emerald-500 bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20"
                : "border-slate-300 dark:border-slate-600 bg-transparent"
            )}
          >
            {task.status === 'done' && (
              <span className="material-icons text-xs">check</span>
            )}
          </button>
        </div>
      </div>
    )
  }
)

TaskCard.displayName = 'TaskCard'

export { TaskCard }

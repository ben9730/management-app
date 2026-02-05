/**
 * ProjectCard Component
 *
 * Displays a single project's information with edit/delete actions.
 * Hebrew RTL support with status badges and date formatting.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Project, ProjectStatus } from '@/types/entities'

export interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onClick?: (project: Project) => void
  isDeleting?: boolean
  className?: string
}

// Hebrew status labels
const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'פעיל',
  completed: 'הושלם',
  archived: 'בארכיון',
}

// Status badge variants
const STATUS_VARIANTS: Record<ProjectStatus, 'default' | 'secondary' | 'success' | 'outline'> = {
  active: 'default',
  completed: 'success',
  archived: 'outline',
}

/**
 * Format date for display (DD/MM/YYYY)
 */
function formatDate(date: Date | string | null): string | null {
  if (!date) return null

  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null

  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()

  return `${day}/${month}/${year}`
}

/**
 * Format date range for display
 */
function formatDateRange(
  startDate: Date | string | null,
  endDate: Date | string | null
): string {
  const start = formatDate(startDate)
  const end = formatDate(endDate)

  if (!start && !end) return 'לא הוגדרו תאריכים'
  if (start && !end) return `${start} - --`
  if (!start && end) return `-- - ${end}`
  return `${start} - ${end}`
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onEdit,
  onDelete,
  onClick,
  isDeleting = false,
  className,
}) => {
  const statusLabel = STATUS_LABELS[project.status]
  const statusVariant = STATUS_VARIANTS[project.status]
  const dateRange = formatDateRange(project.start_date, project.end_date)

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(project)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(project.id)
  }

  const handleClick = () => {
    if (onClick) {
      onClick(project)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick(project)
    }
  }

  return (
    <article
      className={cn(
        'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow',
        isDeleting && 'opacity-50',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role="article"
    >
      {/* Header: Name & Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <Badge variant={statusVariant} className="text-xs mr-2 shrink-0">
          {statusLabel}
        </Badge>
      </div>

      {/* Dates */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">תאריכים:</span>
          <span
            data-testid="project-dates"
            className="font-medium text-slate-700 dark:text-slate-300"
          >
            {dateRange}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
        <Button
          variant="outline"
          size="sm"
          onClick={handleEdit}
          disabled={isDeleting}
          aria-label="עריכה"
          className="flex-1"
        >
          עריכה
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={isDeleting ? 'מוחק' : 'מחיקה'}
          className="flex-1"
        >
          {isDeleting ? 'מוחק...' : 'מחיקה'}
        </Button>
      </div>
    </article>
  )
}

ProjectCard.displayName = 'ProjectCard'

export { ProjectCard }

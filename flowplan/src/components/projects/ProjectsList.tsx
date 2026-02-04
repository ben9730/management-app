/**
 * ProjectsList Component
 *
 * Displays a list of projects with loading, empty, and error states.
 * Includes filtering by status and search functionality.
 * Hebrew RTL support with dark mode styling.
 */

import * as React from 'react'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ProjectCard } from './ProjectCard'
import type { Project, ProjectStatus } from '@/types/entities'
import { Loader2, Plus, FolderOpen, AlertCircle, Search } from 'lucide-react'

export interface ProjectsListProps {
  projects: Project[]
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onAdd: () => void
  onSelect?: (project: Project) => void
  onRetry?: () => void
  isLoading?: boolean
  error?: string | null
  deletingProjectId?: string | null
  className?: string
}

// Filter options with Hebrew labels
type FilterStatus = 'all' | ProjectStatus

interface FilterOption {
  value: FilterStatus
  label: string
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'הכל' },
  { value: 'active', label: 'פעיל' },
  { value: 'completed', label: 'הושלם' },
  { value: 'archived', label: 'בארכיון' },
]

const ProjectsList: React.FC<ProjectsListProps> = ({
  projects,
  onEdit,
  onDelete,
  onAdd,
  onSelect,
  onRetry,
  isLoading = false,
  error = null,
  deletingProjectId = null,
  className,
}) => {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter and search projects
  const filteredProjects = useMemo(() => {
    let result = projects

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      )
    }

    return result
  }, [projects, statusFilter, searchQuery])

  const projectCount = filteredProjects.length
  const totalCount = projects.length
  const countText = projectCount === 1 ? '1 פרויקט' : `${projectCount} פרויקטים`

  // Loading State
  if (isLoading) {
    return (
      <div
        data-testid="projects-container"
        className={cn('flex flex-col items-center justify-center py-16', className)}
      >
        <div
          data-testid="loading-indicator"
          className="flex flex-col items-center gap-4"
          aria-busy="true"
          aria-live="polite"
        >
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            טוען פרויקטים...
          </p>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)}>
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            שגיאה בטעינת פרויקטים
          </h3>
          <p className="text-slate-500 dark:text-slate-400">{error}</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              נסה שוב
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Empty State (no projects at all)
  if (totalCount === 0) {
    return (
      <div className={cn('flex flex-col', className)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              פרויקטים
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              (0 פרויקטים)
            </span>
          </div>
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 ml-2" />
            הוסף פרויקט
          </Button>
        </div>

        {/* Empty State Content */}
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            אין פרויקטים עדיין
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
            הוסיפו את הפרויקט הראשון שלכם כדי להתחיל לנהל משימות ולוח זמנים.
          </p>
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 ml-2" />
            הוסף פרויקט ראשון
          </Button>
        </div>
      </div>
    )
  }

  // Normal State with Projects
  return (
    <div data-testid="projects-container" className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            פרויקטים
          </h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            ({countText})
          </span>
        </div>
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף פרויקט
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Status Filters */}
        <div className="flex gap-2">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={statusFilter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(option.value)}
              data-active={statusFilter === option.value}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            role="searchbox"
            aria-label="חיפוש פרויקטים"
            placeholder="חיפוש פרויקטים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Filtered Empty State */}
      {filteredProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">
            אין פרויקטים - לא נמצאו פרויקטים התואמים לחיפוש
          </p>
        </div>
      )}

      {/* Project Grid */}
      {filteredProjects.length > 0 && (
        <div
          data-testid="projects-list"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={onEdit}
              onDelete={onDelete}
              onClick={onSelect}
              isDeleting={deletingProjectId === project.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

ProjectsList.displayName = 'ProjectsList'

export { ProjectsList }

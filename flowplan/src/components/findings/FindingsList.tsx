/**
 * FindingsList Component
 *
 * Displays a list of audit findings with severity/status filters,
 * loading, empty, and error states. Hebrew RTL support.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FindingCard } from './FindingCard'
import type { AuditFinding, FindingSeverity, FindingStatus } from '@/types/entities'
import { Loader2, Plus, AlertCircle, ClipboardList } from 'lucide-react'

export interface FindingsListProps {
  findings: AuditFinding[]
  onAdd: () => void
  onEdit: (finding: AuditFinding) => void
  onDelete: (id: string) => void
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  deletingId?: string | null
  severityFilter?: FindingSeverity | null
  statusFilter?: FindingStatus | null
  onSeverityFilterChange?: (severity: FindingSeverity | null) => void
  onStatusFilterChange?: (status: FindingStatus | null) => void
  className?: string
}

// Severity filter options (Hebrew)
const SEVERITY_OPTIONS: { value: FindingSeverity | null; label: string }[] = [
  { value: null, label: 'הכל' },
  { value: 'critical', label: 'קריטי' },
  { value: 'high', label: 'גבוה' },
  { value: 'medium', label: 'בינוני' },
  { value: 'low', label: 'נמוך' },
]

// Status filter options (Hebrew)
const STATUS_OPTIONS: { value: FindingStatus | null; label: string }[] = [
  { value: null, label: 'הכל' },
  { value: 'open', label: 'פתוח' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'closed', label: 'סגור' },
]

/**
 * Filter button component
 */
interface FilterButtonProps {
  label: string
  isActive: boolean
  onClick: () => void
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    data-active={isActive}
    className={cn(
      'px-3 py-1.5 text-sm rounded-lg transition-colors',
      isActive
        ? 'bg-primary text-white'
        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
    )}
  >
    {label}
  </button>
)

/**
 * Skeleton card for loading state
 */
const SkeletonCard: React.FC = () => (
  <div
    data-testid="skeleton-card"
    className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 animate-pulse"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-16" />
    </div>
    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-3" />
    <div className="space-y-2 mb-4">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
    </div>
    <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded flex-1" />
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded flex-1" />
    </div>
  </div>
)

const FindingsList: React.FC<FindingsListProps> = ({
  findings,
  onAdd,
  onEdit,
  onDelete,
  isLoading = false,
  error = null,
  onRetry,
  deletingId = null,
  severityFilter = null,
  statusFilter = null,
  onSeverityFilterChange,
  onStatusFilterChange,
  className,
}) => {
  // Filter findings based on active filters
  const filteredFindings = React.useMemo(() => {
    return findings.filter((finding) => {
      if (severityFilter && finding.severity !== severityFilter) {
        return false
      }
      if (statusFilter && finding.status !== statusFilter) {
        return false
      }
      return true
    })
  }, [findings, severityFilter, statusFilter])

  const findingCount = findings.length
  const filteredCount = filteredFindings.length
  const countText = findingCount === 1 ? '1 ממצא' : `${findingCount} ממצאים`

  // Handle severity filter click
  const handleSeverityClick = (severity: FindingSeverity | null) => {
    if (onSeverityFilterChange) {
      onSeverityFilterChange(severity)
    }
  }

  // Handle status filter click
  const handleStatusClick = (status: FindingStatus | null) => {
    if (onStatusFilterChange) {
      onStatusFilterChange(status)
    }
  }

  // Loading State
  if (isLoading) {
    return (
      <div
        data-testid="findings-list-container"
        dir="rtl"
        className={cn('flex flex-col', className)}
      >
        <div
          data-testid="loading-indicator"
          className="flex flex-col items-center justify-center py-16"
        >
          <div className="flex flex-col items-center gap-4 mb-8">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              טוען ממצאים...
            </p>
          </div>
          {/* Skeleton cards */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div
        data-testid="findings-list-container"
        dir="rtl"
        className={cn('flex flex-col items-center justify-center py-16', className)}
      >
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            שגיאה בטעינת ממצאים
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

  // Empty State
  if (findingCount === 0) {
    return (
      <div
        data-testid="findings-list-container"
        dir="rtl"
        className={cn('flex flex-col', className)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              ממצאי ביקורת
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              (0 ממצאים)
            </span>
          </div>
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 ml-2" />
            הוסף ממצא
          </Button>
        </div>

        {/* Empty State Content */}
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            אין ממצאים עדיין
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
            הוסיפו את הממצא הראשון כדי להתחיל לעקוב אחר ממצאי הביקורת בפרויקט.
          </p>
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 ml-2" />
            הוסף ממצא
          </Button>
        </div>
      </div>
    )
  }

  // Normal State with Findings
  return (
    <div
      data-testid="findings-list-container"
      dir="rtl"
      className={cn('flex flex-col', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            ממצאי ביקורת
          </h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            ({countText})
          </span>
        </div>
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 ml-2" />
          הוסף ממצא
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Severity Filter */}
        <div data-testid="severity-filter" className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400 ml-2 self-center">
            חומרה:
          </span>
          {SEVERITY_OPTIONS.map((option) => (
            <FilterButton
              key={option.value ?? 'all-severity'}
              label={option.label}
              isActive={severityFilter === option.value}
              onClick={() => handleSeverityClick(option.value)}
            />
          ))}
        </div>

        {/* Status Filter */}
        <div data-testid="status-filter" className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400 ml-2 self-center">
            סטטוס:
          </span>
          {STATUS_OPTIONS.map((option) => (
            <FilterButton
              key={option.value ?? 'all-status'}
              label={option.label}
              isActive={statusFilter === option.value}
              onClick={() => handleStatusClick(option.value)}
            />
          ))}
        </div>
      </div>

      {/* Findings List or No Matches */}
      {filteredCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">
            אין ממצאים תואמים לסינון הנבחר
          </p>
        </div>
      ) : (
        <div
          data-testid="findings-list"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onEdit={onEdit}
              onDelete={onDelete}
              isDeleting={deletingId === finding.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

FindingsList.displayName = 'FindingsList'

export { FindingsList }

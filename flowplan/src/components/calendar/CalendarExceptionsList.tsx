/**
 * CalendarExceptionsList Component
 *
 * Displays a list of calendar exceptions (holidays, non-working days)
 * with edit and delete capabilities.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CalendarDays, Trash2, Plus, Edit2 } from 'lucide-react'
import type { CalendarException } from '@/types/entities'

export interface CalendarExceptionsListProps {
  exceptions: CalendarException[]
  isLoading?: boolean
  onAdd?: () => void
  onEdit?: (exception: CalendarException) => void
  onDelete?: (id: string) => void
  className?: string
}

/**
 * Helper to format date for display in Hebrew format
 */
function formatDateDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Helper to format date range for display
 */
function formatDateRange(startDate: Date | string, endDate?: Date | string | null): string {
  const start = formatDateDisplay(startDate)
  if (!endDate) return start

  const end = formatDateDisplay(endDate)
  return `${start} - ${end}`
}

/**
 * Helper to get type label in Hebrew
 */
function getTypeLabel(type: string): string {
  switch (type) {
    case 'holiday':
      return 'חג'
    case 'non_working':
      return 'יום לא עובד'
    default:
      return type
  }
}

/**
 * Helper to get type badge color
 */
function getTypeBadgeClass(type: string): string {
  switch (type) {
    case 'holiday':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    case 'non_working':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

const CalendarExceptionsList: React.FC<CalendarExceptionsListProps> = ({
  exceptions,
  isLoading = false,
  onAdd,
  onEdit,
  onDelete,
  className,
}) => {
  // Sort exceptions by date
  const sortedExceptions = React.useMemo(() => {
    return [...exceptions].sort((a, b) => {
      const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date
      const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date
      return dateA.getTime() - dateB.getTime()
    })
  }, [exceptions])

  // Group by year
  const groupedByYear = React.useMemo(() => {
    const groups: Record<number, CalendarException[]> = {}
    sortedExceptions.forEach((exception) => {
      const date = typeof exception.date === 'string' ? new Date(exception.date) : exception.date
      const year = date.getFullYear()
      if (!groups[year]) {
        groups[year] = []
      }
      groups[year].push(exception)
    })
    return groups
  }, [sortedExceptions])

  const years = Object.keys(groupedByYear).map(Number).sort((a, b) => a - b)

  if (isLoading) {
    return (
      <div className={cn('p-6', className)} dir="rtl">
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <div className="animate-spin h-5 w-5 border-2 border-slate-400 border-t-transparent rounded-full" />
          <span>טוען...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)} dir="rtl">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          חגים וימים לא עובדים
        </h3>
        {onAdd && (
          <Button
            onClick={onAdd}
            size="sm"
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
            data-testid="add-calendar-exception-button"
          >
            <Plus className="h-4 w-4 ml-1" />
            הוסף
          </Button>
        )}
      </div>

      {/* Empty state */}
      {exceptions.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-lg">
          <CalendarDays className="h-12 w-12 mx-auto text-slate-500 mb-3" />
          <p className="text-slate-400 mb-4">לא הוגדרו חגים או ימים לא עובדים</p>
          {onAdd && (
            <Button
              onClick={onAdd}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
              data-testid="add-first-exception-button"
            >
              <Plus className="h-4 w-4 ml-1" />
              הוסף יום ראשון
            </Button>
          )}
        </div>
      )}

      {/* Exceptions list grouped by year */}
      {years.map((year) => (
        <div key={year} className="space-y-2">
          <h4 className="text-sm font-medium text-slate-400 border-b border-slate-700 pb-1">
            {year}
          </h4>
          <div className="space-y-2">
            {groupedByYear[year].map((exception) => (
              <div
                key={exception.id}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                data-testid={`calendar-exception-item-${exception.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium">
                      {exception.name || formatDateRange(exception.date, exception.end_date)}
                    </span>
                    {exception.name && (
                      <span className="text-sm text-slate-400">
                        {formatDateRange(exception.date, exception.end_date)}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      getTypeBadgeClass(exception.type)
                    )}
                  >
                    {getTypeLabel(exception.type)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(exception)}
                      className="text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                      data-testid={`edit-exception-${exception.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(exception.id)}
                      className="text-slate-400 hover:text-red-400 hover:bg-red-900/20"
                      data-testid={`delete-exception-${exception.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

CalendarExceptionsList.displayName = 'CalendarExceptionsList'

export { CalendarExceptionsList }

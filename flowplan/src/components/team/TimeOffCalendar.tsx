/**
 * TimeOffCalendar Component
 *
 * Displays time off entries for team members.
 * Hebrew RTL support with date formatting.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { EmployeeTimeOff, TeamMember, TimeOffStatus, TimeOffType } from '@/types/entities'
import { Loader2, Calendar, AlertCircle, Plus } from 'lucide-react'

export interface TimeOffCalendarProps {
  timeOffs: EmployeeTimeOff[]
  teamMembers: TeamMember[]
  isLoading?: boolean
  error?: string | null
  filterStatus?: TimeOffStatus
  className?: string
  /** Callback when "Add Time Off" button is clicked */
  onAddTimeOff?: () => void
}

// Time off type labels (Hebrew)
const TYPE_LABELS: Record<TimeOffType, string> = {
  vacation: 'Vacation',
  sick: 'Sick',
  personal: 'Personal',
  other: 'Other',
}

// Status labels and colors
const STATUS_CONFIG: Record<TimeOffStatus, { label: string; variant: 'success' | 'default' | 'critical' }> = {
  approved: { label: 'Approved', variant: 'success' },
  pending: { label: 'Pending', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'critical' },
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Format date range for display
 */
function formatDateRange(startDate: Date | string, endDate: Date | string): string {
  const start = startDate instanceof Date ? startDate : new Date(startDate)
  const end = endDate instanceof Date ? endDate : new Date(endDate)

  const startStr = formatDate(start)
  const endStr = formatDate(end)

  if (startStr === endStr) {
    return startStr
  }

  return `${startStr} - ${endStr}`
}

/**
 * Calculate duration in days
 */
function calculateDuration(startDate: Date | string, endDate: Date | string): number {
  const start = startDate instanceof Date ? startDate : new Date(startDate)
  const end = endDate instanceof Date ? endDate : new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // Include both start and end days
  return diffDays
}

const TimeOffCalendar: React.FC<TimeOffCalendarProps> = ({
  timeOffs,
  teamMembers,
  isLoading = false,
  error = null,
  filterStatus,
  className,
  onAddTimeOff,
}) => {
  // Create member lookup map
  const memberMap = React.useMemo(() => {
    const map = new Map<string, TeamMember>()
    teamMembers.forEach((member) => {
      map.set(member.id, member)
    })
    return map
  }, [teamMembers])

  // Get member name by user_id
  const getMemberName = (userId: string): string => {
    const member = memberMap.get(userId)
    if (member) {
      return `${member.first_name} ${member.last_name}`
    }
    return 'Unknown'
  }

  // Filter and sort time offs
  const filteredTimeOffs = React.useMemo(() => {
    let result = [...timeOffs]

    // Filter by status if provided
    if (filterStatus) {
      result = result.filter((to) => to.status === filterStatus)
    }

    // Sort by start_date (chronological)
    result.sort((a, b) => {
      const dateA = a.start_date instanceof Date ? a.start_date : new Date(a.start_date)
      const dateB = b.start_date instanceof Date ? b.start_date : new Date(b.start_date)
      return dateA.getTime() - dateB.getTime()
    })

    return result
  }, [timeOffs, filterStatus])

  // Loading State
  if (isLoading) {
    return (
      <div className={cn('flex flex-col', className)}>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Time Off Calendar
        </h2>
        <div
          data-testid="loading-indicator"
          className="flex flex-col items-center justify-center py-12"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Loading time off data...</p>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className={cn('flex flex-col', className)}>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Time Off Calendar
        </h2>
        <div className="flex flex-col items-center justify-center py-12 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load data</p>
          <p className="text-red-500 dark:text-red-300 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  // Empty State
  if (filteredTimeOffs.length === 0) {
    return (
      <div className={cn('flex flex-col', className)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Time Off Calendar
          </h2>
          {onAddTimeOff && (
            <Button
              variant="default"
              size="sm"
              onClick={onAddTimeOff}
              data-testid="add-timeoff-button"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Time Off
            </Button>
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            No time off scheduled
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm mb-4">
            No time off entries are currently scheduled for the team.
          </p>
          {onAddTimeOff && (
            <Button
              variant="ghost"
              onClick={onAddTimeOff}
              data-testid="add-timeoff-empty-button"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Time Off
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Normal State with Entries
  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Time Off Calendar
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {filteredTimeOffs.length} {filteredTimeOffs.length === 1 ? 'entry' : 'entries'}
          </span>
          {onAddTimeOff && (
            <Button
              variant="default"
              size="sm"
              onClick={onAddTimeOff}
              data-testid="add-timeoff-button"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </div>

      {/* Time Off List */}
      <div className="space-y-3">
        {filteredTimeOffs.map((timeOff) => {
          const statusConfig = STATUS_CONFIG[timeOff.status]
          const duration = calculateDuration(timeOff.start_date, timeOff.end_date)

          return (
            <div
              key={timeOff.id}
              data-testid="timeoff-entry"
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              {/* Header: Member Name & Status */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    {getMemberName(timeOff.team_member_id)}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {TYPE_LABELS[timeOff.type]}
                  </p>
                </div>
                <Badge variant={statusConfig.variant}>
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDateRange(timeOff.start_date, timeOff.end_date)}</span>
                </div>
                <span className="text-slate-400">
                  ({duration} {duration === 1 ? 'day' : 'days'})
                </span>
              </div>

              {/* Notes */}
              {timeOff.notes && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">
                  {timeOff.notes}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

TimeOffCalendar.displayName = 'TimeOffCalendar'

export { TimeOffCalendar }

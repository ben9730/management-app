/**
 * TeamMemberCard Component
 *
 * Displays a single team member's information with edit/delete actions.
 * Hebrew RTL support with Israeli work week display.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { TeamMember } from '@/types/entities'

export interface TeamMemberCardProps {
  member: TeamMember
  onEdit: (member: TeamMember) => void
  onDelete: (id: string) => void
  isDeleting?: boolean
  className?: string
}

// Hebrew day names (0 = Sunday)
const HEBREW_DAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

// Role labels
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
}

// Employment type labels
const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contractor: 'Contractor',
}

/**
 * Format work days for display
 */
function formatWorkDays(workDays?: number[]): string {
  if (!workDays || workDays.length === 0) {
    return '-'
  }

  const sortedDays = [...workDays].sort((a, b) => a - b)

  // Check for consecutive days
  const isConsecutive = sortedDays.every(
    (day, idx) => idx === 0 || day === sortedDays[idx - 1] + 1
  )

  if (isConsecutive && sortedDays.length > 2) {
    // Display as range: "Sun-Thu" or "א-ה"
    const firstDay = HEBREW_DAYS[sortedDays[0]]
    const lastDay = HEBREW_DAYS[sortedDays[sortedDays.length - 1]]
    return `${firstDay}-${lastDay}`
  }

  // Display individual days
  return sortedDays.map((d) => HEBREW_DAYS[d]).join(', ')
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  onEdit,
  onDelete,
  isDeleting = false,
  className,
}) => {
  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown'
  const workDaysDisplay = formatWorkDays(member.work_days)
  const roleLabel = ROLE_LABELS[member.role] || member.role
  const employmentLabel = member.employment_type ? (EMPLOYMENT_LABELS[member.employment_type] || member.employment_type) : 'Full-time'

  const handleEdit = () => {
    onEdit(member)
  }

  const handleDelete = () => {
    onDelete(member.id)
  }

  return (
    <article
      className={cn(
        'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow',
        className
      )}
    >
      {/* Header: Name & Role */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
            {fullName}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {member.email}
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {roleLabel}
        </Badge>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        {/* Employment Type */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">סוג העסקה:</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {employmentLabel}
          </span>
        </div>

        {/* Work Hours */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">שעות עבודה:</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {member.work_hours_per_day} שעות/יום
          </span>
        </div>

        {/* Work Days */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">ימי עבודה:</span>
          <span
            data-testid="work-days"
            className="font-medium text-slate-700 dark:text-slate-300"
          >
            {workDaysDisplay}
          </span>
        </div>

        {/* Hourly Rate (if available) */}
        {member.hourly_rate !== null && member.hourly_rate !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">תעריף שעתי:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {member.hourly_rate} {'\u20AA'}/hr
            </span>
          </div>
        )}
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
          aria-label="מחיקה"
          className="flex-1"
        >
          {isDeleting ? 'מוחק...' : 'מחיקה'}
        </Button>
      </div>
    </article>
  )
}

TeamMemberCard.displayName = 'TeamMemberCard'

export { TeamMemberCard }

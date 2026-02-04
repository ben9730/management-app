/**
 * FindingCard Component
 *
 * Displays a single audit finding with severity, status, CAPA info, and actions.
 * Hebrew RTL support with dark mode styling.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AuditFinding, FindingSeverity, FindingStatus } from '@/types/entities'

export interface FindingCardProps {
  finding: AuditFinding
  onEdit: (finding: AuditFinding) => void
  onDelete: (id: string) => void
  isDeleting?: boolean
  className?: string
}

// Severity labels (Hebrew)
const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  critical: 'קריטי',
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
}

// Severity to Badge variant mapping
const SEVERITY_VARIANTS: Record<FindingSeverity, 'critical' | 'high' | 'medium' | 'low'> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
}

// Status labels (Hebrew)
const STATUS_LABELS: Record<FindingStatus, string> = {
  open: 'פתוח',
  in_progress: 'בתהליך',
  closed: 'סגור',
}

// Status to Badge variant mapping
const STATUS_VARIANTS: Record<FindingStatus, 'critical' | 'medium' | 'success'> = {
  open: 'critical',
  in_progress: 'medium',
  closed: 'success',
}

/**
 * Truncate finding text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength) + '...'
}

/**
 * Format date for display
 */
function formatDate(date: Date | string | null): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Check if a date is in the past
 */
function isOverdue(date: Date | string | null): boolean {
  if (!date) return false
  const d = date instanceof Date ? date : new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  onEdit,
  onDelete,
  isDeleting = false,
  className,
}) => {
  const title = truncateText(finding.finding, 50)
  const hasCapa = Boolean(finding.capa && finding.capa.trim().length > 0)
  const showDueDate = finding.due_date !== null
  const isOverdueDate = showDueDate && isOverdue(finding.due_date) && finding.status !== 'closed'

  const handleEdit = () => {
    onEdit(finding)
  }

  const handleDelete = () => {
    onDelete(finding.id)
  }

  return (
    <article
      className={cn(
        'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow',
        className
      )}
    >
      {/* Header: Title & Severity */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <h3
          data-testid="finding-title"
          className="font-bold text-lg text-slate-900 dark:text-white flex-1"
        >
          {title}
        </h3>
        <Badge
          data-testid="severity-badge"
          variant={SEVERITY_VARIANTS[finding.severity]}
          aria-label={`Severity: ${SEVERITY_LABELS[finding.severity]}`}
          className="text-xs shrink-0"
        >
          {SEVERITY_LABELS[finding.severity]}
        </Badge>
      </div>

      {/* Status Row */}
      <div className="flex items-center gap-2 mb-3">
        <Badge
          data-testid="status-badge"
          variant={STATUS_VARIANTS[finding.status]}
          className="text-xs"
        >
          {STATUS_LABELS[finding.status]}
        </Badge>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        {/* CAPA Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">פעולה מתקנת:</span>
          <span
            data-testid="capa-status"
            className={cn(
              'font-medium',
              hasCapa
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500 dark:text-red-400'
            )}
          >
            {hasCapa ? 'יש' : 'אין'}
          </span>
        </div>

        {/* Due Date */}
        {showDueDate && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">תאריך יעד:</span>
            <span
              data-testid="due-date"
              className={cn(
                'font-medium',
                isOverdueDate
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-slate-700 dark:text-slate-300'
              )}
            >
              {formatDate(finding.due_date)}
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

FindingCard.displayName = 'FindingCard'

export { FindingCard }

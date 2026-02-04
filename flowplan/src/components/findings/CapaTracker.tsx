/**
 * CapaTracker Component
 *
 * Displays CAPA (Corrective Action / Preventive Action) tracking statistics
 * for audit findings. Shows completion percentage, overdue count, and
 * severity breakdown. Hebrew RTL support with dark mode styling.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { AuditFinding, FindingSeverity } from '@/types/entities'

export interface CapaTrackerProps {
  findings: AuditFinding[]
  isLoading?: boolean
  className?: string
}

// Severity labels in Hebrew
const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  critical: 'קריטי',
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
}

// Severity order for display (priority order)
const SEVERITY_ORDER: FindingSeverity[] = ['critical', 'high', 'medium', 'low']

// Severity badge variants
const SEVERITY_VARIANTS: Record<FindingSeverity, 'critical' | 'high' | 'medium' | 'low'> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
}

/**
 * Check if a finding has a valid CAPA defined
 */
function hasCapa(finding: AuditFinding): boolean {
  return Boolean(finding.capa && finding.capa.trim().length > 0)
}

/**
 * Check if a finding is overdue
 */
function isOverdue(finding: AuditFinding): boolean {
  if (!finding.due_date || finding.status === 'closed') {
    return false
  }
  const dueDate = finding.due_date instanceof Date
    ? finding.due_date
    : new Date(finding.due_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return dueDate < today
}

/**
 * Calculate CAPA statistics from findings
 */
function calculateStats(findings: AuditFinding[]) {
  const total = findings.length
  const withCapa = findings.filter(hasCapa).length
  const withoutCapa = total - withCapa
  const completionPercentage = total > 0 ? Math.round((withCapa / total) * 100) : 0
  const overdueCount = findings.filter(isOverdue).length

  // Group findings without CAPA by severity
  const withoutCapaBySeverity = findings
    .filter((f) => !hasCapa(f))
    .reduce<Record<FindingSeverity, number>>(
      (acc, finding) => {
        acc[finding.severity] = (acc[finding.severity] || 0) + 1
        return acc
      },
      { critical: 0, high: 0, medium: 0, low: 0 }
    )

  return {
    total,
    withCapa,
    withoutCapa,
    completionPercentage,
    overdueCount,
    withoutCapaBySeverity,
  }
}

/**
 * Get progress bar color class based on completion percentage
 * Green: >= 80%, Yellow: 50-79%, Red: < 50%
 */
function getProgressColorClass(percentage: number): string {
  if (percentage >= 80) {
    return 'bg-emerald-500 dark:bg-emerald-400'
  }
  if (percentage >= 50) {
    return 'bg-amber-500 dark:bg-amber-400'
  }
  return 'bg-red-500 dark:bg-red-400'
}

/**
 * Loading skeleton component
 */
const CapaTrackerSkeleton: React.FC = () => (
  <div
    data-testid="capa-tracker-skeleton"
    className="animate-pulse bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
  >
    {/* Title skeleton */}
    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-6" />

    {/* Stats grid skeleton */}
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-12" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-12" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-12" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20" />
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-12" />
      </div>
    </div>

    {/* Progress bar skeleton */}
    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full" />
  </div>
)

/**
 * Empty state component
 */
const CapaTrackerEmpty: React.FC = () => (
  <div
    data-testid="capa-tracker-empty"
    className="flex flex-col items-center justify-center py-8 text-center"
  >
    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
      <svg
        className="w-6 h-6 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    </div>
    <p className="text-slate-500 dark:text-slate-400 text-sm">
      אין ממצאים למעקב
    </p>
  </div>
)

/**
 * Stat item component
 */
interface StatItemProps {
  label: string
  value: string | number
  testId: string
  valueClassName?: string
}

const StatItem: React.FC<StatItemProps> = ({
  label,
  value,
  testId,
  valueClassName,
}) => (
  <div className="flex flex-col">
    <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">
      {label}
    </span>
    <span
      data-testid={testId}
      className={cn(
        'text-2xl font-bold text-slate-900 dark:text-white',
        valueClassName
      )}
    >
      {value}
    </span>
  </div>
)

const CapaTracker: React.FC<CapaTrackerProps> = ({
  findings,
  isLoading = false,
  className,
}) => {
  // Calculate statistics
  const stats = React.useMemo(() => calculateStats(findings), [findings])

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="capa-tracker"
        dir="rtl"
        role="region"
        aria-label="CAPA מעקב"
        className={cn(
          'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6',
          className
        )}
      >
        <CapaTrackerSkeleton />
      </div>
    )
  }

  // Empty state
  if (findings.length === 0) {
    return (
      <div
        data-testid="capa-tracker"
        dir="rtl"
        role="region"
        aria-label="CAPA מעקב"
        className={cn(
          'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6',
          className
        )}
      >
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          CAPA מעקב
        </h2>
        <CapaTrackerEmpty />
      </div>
    )
  }

  // Get active severities (those with findings without CAPA)
  const activeSeverities = SEVERITY_ORDER.filter(
    (severity) => stats.withoutCapaBySeverity[severity] > 0
  )

  return (
    <div
      data-testid="capa-tracker"
      dir="rtl"
      role="region"
      aria-label="CAPA מעקב"
      className={cn(
        'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          CAPA מעקב
        </h2>
        {stats.overdueCount > 0 && (
          <Badge
            data-testid="overdue-badge"
            variant="critical"
            className="text-xs"
          >
            {stats.overdueCount} באיחור
          </Badge>
        )}
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatItem
          label="סה״כ ממצאים"
          value={stats.total}
          testId="total-count"
        />
        <StatItem
          label="עם CAPA"
          value={stats.withCapa}
          testId="with-capa-count"
          valueClassName="text-emerald-600 dark:text-emerald-400"
        />
        <StatItem
          label="ללא CAPA"
          value={stats.withoutCapa}
          testId="without-capa-count"
          valueClassName={stats.withoutCapa > 0 ? 'text-red-500 dark:text-red-400' : undefined}
        />
        <StatItem
          label="ממצאים באיחור"
          value={stats.overdueCount}
          testId="overdue-count"
          valueClassName={stats.overdueCount > 0 ? 'text-red-500 dark:text-red-400' : undefined}
        />
      </div>

      {/* Completion Rate */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            שיעור השלמה
          </span>
          <span
            data-testid="completion-percentage"
            className="text-sm font-bold text-slate-900 dark:text-white"
          >
            {stats.completionPercentage}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={stats.completionPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
        >
          <div
            data-testid="progress-bar"
            className={cn(
              'h-full rounded-full transition-all duration-300',
              getProgressColorClass(stats.completionPercentage)
            )}
            style={{ width: `${stats.completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Severity Breakdown (only if there are findings without CAPA) */}
      {activeSeverities.length > 0 && (
        <div data-testid="severity-breakdown" className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            ללא CAPA לפי חומרה
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeSeverities.map((severity) => (
              <div
                key={severity}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg"
              >
                <Badge variant={SEVERITY_VARIANTS[severity]} className="text-[10px]">
                  {SEVERITY_LABELS[severity]}
                </Badge>
                <span
                  data-testid={`severity-${severity}-count`}
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  {stats.withoutCapaBySeverity[severity]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

CapaTracker.displayName = 'CapaTracker'

export { CapaTracker }

/**
 * Skeleton Component
 *
 * Loading placeholder that shows a pulsing animation.
 * Used for content loading states.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton (e.g., '100%', '200px') */
  width?: string | number
  /** Height of the skeleton (e.g., '20px', '1rem') */
  height?: string | number
  /** Rounded corners variant */
  variant?: 'default' | 'circle' | 'rounded'
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, width, height, variant = 'default', style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'animate-pulse bg-slate-200 dark:bg-slate-700',
          variant === 'circle' && 'rounded-full',
          variant === 'rounded' && 'rounded-lg',
          variant === 'default' && 'rounded',
          className
        )}
        style={{
          width,
          height,
          ...style,
        }}
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

/**
 * Task Card Skeleton - Loading placeholder for TaskCard
 */
const TaskCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('p-4 flex items-center gap-4', className)}>
      <Skeleton variant="circle" width={32} height={32} />
      <div className="flex-grow space-y-2">
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={12} />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton width={60} height={24} variant="rounded" />
        <Skeleton width={50} height={24} variant="rounded" />
        <Skeleton variant="circle" width={24} height={24} />
      </div>
    </div>
  )
}

/**
 * Phase Section Skeleton - Loading placeholder for PhaseSection
 */
const PhaseSectionSkeleton: React.FC<{ taskCount?: number; className?: string }> = ({
  taskCount = 3,
  className,
}) => {
  return (
    <div className={cn('bg-card border rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-surface/50 border-b">
        <div className="flex items-center gap-4">
          <Skeleton width={32} height={32} variant="rounded" />
          <div className="space-y-2">
            <Skeleton width={150} height={20} />
            <Skeleton width={100} height={12} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton width={120} height={24} />
          <Skeleton width={100} height={16} />
        </div>
      </div>
      {/* Tasks */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: taskCount }).map((_, i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/**
 * Dashboard Skeleton - Loading placeholder for main dashboard
 */
const DashboardSkeleton: React.FC<{ phaseCount?: number }> = ({ phaseCount = 2 }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton width={200} height={32} />
        <div className="flex gap-3">
          <Skeleton width={100} height={36} variant="rounded" />
          <Skeleton width={100} height={36} variant="rounded" />
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card p-4 rounded-xl border">
            <Skeleton width={60} height={12} className="mb-2" />
            <Skeleton width={80} height={28} />
          </div>
        ))}
      </div>
      {/* Phases */}
      <div className="space-y-4">
        {Array.from({ length: phaseCount }).map((_, i) => (
          <PhaseSectionSkeleton key={i} taskCount={3} />
        ))}
      </div>
    </div>
  )
}

export { Skeleton, TaskCardSkeleton, PhaseSectionSkeleton, DashboardSkeleton }

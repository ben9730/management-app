/**
 * Badge Component
 *
 * Brutalist-styled badge for labels, tags, and status indicators.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'critical' | 'high' | 'medium' | 'low' | 'success' | 'outline'
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--fp-brand-primary)] text-white hover:bg-[var(--fp-brand-secondary)]',
      secondary: 'bg-[var(--fp-bg-tertiary)] text-[var(--fp-text-primary)] hover:bg-[var(--fp-border-light)]',
      critical: 'bg-[var(--fp-status-error)] text-white',
      high: 'bg-[var(--fp-status-warning)] text-white',
      medium: 'bg-[var(--fp-status-info)] text-white',
      low: 'bg-[var(--fp-status-success)] text-white',
      success: 'bg-[var(--fp-status-success)] text-white',
      outline: 'border border-[var(--fp-border-medium)] bg-transparent text-[var(--fp-text-primary)]',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'

export { Badge }

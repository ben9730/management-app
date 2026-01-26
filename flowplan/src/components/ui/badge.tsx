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
      default: 'bg-black text-white',
      secondary: 'bg-gray-200 text-black',
      critical: 'bg-red-700 text-white',
      high: 'bg-red-500 text-white',
      medium: 'bg-yellow-500 text-black',
      low: 'bg-blue-400 text-white',
      success: 'bg-green-600 text-white',
      outline: 'border-2 border-black bg-transparent text-black',
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

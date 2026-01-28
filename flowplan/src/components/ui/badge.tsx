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
      default: 'border-2 border-gray-900 bg-[#a25ddc] text-white hover:bg-[#0073ea] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
      secondary: 'border-2 border-gray-900 bg-gray-200 text-gray-900 hover:bg-gray-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
      critical: 'border-2 border-gray-900 bg-[#e2445c] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
      high: 'border-2 border-gray-900 bg-[#fdab3d] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
      medium: 'border-2 border-gray-900 bg-[#579bfc] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
      low: 'border-2 border-gray-900 bg-[#00ca72] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
      success: 'border-2 border-gray-900 bg-[#00ca72] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
      outline: 'border-2 border-gray-900 bg-white text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
    }

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all',
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

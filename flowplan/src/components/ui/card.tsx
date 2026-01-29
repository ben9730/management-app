/**
 * Card Component
 *
 * Brutalist-styled card for content containers.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

// Card Container
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'critical' | 'warning' | 'info'
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'border-black bg-white',
      critical: 'border-red-600 bg-red-50',
      warning: 'border-orange-500 bg-orange-50',
      info: 'border-gray-400 bg-gray-50',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'border-3 p-4',
          variants[variant],
          className
        )}
        style={{ borderWidth: '3px' }}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

// Card Header
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('mb-4 border-b-2 border-black pb-3', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

// Card Title
const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-bold uppercase tracking-wider',
      className
    )}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

// Card Description
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-700 font-medium', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

// Card Content
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
))
CardContent.displayName = 'CardContent'

// Card Footer
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('mt-4 flex items-center border-t-2 border-black pt-3', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }

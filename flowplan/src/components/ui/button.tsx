/**
 * Button Component
 *
 * Brutalist-styled button with multiple variants and sizes.
 * Based on PRD v2.1 - Brutalist UI design.
 */

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  fullWidth?: boolean
  loading?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      fullWidth = false,
      loading = false,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'

    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--fp-brand-primary)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      default: 'bg-[var(--fp-brand-primary)] text-white hover:bg-[var(--fp-brand-secondary)] shadow-sm hover:shadow',
      secondary: 'bg-[var(--fp-bg-tertiary)] text-[var(--fp-text-primary)] hover:bg-[var(--fp-border-light)]',
      destructive: 'bg-[var(--fp-status-error)] text-white hover:opacity-90',
      outline:
        'border border-[var(--fp-border-medium)] bg-white text-[var(--fp-text-primary)] hover:bg-[var(--fp-bg-tertiary)]',
      ghost: 'bg-transparent text-[var(--fp-text-primary)] hover:bg-[var(--fp-bg-tertiary)]',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-8 py-3 text-lg',
      icon: 'p-2',
    }

    const LoadingSpinner = () => (
      <svg
        data-testid="loading-spinner"
        className="mr-2 h-4 w-4 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    )

    // For asChild, don't wrap with loading spinner
    // The child element will receive button props directly
    if (asChild) {
      return (
        <Slot
          className={cn(
            baseStyles,
            variants[variant],
            sizes[size],
            fullWidth && 'w-full',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <LoadingSpinner />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }

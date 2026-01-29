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
      'inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'

    const variants = {
      default: 'bg-[var(--fp-brand-blue)] text-white shadow-lg shadow-blue-500/20 hover:brightness-110',
      secondary: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      destructive: 'bg-[var(--fp-brand-danger)] text-white shadow-lg shadow-red-500/20 hover:brightness-110',
      outline: 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
      ghost: 'bg-transparent text-slate-500 hover:bg-slate-100',
    }

    const sizes = {
      sm: 'px-4 py-1.5 text-xs rounded-lg',
      md: 'px-6 py-2.5 text-sm rounded-xl',
      lg: 'px-8 py-4 text-base rounded-2xl',
      icon: 'p-2 rounded-xl',
    }

    const LoadingSpinner = () => (
      <svg
        data-testid="loading-spinner"
        className="ml-2 h-4 w-4 animate-spin"
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

    const classNames = cn(
      baseStyles,
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      className
    )

    if (asChild) {
      return (
        <Slot className={classNames} ref={ref} {...props}>
          {children}
        </Slot>
      )
    }

    return (
      <button
        className={classNames}
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

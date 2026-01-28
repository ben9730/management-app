/**
 * Input Component
 *
 * Brutalist-styled input with multiple variants, sizes, and states.
 * Based on PRD v2.1 - Brutalist UI design.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'error' | 'success'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  label?: string
  helperText?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  wrapperClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      wrapperClassName,
      variant = 'default',
      size = 'md',
      fullWidth = false,
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      type = 'text',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId()
    const errorId = error ? `${inputId}-error` : undefined

    // Determine effective variant based on error state
    const effectiveVariant = error ? 'error' : variant

    const baseStyles =
      'w-full border bg-[var(--fp-bg-secondary)] text-[var(--fp-text-primary)] rounded-[var(--fp-radius-md)] transition-all duration-200 focus:outline-none focus:ring-1'

    const variants = {
      default:
        'border-[var(--fp-border-light)] focus:border-[var(--fp-brand-primary)] focus:ring-[var(--fp-brand-primary)] placeholder:text-[var(--fp-text-tertiary)]',
      error:
        'border-[var(--fp-status-error)] focus:border-[var(--fp-status-error)] focus:ring-[var(--fp-status-error)] placeholder:text-[var(--fp-status-error)]/50',
      success:
        'border-[var(--fp-status-success)] focus:border-[var(--fp-status-success)] focus:ring-[var(--fp-status-success)] placeholder:text-[var(--fp-status-success)]/50',
    }

    const sizes = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2 text-base',
      lg: 'px-4 py-3 text-lg',
    }

    const disabledStyles = disabled
      ? 'opacity-50 cursor-not-allowed bg-[var(--fp-bg-tertiary)] text-[var(--fp-text-tertiary)]'
      : ''

    const iconPadding = {
      left: leftIcon ? 'pl-10' : '',
      right: rightIcon ? 'pr-10' : '',
    }

    return (
      <div className={cn(fullWidth && 'w-full', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-medium text-[var(--fp-text-secondary)]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId}
            className={cn(
              baseStyles,
              variants[effectiveVariant],
              sizes[size],
              disabledStyles,
              iconPadding.left,
              iconPadding.right,
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-xs text-[var(--fp-status-error)]">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-[var(--fp-text-secondary)]">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }

/**
 * Input Component
 *
 * Brutalist-styled input with multiple variants, sizes, and states.
 * Based on PRD v2.1 - Brutalist UI design.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>, 'size'> {
  variant?: 'default' | 'error' | 'success'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  label?: string
  helperText?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  wrapperClassName?: string
  multiline?: boolean
  rows?: number
}

const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
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
      multiline = false,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId()
    const errorId = error ? `${inputId}-error` : undefined

    // Determine effective variant based on error state
    const effectiveVariant = error ? 'error' : variant

    const baseStyles =
      'w-full border-2 bg-white text-gray-900 rounded-[var(--fp-radius-md)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--fp-brand-primary)]'

    const variants = {
      default:
        'border-gray-900 focus:border-[var(--fp-brand-primary)] placeholder:text-gray-500 placeholder:opacity-100',
      error:
        'border-[var(--fp-status-error)] focus:border-[var(--fp-status-error)] placeholder:text-[var(--fp-status-error)]/50',
      success:
        'border-[var(--fp-status-success)] focus:border-[var(--fp-status-success)] placeholder:text-[var(--fp-status-success)]/50',
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

    const commonProps = {
      id: inputId,
      disabled,
      'aria-invalid': error ? ('true' as const) : undefined,
      'aria-describedby': errorId,
      className: cn(
        baseStyles,
        variants[effectiveVariant],
        sizes[size],
        disabledStyles,
        !multiline && iconPadding.left,
        !multiline && iconPadding.right,
        className
      ),
      ...props,
    }

    return (
      <div className={cn(fullWidth && 'w-full', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-900"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && !multiline && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              {leftIcon}
            </div>
          )}
          {multiline ? (
            <textarea
              ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
              rows={rows}
              {...(commonProps as any)}
            />
          ) : (
            <input
              ref={ref as React.ForwardedRef<HTMLInputElement>}
              type={type}
              {...commonProps}
            />
          )}
          {rightIcon && !multiline && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <div aria-live="polite">
            <p id={errorId} className="mt-1 text-xs text-[var(--fp-status-error)] font-semibold">
              {error}
            </p>
          </div>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-600">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }

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

    const baseStyles =
      'w-full border bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-medium font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-600'

    const variants = {
      default: 'border-slate-200 dark:border-slate-600 focus:border-blue-500',
      error: 'border-red-300 focus:border-red-500 bg-red-50/30 dark:bg-red-900/30',
      success: 'border-green-300 focus:border-green-500 bg-green-50/30 dark:bg-green-900/30',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-5 py-4 text-lg',
    }

    const disabledStyles = disabled
      ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
      : ''

    const commonProps = {
      id: inputId,
      disabled,
      'aria-invalid': error ? ('true' as const) : undefined,
      'aria-describedby': errorId,
      className: cn(
        baseStyles,
        variants[error ? 'error' : variant],
        sizes[size],
        disabledStyles,
        leftIcon && !multiline && 'pl-10',
        rightIcon && !multiline && 'pr-10',
        className
      ),
      ...props,
    }

    return (
      <div className={cn(fullWidth && 'w-full', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && !multiline && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
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
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <div aria-live="polite">
            <p id={errorId} className="mt-1.5 text-xs text-red-500 font-bold">
              {error}
            </p>
          </div>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-slate-400 font-medium">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }

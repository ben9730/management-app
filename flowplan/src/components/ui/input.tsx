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
      'w-full border-2 bg-white font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2'

    const variants = {
      default:
        'border-black focus:ring-black placeholder:text-gray-400',
      error:
        'border-red-500 focus:ring-red-500 placeholder:text-gray-400',
      success:
        'border-green-500 focus:ring-green-500 placeholder:text-gray-400',
    }

    const sizes = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2 text-base',
      lg: 'px-4 py-3 text-lg',
    }

    const disabledStyles = disabled
      ? 'opacity-50 cursor-not-allowed bg-gray-100'
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
            className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
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
          <p id={errorId} className="mt-1 text-sm text-red-500">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }

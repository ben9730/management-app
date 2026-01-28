/**
 * Select Component
 *
 * Brutalist-styled select/dropdown with multiple variants, sizes, and states.
 * Based on PRD v2.1 - Brutalist UI design.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[]
  variant?: 'default' | 'error' | 'success'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  label?: string
  helperText?: string
  error?: string
  placeholder?: string
  wrapperClassName?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      wrapperClassName,
      options,
      variant = 'default',
      size = 'md',
      fullWidth = false,
      label,
      helperText,
      error,
      id,
      placeholder,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || React.useId()
    const errorId = error ? `${selectId}-error` : undefined

    // Determine effective variant based on error state
    const effectiveVariant = error ? 'error' : variant

    const baseStyles =
      'w-full appearance-none border-2 bg-white text-gray-900 rounded-[var(--fp-radius-md)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--fp-brand-primary)] pr-10'

    const variants = {
      default: 'border-gray-900 focus:border-[var(--fp-brand-primary)]',
      error: 'border-[var(--fp-status-error)] focus:border-[var(--fp-status-error)]',
      success: 'border-[var(--fp-status-success)] focus:border-[var(--fp-status-success)]',
    }

    const sizes = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2 text-base',
      lg: 'px-4 py-3 text-lg',
    }

    const disabledStyles = disabled
      ? 'opacity-50 cursor-not-allowed bg-[var(--fp-bg-tertiary)] text-[var(--fp-text-tertiary)]'
      : 'cursor-pointer'

    // Group options if needed
    const groupedOptions = options.reduce((acc, option) => {
      const group = option.group || 'default'
      if (!acc[group]) acc[group] = []
      acc[group].push(option)
      return acc
    }, {} as Record<string, SelectOption[]>)

    return (
      <div className={cn(fullWidth && 'w-full', wrapperClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-900"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId}
            className={cn(
              baseStyles,
              variants[effectiveVariant],
              sizes[size],
              disabledStyles,
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {Object.entries(groupedOptions).map(([group, groupOptions]) =>
              group === 'default' ? (
                groupOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </option>
                ))
              ) : (
                <optgroup key={group} label={group}>
                  {groupOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              )
            )}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" data-testid="select-chevron">
            <svg
              className="h-4 w-4 text-gray-900"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
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

Select.displayName = 'Select'

export { Select }

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

    const baseStyles =
      'w-full appearance-none border bg-slate-50 text-slate-900 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white pr-10'

    const variants = {
      default: 'border-slate-200 focus:border-blue-500',
      error: 'border-red-300 focus:border-red-500 bg-red-50/30',
      success: 'border-green-300 focus:border-green-500 bg-green-50/30',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-5 py-3.5 text-lg',
    }

    const disabledStyles = disabled
      ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400'
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
            className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500"
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
              variants[error ? 'error' : variant],
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
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5" data-testid="select-chevron">
            <svg
              className="h-4 w-4 text-slate-400"
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

Select.displayName = 'Select'

export { Select }

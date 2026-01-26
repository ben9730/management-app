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
  placeholder?: string
  helperText?: string
  error?: string
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
      placeholder,
      helperText,
      error,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || React.useId()
    const errorId = error ? `${selectId}-error` : undefined

    // Determine effective variant based on error state
    const effectiveVariant = error ? 'error' : variant

    const baseStyles =
      'w-full appearance-none border-2 bg-white font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 pr-10'

    const variants = {
      default: 'border-black focus:ring-black',
      error: 'border-red-500 focus:ring-red-500',
      success: 'border-green-500 focus:ring-green-500',
    }

    const sizes = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-2 text-base',
      lg: 'px-4 py-3 text-lg',
    }

    const disabledStyles = disabled
      ? 'opacity-50 cursor-not-allowed bg-gray-100'
      : 'cursor-pointer'

    // Group options by their group property
    const groupedOptions = options.reduce<Record<string, SelectOption[]>>(
      (acc, option) => {
        const group = option.group || '__ungrouped__'
        if (!acc[group]) {
          acc[group] = []
        }
        acc[group].push(option)
        return acc
      },
      {}
    )

    const hasGroups = Object.keys(groupedOptions).some(
      (key) => key !== '__ungrouped__'
    )

    const renderOptions = () => {
      if (hasGroups) {
        return Object.entries(groupedOptions).map(([group, groupOptions]) => {
          if (group === '__ungrouped__') {
            return groupOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))
          }
          return (
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
        })
      }

      return options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))
    }

    return (
      <div className={cn(fullWidth && 'w-full', wrapperClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
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
            {renderOptions()}
          </select>
          <div
            data-testid="select-chevron"
            className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"
          >
            <svg
              className="h-4 w-4 text-black"
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

Select.displayName = 'Select'

export { Select }

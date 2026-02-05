/**
 * MultiSelect Component
 *
 * Simple multi-select with checkboxes for selecting multiple items.
 * MVP version - no search/filter, just checkboxes.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, X } from 'lucide-react'

export interface MultiSelectOption {
  value: string
  label: string
  description?: string
}

export interface MultiSelectProps {
  label?: string
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  className?: string
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = 'בחר...',
  disabled = false,
  error,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = (value: string) => {
    if (disabled) return

    const newSelected = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value]

    onChange(newSelected)
  }

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    onChange(selected.filter(v => v !== value))
  }

  const selectedLabels = selected
    .map(v => options.find(o => o.value === v)?.label)
    .filter(Boolean) as string[]

  return (
    <div ref={containerRef} className={cn('relative', className)} dir="rtl">
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full min-h-[42px] px-3 py-2 text-right bg-white dark:bg-slate-800 border rounded-lg transition-colors flex items-center justify-between gap-2',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-slate-300 dark:border-slate-600 focus:ring-primary',
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900'
            : 'hover:border-slate-400 dark:hover:border-slate-500 cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-offset-0'
        )}
        data-testid="multi-select-trigger"
      >
        <div className="flex-1 flex flex-wrap gap-1">
          {selected.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            selectedLabels.map((label, index) => (
              <span
                key={selected[index]}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary dark:bg-primary/20 rounded text-sm"
              >
                {label}
                {!disabled && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleRemove(selected[index], e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleRemove(selected[index], e as unknown as React.MouseEvent)
                      }
                    }}
                    className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer"
                    data-testid={`remove-${selected[index]}`}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto"
          data-testid="multi-select-dropdown"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-slate-400 text-sm">אין אפשרויות</div>
          ) : (
            options.map((option) => {
              const isSelected = selected.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggle(option.value)}
                  className={cn(
                    'w-full px-3 py-2 text-right flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors',
                    isSelected && 'bg-primary/5 dark:bg-primary/10'
                  )}
                  data-testid={`option-${option.value}`}
                >
                  <div
                    className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center shrink-0',
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-slate-300 dark:border-slate-600'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-900 dark:text-slate-100">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-xs text-slate-500">
                        {option.description}
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-500" data-testid="multi-select-error">
          {error}
        </p>
      )}
    </div>
  )
}

MultiSelect.displayName = 'MultiSelect'

export { MultiSelect }

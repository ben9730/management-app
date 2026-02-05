/**
 * MultiSelect Component
 *
 * Simple multi-select with checkboxes for selecting multiple items.
 * Uses portal for dropdown to avoid overflow clipping issues.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
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
  const [hasMoreContent, setHasMoreContent] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({})

  // Calculate dropdown position when opening - use fixed positioning for viewport-relative placement
  React.useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      const preferredMaxHeight = 280
      const gap = 4
      const padding = 16 // padding from viewport edges

      // Determine if we should open upward or downward
      const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow

      let top: number
      let maxHeight: number

      if (openUpward) {
        // Open upward - position bottom of dropdown at top of trigger
        maxHeight = Math.min(preferredMaxHeight, spaceAbove - padding)
        top = rect.top - gap - Math.min(maxHeight, preferredMaxHeight)
      } else {
        // Open downward - position top of dropdown at bottom of trigger
        maxHeight = Math.min(preferredMaxHeight, spaceBelow - padding)
        top = rect.bottom + gap
      }

      // Ensure reasonable minimum height
      maxHeight = Math.max(maxHeight, 120)

      setDropdownStyle({
        position: 'fixed',
        top,
        left: rect.left,
        width: rect.width,
        maxHeight,
        zIndex: 9999,
      })
    }
  }, [isOpen])

  // Check if dropdown has more content to scroll
  React.useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const checkScroll = () => {
        const el = dropdownRef.current
        if (el) {
          const canScrollMore = el.scrollHeight > el.clientHeight &&
            el.scrollTop < el.scrollHeight - el.clientHeight - 5
          setHasMoreContent(canScrollMore)
        }
      }
      // Check initially after a short delay for rendering
      const timer = setTimeout(checkScroll, 50)
      // Add scroll listener
      dropdownRef.current.addEventListener('scroll', checkScroll)
      return () => {
        clearTimeout(timer)
        dropdownRef.current?.removeEventListener('scroll', checkScroll)
      }
    }
  }, [isOpen, options.length])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target)
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target)

      if (isOutsideContainer && isOutsideDropdown) {
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

  // Render dropdown in portal to avoid overflow clipping
  const dropdownContent = isOpen && typeof document !== 'undefined' ? createPortal(
    <div
      style={{ ...dropdownStyle, position: 'fixed' }}
      className="relative"
      data-testid="multi-select-dropdown-wrapper"
    >
      <div
        ref={dropdownRef}
        style={{ maxHeight: dropdownStyle.maxHeight }}
        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg overflow-y-auto"
        data-testid="multi-select-dropdown"
        dir="rtl"
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
      {/* Scroll indicator - shows when there's more content below */}
      {hasMoreContent && (
        <div
          className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none rounded-b-lg bg-gradient-to-t from-white dark:from-slate-800 to-transparent"
        >
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-full shadow-sm">
            <ChevronDown className="h-3 w-3 animate-bounce" />
            <span>גלול למטה</span>
          </div>
        </div>
      )}
    </div>,
    document.body
  ) : null

  return (
    <div ref={containerRef} className={cn('relative', className)} dir="rtl">
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        ref={triggerRef}
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

      {/* Dropdown rendered in portal */}
      {dropdownContent}

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

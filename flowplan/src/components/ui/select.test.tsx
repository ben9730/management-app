/**
 * Select Component Tests (TDD)
 *
 * Brutalist-styled select/dropdown with multiple variants and states.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select, SelectOption } from './select'

const mockOptions: SelectOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
]

describe('Select', () => {
  // Basic Rendering
  describe('rendering', () => {
    it('renders select element', () => {
      render(<Select options={mockOptions} />)
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('renders all options', () => {
      render(<Select options={mockOptions} />)
      const select = screen.getByRole('combobox')

      expect(within(select).getByText('Option 1')).toBeInTheDocument()
      expect(within(select).getByText('Option 2')).toBeInTheDocument()
      expect(within(select).getByText('Option 3')).toBeInTheDocument()
    })

    it('renders placeholder option when provided', () => {
      render(<Select options={mockOptions} placeholder="Select an option" />)
      expect(screen.getByText('Select an option')).toBeInTheDocument()
    })

    it('placeholder option is disabled by default', () => {
      render(<Select options={mockOptions} placeholder="Select an option" />)
      const placeholderOption = screen.getByText('Select an option')
      expect(placeholderOption).toBeDisabled()
    })

    it('renders with label when provided', () => {
      render(<Select options={mockOptions} label="Status" />)
      expect(screen.getByText('Status')).toBeInTheDocument()
    })

    it('associates label with select via htmlFor', () => {
      render(<Select options={mockOptions} label="Status" id="status-select" />)
      const label = screen.getByText('Status')
      expect(label).toHaveAttribute('for', 'status-select')
    })

    it('renders with default value selected', () => {
      render(<Select options={mockOptions} defaultValue="option2" />)
      expect(screen.getByRole('combobox')).toHaveValue('option2')
    })

    it('renders with controlled value', () => {
      render(<Select options={mockOptions} value="option3" onChange={() => {}} />)
      expect(screen.getByRole('combobox')).toHaveValue('option3')
    })
  })

  // Options Configuration
  describe('options configuration', () => {
    it('renders disabled options', () => {
      const optionsWithDisabled: SelectOption[] = [
        { value: 'opt1', label: 'Option 1' },
        { value: 'opt2', label: 'Option 2', disabled: true },
      ]
      render(<Select options={optionsWithDisabled} />)

      const disabledOption = screen.getByText('Option 2')
      expect(disabledOption).toBeDisabled()
    })

    it('renders option groups', () => {
      const groupedOptions: SelectOption[] = [
        { value: 'us', label: 'United States', group: 'Americas' },
        { value: 'ca', label: 'Canada', group: 'Americas' },
        { value: 'uk', label: 'United Kingdom', group: 'Europe' },
        { value: 'de', label: 'Germany', group: 'Europe' },
      ]
      render(<Select options={groupedOptions} />)

      expect(screen.getByRole('group', { name: 'Americas' })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Europe' })).toBeInTheDocument()
    })
  })

  // Variants
  describe('variants', () => {
    it('applies default variant styling', () => {
      render(<Select options={mockOptions} />)
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('border-2')
      expect(select).toHaveClass('border-black')
    })

    it('applies error variant styling', () => {
      render(<Select options={mockOptions} variant="error" />)
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('border-red-500')
    })

    it('applies success variant styling', () => {
      render(<Select options={mockOptions} variant="success" />)
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('border-green-500')
    })
  })

  // Sizes
  describe('sizes', () => {
    it('applies small size styling', () => {
      render(<Select options={mockOptions} size="sm" />)
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('px-2')
      expect(select).toHaveClass('py-1')
      expect(select).toHaveClass('text-sm')
    })

    it('applies medium size styling by default', () => {
      render(<Select options={mockOptions} />)
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('px-3')
      expect(select).toHaveClass('py-2')
    })

    it('applies large size styling', () => {
      render(<Select options={mockOptions} size="lg" />)
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('px-4')
      expect(select).toHaveClass('py-3')
      expect(select).toHaveClass('text-lg')
    })
  })

  // States
  describe('states', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Select options={mockOptions} disabled />)
      expect(screen.getByRole('combobox')).toBeDisabled()
    })

    it('is required when required prop is true', () => {
      render(<Select options={mockOptions} required />)
      expect(screen.getByRole('combobox')).toBeRequired()
    })

    it('shows disabled styling when disabled', () => {
      render(<Select options={mockOptions} disabled />)
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('opacity-50')
      expect(select).toHaveClass('cursor-not-allowed')
    })
  })

  // Events
  describe('events', () => {
    it('calls onChange when selection changes', async () => {
      const handleChange = vi.fn()
      render(<Select options={mockOptions} onChange={handleChange} />)

      await userEvent.selectOptions(screen.getByRole('combobox'), 'option2')

      expect(handleChange).toHaveBeenCalled()
    })

    it('passes selected value to onChange', async () => {
      const handleChange = vi.fn()
      render(<Select options={mockOptions} onChange={handleChange} />)

      await userEvent.selectOptions(screen.getByRole('combobox'), 'option2')

      expect(handleChange.mock.calls[0][0].target.value).toBe('option2')
    })

    it('calls onFocus when select is focused', () => {
      const handleFocus = vi.fn()
      render(<Select options={mockOptions} onFocus={handleFocus} />)

      fireEvent.focus(screen.getByRole('combobox'))

      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('calls onBlur when select loses focus', () => {
      const handleBlur = vi.fn()
      render(<Select options={mockOptions} onBlur={handleBlur} />)

      const select = screen.getByRole('combobox')
      fireEvent.focus(select)
      fireEvent.blur(select)

      expect(handleBlur).toHaveBeenCalledTimes(1)
    })
  })

  // Helper Text & Error Messages
  describe('helper text and errors', () => {
    it('renders helper text when provided', () => {
      render(<Select options={mockOptions} helperText="Choose your preference" />)
      expect(screen.getByText('Choose your preference')).toBeInTheDocument()
    })

    it('renders error message when provided', () => {
      render(<Select options={mockOptions} error="Selection is required" />)
      expect(screen.getByText('Selection is required')).toBeInTheDocument()
    })

    it('applies error styling when error is provided', () => {
      render(<Select options={mockOptions} error="Invalid selection" />)
      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('border-red-500')
    })

    it('error message has error color', () => {
      render(<Select options={mockOptions} error="Invalid selection" />)
      const errorText = screen.getByText('Invalid selection')
      expect(errorText).toHaveClass('text-red-500')
    })
  })

  // Full Width
  describe('full width', () => {
    it('applies full width when fullWidth is true', () => {
      render(<Select options={mockOptions} fullWidth />)
      // The outer wrapper (grandparent of select) should have w-full
      const outerWrapper = screen.getByRole('combobox').parentElement?.parentElement
      expect(outerWrapper).toHaveClass('w-full')
    })
  })

  // Custom Styling
  describe('custom styling', () => {
    it('applies custom className to select', () => {
      render(<Select options={mockOptions} className="custom-class" />)
      expect(screen.getByRole('combobox')).toHaveClass('custom-class')
    })

    it('applies custom className to wrapper', () => {
      render(<Select options={mockOptions} wrapperClassName="wrapper-custom" />)
      const wrapper = screen.getByRole('combobox').closest('.wrapper-custom')
      expect(wrapper).toBeInTheDocument()
    })
  })

  // Ref Forwarding
  describe('ref forwarding', () => {
    it('forwards ref to select element', () => {
      const ref = vi.fn()
      render(<Select options={mockOptions} ref={ref} />)
      expect(ref).toHaveBeenCalled()
    })

    it('allows focus via ref', () => {
      const selectRef = { current: null as HTMLSelectElement | null }
      render(<Select options={mockOptions} ref={(el) => { selectRef.current = el }} />)

      selectRef.current?.focus()

      expect(document.activeElement).toBe(selectRef.current)
    })
  })

  // Accessibility
  describe('accessibility', () => {
    it('has accessible name when label is provided', () => {
      render(<Select options={mockOptions} label="Priority" id="priority" />)
      expect(screen.getByLabelText('Priority')).toBeInTheDocument()
    })

    it('has accessible name via aria-label', () => {
      render(<Select options={mockOptions} aria-label="Choose priority" />)
      expect(screen.getByLabelText('Choose priority')).toBeInTheDocument()
    })

    it('associates error message with select via aria-describedby', () => {
      render(<Select options={mockOptions} error="Invalid" id="test-select" />)
      const select = screen.getByRole('combobox')
      expect(select).toHaveAttribute('aria-describedby', 'test-select-error')
    })

    it('marks select as invalid when error is present', () => {
      render(<Select options={mockOptions} error="Invalid" />)
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
    })
  })

  // Chevron Icon
  describe('chevron icon', () => {
    it('renders chevron icon', () => {
      render(<Select options={mockOptions} />)
      expect(screen.getByTestId('select-chevron')).toBeInTheDocument()
    })
  })
})

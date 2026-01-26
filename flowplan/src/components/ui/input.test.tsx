/**
 * Input Component Tests (TDD)
 *
 * Brutalist-styled input with multiple variants and states.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './input'

describe('Input', () => {
  // Basic Rendering
  describe('rendering', () => {
    it('renders input element', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text..." />)
      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument()
    })

    it('renders with default value', () => {
      render(<Input defaultValue="Initial value" />)
      expect(screen.getByRole('textbox')).toHaveValue('Initial value')
    })

    it('renders with controlled value', () => {
      render(<Input value="Controlled value" onChange={() => {}} />)
      expect(screen.getByRole('textbox')).toHaveValue('Controlled value')
    })

    it('renders with label when provided', () => {
      render(<Input label="Email Address" />)
      expect(screen.getByText('Email Address')).toBeInTheDocument()
    })

    it('associates label with input via htmlFor', () => {
      render(<Input label="Email" id="email-input" />)
      const label = screen.getByText('Email')
      expect(label).toHaveAttribute('for', 'email-input')
    })
  })

  // Input Types
  describe('input types', () => {
    it('renders as text type by default', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')
    })

    it('renders as password type', () => {
      render(<Input type="password" />)
      const input = document.querySelector('input[type="password"]')
      expect(input).toBeInTheDocument()
    })

    it('renders as email type', () => {
      render(<Input type="email" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
    })

    it('renders as number type', () => {
      render(<Input type="number" />)
      expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    })

    it('renders as search type', () => {
      render(<Input type="search" />)
      expect(screen.getByRole('searchbox')).toBeInTheDocument()
    })

    it('renders as date type', () => {
      render(<Input type="date" />)
      const input = document.querySelector('input[type="date"]')
      expect(input).toBeInTheDocument()
    })
  })

  // Variants
  describe('variants', () => {
    it('applies default variant styling', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-2')
      expect(input).toHaveClass('border-black')
    })

    it('applies error variant styling', () => {
      render(<Input variant="error" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-red-500')
    })

    it('applies success variant styling', () => {
      render(<Input variant="success" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-green-500')
    })
  })

  // Sizes
  describe('sizes', () => {
    it('applies small size styling', () => {
      render(<Input size="sm" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('px-2')
      expect(input).toHaveClass('py-1')
      expect(input).toHaveClass('text-sm')
    })

    it('applies medium size styling by default', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('px-3')
      expect(input).toHaveClass('py-2')
    })

    it('applies large size styling', () => {
      render(<Input size="lg" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('px-4')
      expect(input).toHaveClass('py-3')
      expect(input).toHaveClass('text-lg')
    })
  })

  // States
  describe('states', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Input disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('is readonly when readOnly prop is true', () => {
      render(<Input readOnly value="Readonly value" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
    })

    it('is required when required prop is true', () => {
      render(<Input required />)
      expect(screen.getByRole('textbox')).toBeRequired()
    })

    it('shows disabled styling when disabled', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('opacity-50')
      expect(input).toHaveClass('cursor-not-allowed')
    })
  })

  // Events
  describe('events', () => {
    it('calls onChange when value changes', async () => {
      const handleChange = vi.fn()
      render(<Input onChange={handleChange} />)

      await userEvent.type(screen.getByRole('textbox'), 'a')

      expect(handleChange).toHaveBeenCalled()
    })

    it('calls onFocus when input is focused', () => {
      const handleFocus = vi.fn()
      render(<Input onFocus={handleFocus} />)

      fireEvent.focus(screen.getByRole('textbox'))

      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('calls onBlur when input loses focus', () => {
      const handleBlur = vi.fn()
      render(<Input onBlur={handleBlur} />)

      const input = screen.getByRole('textbox')
      fireEvent.focus(input)
      fireEvent.blur(input)

      expect(handleBlur).toHaveBeenCalledTimes(1)
    })

    it('calls onKeyDown when key is pressed', () => {
      const handleKeyDown = vi.fn()
      render(<Input onKeyDown={handleKeyDown} />)

      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })

      expect(handleKeyDown).toHaveBeenCalledTimes(1)
    })
  })

  // Helper Text & Error Messages
  describe('helper text and errors', () => {
    it('renders helper text when provided', () => {
      render(<Input helperText="Enter your email address" />)
      expect(screen.getByText('Enter your email address')).toBeInTheDocument()
    })

    it('renders error message when provided', () => {
      render(<Input error="This field is required" />)
      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })

    it('applies error styling when error is provided', () => {
      render(<Input error="Invalid input" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-red-500')
    })

    it('error message has error color', () => {
      render(<Input error="Invalid input" />)
      const errorText = screen.getByText('Invalid input')
      expect(errorText).toHaveClass('text-red-500')
    })
  })

  // Icons / Addons
  describe('icons and addons', () => {
    it('renders left icon when provided', () => {
      render(<Input leftIcon={<span data-testid="left-icon">🔍</span>} />)
      expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    })

    it('renders right icon when provided', () => {
      render(<Input rightIcon={<span data-testid="right-icon">✓</span>} />)
      expect(screen.getByTestId('right-icon')).toBeInTheDocument()
    })

    it('adds padding for left icon', () => {
      render(<Input leftIcon={<span>🔍</span>} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('pl-10')
    })

    it('adds padding for right icon', () => {
      render(<Input rightIcon={<span>✓</span>} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('pr-10')
    })
  })

  // Full Width
  describe('full width', () => {
    it('applies full width when fullWidth is true', () => {
      render(<Input fullWidth />)
      // The outer wrapper (grandparent of input) should have w-full
      const outerWrapper = screen.getByRole('textbox').parentElement?.parentElement
      expect(outerWrapper).toHaveClass('w-full')
    })
  })

  // Custom Styling
  describe('custom styling', () => {
    it('applies custom className to input', () => {
      render(<Input className="custom-class" />)
      expect(screen.getByRole('textbox')).toHaveClass('custom-class')
    })

    it('applies custom className to wrapper', () => {
      render(<Input wrapperClassName="wrapper-custom" />)
      const wrapper = screen.getByRole('textbox').closest('.wrapper-custom')
      expect(wrapper).toBeInTheDocument()
    })
  })

  // Ref Forwarding
  describe('ref forwarding', () => {
    it('forwards ref to input element', () => {
      const ref = vi.fn()
      render(<Input ref={ref} />)
      expect(ref).toHaveBeenCalled()
    })

    it('allows focus via ref', () => {
      const inputRef = { current: null as HTMLInputElement | null }
      render(<Input ref={(el) => { inputRef.current = el }} />)

      inputRef.current?.focus()

      expect(document.activeElement).toBe(inputRef.current)
    })
  })

  // Accessibility
  describe('accessibility', () => {
    it('has accessible name when label is provided', () => {
      render(<Input label="Username" id="username" />)
      expect(screen.getByLabelText('Username')).toBeInTheDocument()
    })

    it('has accessible name via aria-label', () => {
      render(<Input aria-label="Search" />)
      expect(screen.getByLabelText('Search')).toBeInTheDocument()
    })

    it('associates error message with input via aria-describedby', () => {
      render(<Input error="Invalid input" id="test-input" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error')
    })

    it('marks input as invalid when error is present', () => {
      render(<Input error="Invalid" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    })
  })
})

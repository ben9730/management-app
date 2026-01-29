/**
 * Button Component Tests (TDD)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders with children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>Disabled</Button>)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies default variant styling', () => {
    render(<Button>Default</Button>)
    const button = screen.getByRole('button')
    // Default is now brand primary
    expect(button.className).toContain('bg-[var(--fp-brand-primary)]')
  })

  it('applies secondary variant styling with high visibility', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button')
    // Secondary should have a visible border and dark text
    expect(button).toHaveClass('border')
    expect(button).toHaveClass('text-gray-900')
    expect(button).toHaveClass('bg-gray-100')
  })

  it('applies destructive variant styling', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    // Destructive is now status error
    expect(button.className).toContain('bg-[var(--fp-status-error)]')
  })

  it('applies outline variant styling', () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('border')
    expect(button.className).toContain('border-[var(--fp-border-medium)]')
  })

  it('applies ghost variant styling', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('text-[var(--fp-text-primary)]')
  })

  it('applies small size styling', () => {
    render(<Button size="sm">Small</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('px-3')
    expect(button).toHaveClass('text-sm')
  })

  it('applies large size styling', () => {
    render(<Button size="lg">Large</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('px-8')
    expect(button).toHaveClass('text-lg')
  })

  it('applies full width when fullWidth is true', () => {
    render(<Button fullWidth>Full Width</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('w-full')
  })

  it('shows loading spinner when loading', () => {
    render(<Button loading>Loading</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('renders as different element with asChild', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Button ref={ref}>Ref Test</Button>)
    expect(ref).toHaveBeenCalled()
  })
})

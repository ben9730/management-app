/**
 * Modal Component Tests (TDD)
 *
 * Brutalist-styled modal/dialog with overlay and accessibility features.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './modal'

describe('Modal', () => {
  // Basic Rendering
  describe('rendering', () => {
    it('does not render when closed', () => {
      render(
        <Modal isOpen={false} onClose={() => { }}>
          <div>Modal Content</div>
        </Modal>
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders when open', () => {
      render(
        <Modal isOpen={true} onClose={() => { }}>
          <div>Modal Content</div>
        </Modal>
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('renders children content', () => {
      render(
        <Modal isOpen={true} onClose={() => { }}>
          <div>Modal Content</div>
        </Modal>
      )
      expect(screen.getByText('Modal Content')).toBeInTheDocument()
    })

    it('renders title when provided', () => {
      render(
        <Modal isOpen={true} onClose={() => { }} title="Confirm Action">
          <div>Content</div>
        </Modal>
      )
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    })

    it('renders description when provided', () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => { }}
          title="Confirm"
          description="Are you sure you want to proceed?"
        >
          <div>Content</div>
        </Modal>
      )
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument()
    })
  })

  // Close Button
  describe('close button', () => {
    it('renders close button by default', () => {
      render(
        <Modal isOpen={true} onClose={() => { }}>
          <div>Content</div>
        </Modal>
      )
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', async () => {
      const handleClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Modal>
      )

      await userEvent.click(screen.getByRole('button', { name: /close/i }))

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('hides close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={() => { }} showCloseButton={false}>
          <div>Content</div>
        </Modal>
      )
      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
    })
  })

  // Overlay
  describe('overlay', () => {
    it('renders overlay behind modal', () => {
      render(
        <Modal isOpen={true} onClose={() => { }}>
          <div>Content</div>
        </Modal>
      )
      expect(screen.getByTestId('modal-overlay')).toBeInTheDocument()
    })

    it('calls onClose when overlay is clicked', async () => {
      const handleClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Modal>
      )

      await userEvent.click(screen.getByTestId('modal-overlay'))

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('does not close when closeOnOverlayClick is false', async () => {
      const handleClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={false}>
          <div>Content</div>
        </Modal>
      )

      await userEvent.click(screen.getByTestId('modal-overlay'))

      expect(handleClose).not.toHaveBeenCalled()
    })
  })

  // Keyboard Interaction
  describe('keyboard interaction', () => {
    it('closes on Escape key press', async () => {
      const handleClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Modal>
      )

      await userEvent.keyboard('{Escape}')

      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('does not close on Escape when closeOnEscape is false', async () => {
      const handleClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={handleClose} closeOnEscape={false}>
          <div>Content</div>
        </Modal>
      )

      await userEvent.keyboard('{Escape}')

      expect(handleClose).not.toHaveBeenCalled()
    })
  })

  // Sizes
  describe('sizes', () => {
    it('applies small size styling', () => {
      render(
        <Modal isOpen={true} onClose={() => { }} size="sm">
          <div>Content</div>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-sm')
    })

    it('applies medium size styling by default', () => {
      render(
        <Modal isOpen={true} onClose={() => { }}>
          <div>Content</div>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-md')
    })

    it('applies large size styling', () => {
      render(
        <Modal isOpen={true} onClose={() => { }} size="lg">
          <div>Content</div>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-lg')
    })

    it('applies extra large size styling', () => {
      render(
        <Modal isOpen={true} onClose={() => { }} size="xl">
          <div>Content</div>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-xl')
    })

    it('applies full size styling', () => {
      render(
        <Modal isOpen={true} onClose={() => { }} size="full">
          <div>Content</div>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-4xl')
    })
  })

  // Premium Modern Styling
  describe('premium modern styling', () => {
    it('applies rounded corners and shadow', () => {
      render(
        <Modal isOpen={true} onClose={() => { }}>
          <div>Content</div>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('rounded-2xl')
      expect(dialog).toHaveClass('shadow-2xl')
    })

    it('applies white background', () => {
      render(
        <Modal isOpen={true} onClose={() => { }}>
          <div>Content</div>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('bg-white')
    })
  })

  // Footer
  describe('footer', () => {
    it('renders footer when provided', () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => { }}
          footer={<button>Confirm</button>}
        >
          <div>Content</div>
        </Modal>
      )
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    })

    it('footer is in modal-footer container', () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => { }}
          footer={<button>Confirm</button>}
        >
          <div>Content</div>
        </Modal>
      )
      expect(screen.getByTestId('modal-footer')).toBeInTheDocument()
    })
  })

  // Accessibility
  describe('accessibility', () => {
    it('has dialog role', () => {
      render(
        <Modal isOpen={true} onClose={() => { }}>
          <div>Content</div>
        </Modal>
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-modal attribute', () => {
      render(
        <Modal isOpen={true} onClose={() => { }}>
          <div>Content</div>
        </Modal>
      )
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('has aria-labelledby when title is provided', () => {
      render(
        <Modal isOpen={true} onClose={() => { }} title="My Title">
          <div>Content</div>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('has aria-describedby when description is provided', () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => { }}
          title="Title"
          description="Description text"
        >
          <div>Content</div>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-describedby')
    })

    it('traps focus within modal', async () => {
      render(
        <Modal isOpen={true} onClose={() => { }}>
          <button>First</button>
          <button>Second</button>
        </Modal>
      )

      const firstButton = screen.getByRole('button', { name: 'First' })
      const secondButton = screen.getByRole('button', { name: 'Second' })
      const closeButton = screen.getByRole('button', { name: /close/i })

      // Modal auto-focuses first focusable element (close button in header)
      expect(document.activeElement).toBe(closeButton)

      // Tab to content buttons
      await userEvent.tab()
      expect(document.activeElement).toBe(firstButton)

      await userEvent.tab()
      expect(document.activeElement).toBe(secondButton)
    })
  })

  // Custom Styling
  describe('custom styling', () => {
    it('applies custom className to dialog', () => {
      render(
        <Modal isOpen={true} onClose={() => { }} className="custom-modal">
          <div>Content</div>
        </Modal>
      )
      expect(screen.getByRole('dialog')).toHaveClass('custom-modal')
    })

    it('applies custom className to overlay', () => {
      render(
        <Modal isOpen={true} onClose={() => { }} overlayClassName="custom-overlay">
          <div>Content</div>
        </Modal>
      )
      expect(screen.getByTestId('modal-overlay')).toHaveClass('custom-overlay')
    })
  })

  // Portal Rendering
  describe('portal', () => {
    it('renders in document body by default', () => {
      render(
        <Modal isOpen={true} onClose={() => { }}>
          <div data-testid="modal-content">Content</div>
        </Modal>
      )

      // Modal should be rendered at body level
      const modalContent = screen.getByTestId('modal-content')
      expect(modalContent.closest('[role="dialog"]')).toBeInTheDocument()
    })
  })
})

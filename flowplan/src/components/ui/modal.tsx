/**
 * Modal Component
 *
 * Brutalist-styled modal/dialog with overlay, keyboard handling, and accessibility.
 * Based on PRD v2.1 - Brutalist UI design.
 */

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  footer?: React.ReactNode
  className?: string
  overlayClassName?: string
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className,
  overlayClassName,
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null)
  const titleId = React.useId()
  const descriptionId = React.useId()

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  }

  // Handle Escape key
  React.useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeOnEscape, onClose])

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Focus trap
  React.useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const modal = modalRef.current
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    modal.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => modal.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose()
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div
      data-testid="modal-overlay"
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center p-4 fp-modal-backdrop fp-animate-fade-in',
        overlayClassName
      )}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'relative w-full bg-white shadow-2xl rounded-2xl overflow-hidden fp-animate-slide-up',
          sizes[size],
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 pb-2">
            <div>
              {title && (
                <h2
                  id={titleId}
                  className="text-xl font-black text-slate-800 tracking-tight"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-slate-400 font-medium">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            data-testid="modal-footer"
            className="p-6 pt-2 bg-slate-50/50"
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  // Render in portal for proper stacking
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}

Modal.displayName = 'Modal'

export { Modal }

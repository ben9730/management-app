import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './ThemeToggle'
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('ThemeToggle', () => {
    beforeEach(() => {
        // Clear class list on html element
        document.documentElement.classList.remove('dark')
    })

    it('renders the theme toggle button', () => {
        render(<ThemeToggle />)
        const button = screen.getByLabelText(/toggle dark mode/i)
        expect(button).toBeInTheDocument()
    })

    it('toggles the dark class on document element when clicked', () => {
        render(<ThemeToggle />)
        const button = screen.getByLabelText(/toggle dark mode/i)

        // Initial state
        expect(document.documentElement.classList.contains('dark')).toBe(false)

        // First click: adds dark
        fireEvent.click(button)
        expect(document.documentElement.classList.contains('dark')).toBe(true)

        // Second click: removes dark
        fireEvent.click(button)
        expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('displays the correct icon based on theme', () => {
        render(<ThemeToggle />)

        // Initial: should show dark_mode icon (since document starts without .dark)
        expect(screen.getByText('dark_mode')).toBeInTheDocument()

        const button = screen.getByLabelText(/toggle dark mode/i)
        fireEvent.click(button)

        // After click: should show light_mode icon
        expect(screen.getByText('light_mode')).toBeInTheDocument()

        fireEvent.click(button)
        // After second click: back to dark_mode
        expect(screen.getByText('dark_mode')).toBeInTheDocument()
    })
})

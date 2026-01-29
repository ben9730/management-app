/**
 * Dashboard Layout Tests (TDD)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from './page'

// Mock the components used in page
vi.mock('@/components/phases/PhaseSection', () => ({
    PhaseSection: () => <div data-testid="phase-section" />
}))
vi.mock('@/components/gantt/GanttChart', () => ({
    GanttChart: () => <div data-testid="gantt-chart" />
}))
vi.mock('@/components/forms/TaskForm', () => ({
    TaskForm: () => <div data-testid="task-form" />
}))
vi.mock('@/components/forms/ProjectForm', () => ({
    ProjectForm: () => <div data-testid="project-form" />
}))
vi.mock('@/components/ui/modal', () => ({
    Modal: ({ children, title }: any) => (
        <div data-testid="modal">
            <h2>{title}</h2>
            {children}
        </div>
    )
}))

describe('Dashboard Layout (page.tsx)', () => {
    it('renders stats cards with correct labels and no icons (Image 0 style)', () => {
        render(<Page />)

        expect(screen.getByText('התקדמות')).toBeInTheDocument()
        expect(screen.getByText('משימות')).toBeInTheDocument()
        expect(screen.getByText('ימים נותרים')).toBeInTheDocument()
        expect(screen.getByText('נתיב קריטי')).toBeInTheDocument()

        // Check for high contrast values
        const progressValue = screen.getByText(/%/)
        expect(progressValue).toBeInTheDocument()

        // Verify specific alignment classes (should be right-aligned for RTL)
        const label = screen.getByText('התקדמות')
        const textRightContainer = label.parentElement
        const cardContainer = textRightContainer?.parentElement

        expect(cardContainer).toHaveClass('rounded-xl')
        expect(textRightContainer).toHaveClass('text-right')
    })

    it('renders project header with dates in simple Image 0 style', () => {
        render(<Page />)

        const title = screen.getByRole('heading', { level: 1 })
        const datesContainer = screen.getByText(/התחלה:/).parentElement

        expect(title).toBeInTheDocument()
        expect(datesContainer).toHaveClass('text-[#a0aec0]')

        // In RTL, specify flex arrangement
        const headerRow = title.closest('.flex')
        expect(headerRow).toHaveClass('justify-between')
    })

    it('uses the premium dark background for task sections in page.tsx', () => {
        const { container } = render(<Page />)
        const darkSections = container.querySelectorAll('.bg-\\[\\#282e3f\\]')
        expect(darkSections.length).toBeGreaterThan(0)
    })
})

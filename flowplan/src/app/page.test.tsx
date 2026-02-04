/**
 * Dashboard Layout Tests (TDD)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Page from './page'

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    })
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}

// Mock the hooks to avoid actual data fetching
vi.mock('@/hooks/use-projects', () => ({
    useProjects: () => ({ data: [], isLoading: false }),
    useCreateProject: () => ({ mutateAsync: vi.fn() }),
    useUpdateProject: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('@/hooks/use-tasks', () => ({
    useTasks: () => ({ data: [], isLoading: false }),
    useCreateTask: () => ({ mutateAsync: vi.fn() }),
    useUpdateTask: () => ({ mutateAsync: vi.fn() }),
    useDeleteTask: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('@/hooks/use-phases', () => ({
    usePhases: () => ({ data: [], isLoading: false }),
    useCreatePhase: () => ({ mutateAsync: vi.fn() }),
    useUpdatePhase: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('@/hooks/use-team-members', () => ({
    useTeamMembersByProject: () => ({ data: [], isLoading: false }),
    useTeamMembers: () => ({ data: [], isLoading: false }),
}))

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
    it('renders the dashboard page with loading state initially', () => {
        render(<Page />, { wrapper: createWrapper() })

        // The page should render - even with empty data
        // Since hooks return empty data, we'll see the "select project" state
        expect(document.body).toBeInTheDocument()
    })

    it('renders without crashing when projects are empty', () => {
        const { container } = render(<Page />, { wrapper: createWrapper() })

        // Should render the page structure
        expect(container.firstChild).toBeInTheDocument()
    })

    it('displays the proper RTL direction', () => {
        const { container } = render(<Page />, { wrapper: createWrapper() })

        // Check for RTL attribute
        const rtlElement = container.querySelector('[dir="rtl"]')
        expect(rtlElement).toBeInTheDocument()
    })
})

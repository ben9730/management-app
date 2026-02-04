/**
 * Dashboard Team Members Integration Test (TDD)
 *
 * Tests to verify the dashboard correctly fetches and displays
 * team members for task assignment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the hooks
vi.mock('@/hooks/use-projects', () => ({
  useProjects: vi.fn(),
  useCreateProject: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useUpdateProject: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('@/hooks/use-tasks', () => ({
  useTasks: vi.fn(),
  useCreateTask: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useUpdateTask: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeleteTask: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('@/hooks/use-phases', () => ({
  usePhases: vi.fn(),
  useCreatePhase: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useUpdatePhase: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('@/hooks/use-team-members', () => ({
  useTeamMembersByProject: vi.fn(),
  useTeamMembers: vi.fn(),
}))

import DashboardPage from './page'
import { useProjects } from '@/hooks/use-projects'
import { useTasks } from '@/hooks/use-tasks'
import { usePhases } from '@/hooks/use-phases'
import { useTeamMembersByProject, useTeamMembers } from '@/hooks/use-team-members'

const mockUseProjects = useProjects as ReturnType<typeof vi.fn>
const mockUseTasks = useTasks as ReturnType<typeof vi.fn>
const mockUsePhases = usePhases as ReturnType<typeof vi.fn>
const mockUseTeamMembersByProject = useTeamMembersByProject as ReturnType<typeof vi.fn>
const mockUseTeamMembers = useTeamMembers as ReturnType<typeof vi.fn>

// Helper to create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

// Sample data
const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'A test project',
  status: 'active',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  created_at: new Date(),
  updated_at: new Date(),
}

const mockPhases = [
  {
    id: 'phase-1',
    project_id: 'project-1',
    name: 'Phase 1',
    description: null,
    phase_order: 1,
    status: 'active',
    start_date: null,
    end_date: null,
    total_tasks: 0,
    completed_tasks: 0,
    created_at: new Date(),
  },
]

const mockTeamMembers = [
  {
    id: 'member-1',
    organization_id: 'org-default',
    user_id: 'user-1',
    display_name: 'John Doe',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    avatar_url: null,
    role: 'member',
    employment_type: 'full_time',
    work_hours_per_day: 8,
    work_days: [0, 1, 2, 3, 4],
    hourly_rate: 50,
    weekly_capacity_hours: 40,
    skills: [],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    project_id: null,
  },
]

describe('Dashboard Team Members Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()

    // Default mock implementations
    mockUseProjects.mockReturnValue({
      data: [mockProject],
      isLoading: false,
    })

    mockUseTasks.mockReturnValue({
      data: [],
      isLoading: false,
    })

    mockUsePhases.mockReturnValue({
      data: mockPhases,
      isLoading: false,
    })

    mockUseTeamMembersByProject.mockReturnValue({
      data: [],
      isLoading: false,
    })

    mockUseTeamMembers.mockReturnValue({
      data: mockTeamMembers,
      isLoading: false,
    })
  })

  describe('team members fetching', () => {
    it('calls useTeamMembersByProject with projectId', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      expect(mockUseTeamMembersByProject).toHaveBeenCalledWith('project-1')
    })

    it('receives team members from hook', async () => {
      mockUseTeamMembersByProject.mockReturnValue({
        data: mockTeamMembers,
        isLoading: false,
      })

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      // The dashboard should have team members available for task assignment
      await waitFor(() => {
        expect(mockUseTeamMembersByProject).toHaveBeenCalled()
      })
    })

    it('handles empty team members array', () => {
      mockUseTeamMembersByProject.mockReturnValue({
        data: [],
        isLoading: false,
      })

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      // Dashboard should render without errors even with no team members
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    it('handles loading state for team members', () => {
      mockUseTeamMembersByProject.mockReturnValue({
        data: [],
        isLoading: true,
      })

      mockUseProjects.mockReturnValue({
        data: [],
        isLoading: true,
      })

      render(
        <QueryClientProvider client={queryClient}>
          <DashboardPage />
        </QueryClientProvider>
      )

      // Should show loading state (Hebrew text: "Loading data...")
      expect(screen.getByText(/טוען נתונים/)).toBeInTheDocument()
    })
  })
})

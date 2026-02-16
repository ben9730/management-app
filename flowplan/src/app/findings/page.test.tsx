/**
 * Findings Page Tests (TDD)
 *
 * Tests for the Audit Findings Center page.
 * Hebrew RTL support with dark mode styling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FindingsPage from './page'
import type { AuditFinding, Task } from '@/types/entities'

// Mock the hooks
vi.mock('@/hooks/use-audit-findings', () => ({
  useAuditFindings: vi.fn(),
  useCreateAuditFinding: vi.fn(),
  useUpdateAuditFinding: vi.fn(),
  useDeleteAuditFinding: vi.fn(),
}))

vi.mock('@/hooks/use-tasks', () => ({
  useTasks: vi.fn(),
}))

vi.mock('@/hooks/use-projects', () => ({
  useProjects: vi.fn(),
}))

// Import mocked hooks
import {
  useAuditFindings,
  useCreateAuditFinding,
  useUpdateAuditFinding,
  useDeleteAuditFinding,
} from '@/hooks/use-audit-findings'
import { useTasks } from '@/hooks/use-tasks'
import { useProjects } from '@/hooks/use-projects'

// Mock data
const mockFindings: AuditFinding[] = [
  {
    id: 'finding-1',
    task_id: 'task-1',
    severity: 'critical',
    finding: 'Critical security vulnerability found in authentication module',
    root_cause: 'Outdated dependencies',
    capa: 'Update all dependencies to latest versions',
    due_date: new Date('2024-03-15'),
    status: 'open',
    created_at: new Date('2024-01-15'),
  },
  {
    id: 'finding-2',
    task_id: 'task-2',
    severity: 'high',
    finding: 'Data validation missing in API endpoint',
    root_cause: 'Rushed implementation',
    capa: null,
    due_date: new Date('2024-03-20'),
    status: 'in_progress',
    created_at: new Date('2024-01-20'),
  },
  {
    id: 'finding-3',
    task_id: 'task-3',
    severity: 'medium',
    finding: 'Documentation not updated after feature change',
    root_cause: null,
    capa: 'Update documentation',
    due_date: null,
    status: 'closed',
    created_at: new Date('2024-02-01'),
  },
]

const mockTasks: Task[] = [
  {
    id: 'task-1',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Authentication Module',
    description: null,
    status: 'in_progress',
    priority: 'high',
    assignee_id: null,
    duration: 5,
    estimated_hours: 40,
    start_date: null,
    end_date: null,
    es: null,
    ef: null,
    ls: null,
    lf: null,
    slack: 0,
    is_critical: false,
    constraint_type: null,
    constraint_date: null,
    scheduling_mode: 'auto',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  {
    id: 'task-2',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'API Endpoints',
    description: null,
    status: 'pending',
    priority: 'medium',
    assignee_id: null,
    duration: 3,
    estimated_hours: 24,
    start_date: null,
    end_date: null,
    es: null,
    ef: null,
    ls: null,
    lf: null,
    slack: 0,
    is_critical: false,
    constraint_type: null,
    constraint_date: null,
    scheduling_mode: 'auto',
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02'),
  },
]

// Create mock mutation functions
const mockCreateMutate = vi.fn()
const mockUpdateMutate = vi.fn()
const mockDeleteMutate = vi.fn()

// Helper to create QueryClient wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const QueryClientWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  QueryClientWrapper.displayName = 'QueryClientWrapper'
  return QueryClientWrapper
}

// Mock project data
const mockProject = {
  id: 'proj-1',
  name: 'Test Project',
  organization_id: 'org-default',
  description: 'Test project for findings',
  status: 'active' as const,
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31'),
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
}

// Default mock implementations
function setupMocks(options: {
  projects?: typeof mockProject[]
  isLoadingProjects?: boolean
  findings?: AuditFinding[]
  tasks?: Task[]
  isLoadingFindings?: boolean
  isLoadingTasks?: boolean
  findingsError?: Error | null
  tasksError?: Error | null
  createIsPending?: boolean
  updateIsPending?: boolean
  deleteIsPending?: boolean
  deleteVariables?: string | null
} = {}) {
  const {
    projects = [mockProject],
    isLoadingProjects = false,
    findings = mockFindings,
    tasks = mockTasks,
    isLoadingFindings = false,
    isLoadingTasks = false,
    findingsError = null,
    tasksError = null,
    createIsPending = false,
    updateIsPending = false,
    deleteIsPending = false,
    deleteVariables = null,
  } = options

  vi.mocked(useProjects).mockReturnValue({
    data: projects,
    isLoading: isLoadingProjects,
    error: null,
    refetch: vi.fn(),
  } as ReturnType<typeof useProjects>)

  vi.mocked(useAuditFindings).mockReturnValue({
    data: findings,
    isLoading: isLoadingFindings,
    error: findingsError,
    refetch: vi.fn(),
  } as ReturnType<typeof useAuditFindings>)

  vi.mocked(useTasks).mockReturnValue({
    data: tasks,
    isLoading: isLoadingTasks,
    error: tasksError,
    refetch: vi.fn(),
  } as ReturnType<typeof useTasks>)

  vi.mocked(useCreateAuditFinding).mockReturnValue({
    mutate: mockCreateMutate,
    isPending: createIsPending,
  } as ReturnType<typeof useCreateAuditFinding>)

  vi.mocked(useUpdateAuditFinding).mockReturnValue({
    mutate: mockUpdateMutate,
    isPending: updateIsPending,
  } as ReturnType<typeof useUpdateAuditFinding>)

  vi.mocked(useDeleteAuditFinding).mockReturnValue({
    mutate: mockDeleteMutate,
    isPending: deleteIsPending,
    variables: deleteVariables,
  } as ReturnType<typeof useDeleteAuditFinding>)
}

describe('FindingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  // ============================================
  // Basic Rendering
  // ============================================
  describe('rendering', () => {
    it('renders the findings page container', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.getByTestId('findings-page')).toBeInTheDocument()
    })

    it('renders page header with Hebrew title', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(
        screen.getByRole('heading', { name: /מרכז ממצאי ביקורת/i })
      ).toBeInTheDocument()
    })

    it('renders page subtitle', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(
        screen.getByText(/ניהול ומעקב אחר ממצאי ביקורת ותיקונים/i)
      ).toBeInTheDocument()
    })

    it('renders FindingsList component', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.getByTestId('findings-list-container')).toBeInTheDocument()
    })

    it('renders CapaTracker component', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.getByTestId('capa-tracker')).toBeInTheDocument()
    })
  })

  // ============================================
  // Layout
  // ============================================
  describe('layout', () => {
    it('uses RTL direction', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      const container = screen.getByTestId('findings-page')
      expect(container).toHaveAttribute('dir', 'rtl')
    })

    it('renders 2-column grid layout', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      const gridContainer = screen.getByTestId('findings-grid')
      expect(gridContainer).toHaveClass('grid')
      expect(gridContainer).toHaveClass('lg:grid-cols-3')
    })

    it('FindingsList spans 2 columns on large screens', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      const findingsSection = screen.getByTestId('findings-section')
      expect(findingsSection).toHaveClass('lg:col-span-2')
    })

    it('CapaTracker spans 1 column', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      const trackerSection = screen.getByTestId('tracker-section')
      expect(trackerSection).toHaveClass('lg:col-span-1')
    })
  })

  // ============================================
  // Loading State
  // ============================================
  describe('loading state', () => {
    it('shows loading state when findings are loading', () => {
      setupMocks({ isLoadingFindings: true })
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('shows page loading indicator when findings are loading', () => {
      setupMocks({ isLoadingFindings: true })
      render(<FindingsPage />, { wrapper: createWrapper() })
      // Page shows loading indicator when data is loading
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })
  })

  // ============================================
  // Error State
  // ============================================
  describe('error state', () => {
    it('shows error message when findings fail to load', () => {
      setupMocks({ findingsError: new Error('Failed to load findings') })
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.getByText(/Failed to load findings/i)).toBeInTheDocument()
    })

    it('shows retry button on error', () => {
      setupMocks({ findingsError: new Error('Network error') })
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.getByRole('button', { name: /נסה שוב/i })).toBeInTheDocument()
    })
  })

  // ============================================
  // Empty State
  // ============================================
  describe('empty state', () => {
    it('shows empty state when no findings exist', () => {
      setupMocks({ findings: [] })
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.getByText(/אין ממצאים עדיין/i)).toBeInTheDocument()
    })

    it('shows add button in empty state', () => {
      setupMocks({ findings: [] })
      render(<FindingsPage />, { wrapper: createWrapper() })
      // There are multiple add buttons (header + empty state content)
      const addButtons = screen.getAllByRole('button', { name: /הוסף ממצא/i })
      expect(addButtons.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================
  // Data Display
  // ============================================
  describe('data display', () => {
    it('displays findings from the hook', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(
        screen.getByText(/Critical security vulnerability/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/Data validation missing/i)).toBeInTheDocument()
    })

    it('passes findings to CapaTracker', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      // CapaTracker should show total count
      expect(screen.getByTestId('total-count')).toHaveTextContent('3')
    })
  })

  // ============================================
  // Add Finding Modal
  // ============================================
  describe('add finding modal', () => {
    it('opens add finding modal when add button clicked', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: /הוסף ממצא/i }))

      await waitFor(() => {
        expect(screen.getByTestId('modal-overlay')).toBeInTheDocument()
      })
    })

    it('shows "Add Finding" title in modal (Hebrew)', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: /הוסף ממצא/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/הוספת ממצא/i)).toBeInTheDocument()
      })
    })

    it('renders FindingForm in add mode', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: /הוסף ממצא/i }))

      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument()
      })
    })

    it('passes tasks to FindingForm', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: /הוסף ממצא/i }))

      await waitFor(() => {
        // Task dropdown should have task options
        const taskSelect = screen.getByTestId('finding-task-select')
        expect(taskSelect).toBeInTheDocument()
      })
    })

    it('closes modal when cancel clicked', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: /הוסף ממצא/i }))
      await waitFor(() => {
        expect(screen.getByTestId('modal-overlay')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('finding-form-cancel-button'))

      await waitFor(() => {
        expect(screen.queryByTestId('modal-overlay')).not.toBeInTheDocument()
      })
    })

    it('calls create mutation when form submitted', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      // Open modal
      await user.click(screen.getByRole('button', { name: /הוסף ממצא/i }))

      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument()
      })

      // Fill form
      const taskSelect = screen.getByTestId('finding-task-select')
      await user.selectOptions(taskSelect, 'task-1')

      const findingInput = screen.getByTestId('finding-description-input')
      await user.type(findingInput, 'Test finding description for testing')

      // Submit
      await user.click(screen.getByRole('button', { name: /שמור/i }))

      await waitFor(() => {
        expect(mockCreateMutate).toHaveBeenCalled()
      })
    })
  })

  // ============================================
  // Edit Finding Modal
  // ============================================
  describe('edit finding modal', () => {
    it('opens edit modal when edit button clicked', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      const editButtons = screen.getAllByRole('button', { name: /עריכה/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId('modal-overlay')).toBeInTheDocument()
      })
    })

    it('shows "Edit Finding" title in modal (Hebrew)', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      const editButtons = screen.getAllByRole('button', { name: /עריכה/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/עריכת ממצא/i)).toBeInTheDocument()
      })
    })

    it('pre-populates form with finding data', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      const editButtons = screen.getAllByRole('button', { name: /עריכה/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        const findingInput = screen.getByTestId('finding-description-input')
        expect(findingInput).toHaveValue(
          'Critical security vulnerability found in authentication module'
        )
      })
    })

    it('shows status field in edit mode', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      const editButtons = screen.getAllByRole('button', { name: /עריכה/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByTestId('finding-status-select')).toBeInTheDocument()
      })
    })

    it('calls update mutation when edit form submitted', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      // Open edit modal
      const editButtons = screen.getAllByRole('button', { name: /עריכה/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('form')).toBeInTheDocument()
      })

      // Submit (form is already populated)
      await user.click(screen.getByRole('button', { name: /עדכן/i }))

      await waitFor(() => {
        expect(mockUpdateMutate).toHaveBeenCalled()
      })
    })
  })

  // ============================================
  // Delete Finding
  // ============================================
  describe('delete finding', () => {
    it('calls delete mutation when delete clicked', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      const deleteButtons = screen.getAllByRole('button', { name: /מחיקה/i })
      await user.click(deleteButtons[0])

      expect(mockDeleteMutate).toHaveBeenCalledWith(
        'finding-1',
        expect.any(Object)
      )
    })

    it('shows deleting state for correct finding', () => {
      setupMocks({ deleteIsPending: true, deleteVariables: 'finding-1' })
      render(<FindingsPage />, { wrapper: createWrapper() })

      // Should show "Deleting..." text
      expect(screen.getByText(/מוחק/i)).toBeInTheDocument()
    })
  })

  // ============================================
  // Filter State
  // ============================================
  describe('filter state', () => {
    it('updates severity filter when clicked', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      // Click critical filter
      await user.click(screen.getByRole('button', { name: /קריטי/i }))

      // Should filter to only critical findings
      await waitFor(() => {
        const cards = screen.getAllByRole('article')
        expect(cards).toHaveLength(1)
      })
    })

    it('updates status filter when clicked', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      // Click "closed" filter
      await user.click(screen.getByRole('button', { name: /סגור/i }))

      // Should filter to only closed findings
      await waitFor(() => {
        const cards = screen.getAllByRole('article')
        expect(cards).toHaveLength(1)
      })
    })

    it('clears filter when "All" clicked', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      // First set a filter
      await user.click(screen.getByRole('button', { name: /קריטי/i }))

      // Then clear it
      const severitySection = screen.getByTestId('severity-filter')
      await user.click(within(severitySection).getByRole('button', { name: /הכל/i }))

      // Should show all findings again
      await waitFor(() => {
        const cards = screen.getAllByRole('article')
        expect(cards).toHaveLength(3)
      })
    })
  })

  // ============================================
  // Hooks Integration
  // ============================================
  describe('hooks integration', () => {
    it('calls useProjects with organization ID', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(useProjects).toHaveBeenCalledWith('org-default')
    })

    it('calls useAuditFindings with project ID from useProjects', () => {
      setupMocks({ projects: [{ ...mockProject, id: 'test-project-123' }] })
      render(<FindingsPage />, { wrapper: createWrapper() })
      // Called with project ID from projects array
      expect(useAuditFindings).toHaveBeenCalledWith('test-project-123')
    })

    it('calls useTasks with project ID from useProjects', () => {
      setupMocks({ projects: [{ ...mockProject, id: 'test-project-456' }] })
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(useTasks).toHaveBeenCalledWith('test-project-456', undefined)
    })

    it('calls useAuditFindings with empty string when no projects exist', () => {
      setupMocks({ projects: [] })
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(useAuditFindings).toHaveBeenCalledWith('')
    })

    it('calls useCreateAuditFinding hook', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(useCreateAuditFinding).toHaveBeenCalled()
    })

    it('calls useUpdateAuditFinding hook', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(useUpdateAuditFinding).toHaveBeenCalled()
    })

    it('calls useDeleteAuditFinding hook', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(useDeleteAuditFinding).toHaveBeenCalled()
    })
  })

  // ============================================
  // Modal Loading States
  // ============================================
  describe('modal loading states', () => {
    it('disables cancel during create mutation', async () => {
      const user = userEvent.setup()
      setupMocks({ createIsPending: true })
      render(<FindingsPage />, { wrapper: createWrapper() })

      // Open add modal
      await user.click(screen.getByRole('button', { name: /הוסף ממצא/i }))

      await waitFor(() => {
        const cancelButton = screen.getByTestId('finding-form-cancel-button')
        expect(cancelButton).toBeDisabled()
      })
    })

    it('shows loading state in form during create', async () => {
      const user = userEvent.setup()
      setupMocks({ createIsPending: true })
      render(<FindingsPage />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: /הוסף ממצא/i }))

      await waitFor(() => {
        expect(screen.getByText(/שומר/i)).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // Accessibility
  // ============================================
  describe('accessibility', () => {
    it('has main landmark', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('has page heading', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(
        screen.getByRole('heading', { level: 1, name: /מרכז ממצאי ביקורת/i })
      ).toBeInTheDocument()
    })

    it('modal has dialog role', async () => {
      const user = userEvent.setup()
      render(<FindingsPage />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: /הוסף ממצא/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // Dark Mode
  // ============================================
  describe('dark mode styling', () => {
    it('has dark background class', () => {
      render(<FindingsPage />, { wrapper: createWrapper() })
      const container = screen.getByTestId('findings-page')
      expect(container).toHaveClass('bg-background')
    })
  })

  // ============================================
  // Empty State - No Project
  // ============================================
  describe('empty state - no project', () => {
    it('shows empty state when no projects exist', () => {
      setupMocks({ projects: [] })
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.getByText(/אין פרויקט פעיל/i)).toBeInTheDocument()
    })

    it('shows return to home button in empty state', () => {
      setupMocks({ projects: [] })
      render(<FindingsPage />, { wrapper: createWrapper() })
      const button = screen.getByRole('button', { name: /חזרה לדף הבית/i })
      expect(button).toBeInTheDocument()
    })

    it('does not render findings list when no project', () => {
      setupMocks({ projects: [] })
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.queryByTestId('findings-list-container')).not.toBeInTheDocument()
    })

    it('does not render capa tracker when no project', () => {
      setupMocks({ projects: [] })
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.queryByTestId('capa-tracker')).not.toBeInTheDocument()
    })

    it('shows no project state container', () => {
      setupMocks({ projects: [] })
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.getByTestId('no-project-state')).toBeInTheDocument()
    })
  })

  // ============================================
  // Loading States with Projects
  // ============================================
  describe('loading states with projects', () => {
    it('shows loading state when projects are loading', () => {
      setupMocks({ isLoadingProjects: true })
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('shows loading text in Hebrew', () => {
      setupMocks({ isLoadingProjects: true })
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.getByText(/טוען נתונים/i)).toBeInTheDocument()
    })

    it('shows loading state when findings are loading with project', () => {
      setupMocks({ projects: [mockProject], isLoadingFindings: true })
      render(<FindingsPage />, { wrapper: createWrapper() })
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })
  })
})

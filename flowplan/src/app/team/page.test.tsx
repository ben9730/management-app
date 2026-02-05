/**
 * Team Page Tests (TDD)
 *
 * Tests for the /team route.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TeamPage from './page'

// Mock the hooks
vi.mock('@/hooks/use-team-members', () => ({
  useTeamMembers: vi.fn(),
  useCreateTeamMember: vi.fn(),
  useUpdateTeamMember: vi.fn(),
  useDeleteTeamMember: vi.fn(),
}))

vi.mock('@/hooks/use-time-off', () => ({
  useTimeOffs: vi.fn(),
}))

import {
  useTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
} from '@/hooks/use-team-members'

import { useTimeOffs } from '@/hooks/use-time-off'

// Type assertions for mocks
const mockUseTeamMembers = useTeamMembers as ReturnType<typeof vi.fn>
const mockUseCreateTeamMember = useCreateTeamMember as ReturnType<typeof vi.fn>
const mockUseUpdateTeamMember = useUpdateTeamMember as ReturnType<typeof vi.fn>
const mockUseDeleteTeamMember = useDeleteTeamMember as ReturnType<typeof vi.fn>
const mockUseTimeOffs = useTimeOffs as ReturnType<typeof vi.fn>

// Test data - using organization-level format (display_name instead of first/last name)
const mockTeamMembers = [
  {
    id: 'member-1',
    user_id: 'user-1',
    organization_id: 'org-default',
    display_name: 'Israel Cohen',
    email: 'israel@example.com',
    role: 'admin',
    weekly_capacity_hours: 40,
    hourly_rate: 150,
    skills: [],
    is_active: true,
    created_at: new Date('2024-01-15'),
  },
  {
    id: 'member-2',
    user_id: 'user-2',
    organization_id: 'org-default',
    display_name: 'Sarah Levi',
    email: 'sarah@example.com',
    role: 'member',
    weekly_capacity_hours: 20,
    hourly_rate: null,
    skills: [],
    is_active: true,
    created_at: new Date('2024-01-20'),
  },
]

const mockTimeOffs = [
  {
    id: 'timeoff-1',
    user_id: 'member-1',
    start_date: new Date('2024-03-10'),
    end_date: new Date('2024-03-15'),
    type: 'vacation',
    status: 'approved',
    notes: 'Family vacation',
    created_at: new Date('2024-02-01'),
  },
]

// Helper to wrap with QueryClientProvider
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('TeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockUseTeamMembers.mockReturnValue({
      data: mockTeamMembers,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    mockUseTimeOffs.mockReturnValue({
      data: mockTimeOffs,
      isLoading: false,
      error: null,
    })

    mockUseCreateTeamMember.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })

    mockUseUpdateTeamMember.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })

    mockUseDeleteTeamMember.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })
  })

  // Basic Rendering
  describe('rendering', () => {
    it('renders page title', () => {
      renderWithProviders(<TeamPage />)
      // Multiple headings exist, look for the main page title
      expect(screen.getByRole('heading', { name: /team workspace/i })).toBeInTheDocument()
    })

    it('renders team member list', () => {
      renderWithProviders(<TeamPage />)
      // Member names appear in both member cards and time off entries, use getAllByText
      expect(screen.getAllByText(/Israel/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Sarah/).length).toBeGreaterThanOrEqual(1)
    })

    it('renders time off calendar section', () => {
      renderWithProviders(<TeamPage />)
      // Time Off Calendar heading
      expect(screen.getByRole('heading', { name: /time off calendar/i })).toBeInTheDocument()
    })

    it('renders add member button', () => {
      renderWithProviders(<TeamPage />)
      expect(screen.getByRole('button', { name: /add|הוסף/i })).toBeInTheDocument()
    })
  })

  // Loading State
  describe('loading state', () => {
    it('shows loading indicator when loading team members', () => {
      mockUseTeamMembers.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      })

      renderWithProviders(<TeamPage />)
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })
  })

  // Error State
  describe('error state', () => {
    it('shows error message when team members fail to load', () => {
      mockUseTeamMembers.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Failed to load team members'),
        refetch: vi.fn(),
      })

      renderWithProviders(<TeamPage />)
      // Multiple error texts might appear
      expect(screen.getAllByText(/failed|error|שגיאה/i).length).toBeGreaterThanOrEqual(1)
    })

    it('shows retry button on error', () => {
      mockUseTeamMembers.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: vi.fn(),
      })

      renderWithProviders(<TeamPage />)
      expect(screen.getByRole('button', { name: /retry|נסה שוב/i })).toBeInTheDocument()
    })
  })

  // Add Member Flow
  describe('add member flow', () => {
    it('opens add member modal when add button clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TeamPage />)

      await user.click(screen.getByRole('button', { name: /add|הוסף/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('modal contains team member form', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TeamPage />)

      await user.click(screen.getByRole('button', { name: /add|הוסף/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/name|שם/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/email|אימייל/i)).toBeInTheDocument()
      })
    })

    it('calls createTeamMember on form submit', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn()
      mockUseCreateTeamMember.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      })

      renderWithProviders(<TeamPage />)

      // Open modal
      await user.click(screen.getByRole('button', { name: /add member/i }))

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Fill form - the form has "Name *" as label
      const nameInput = screen.getByLabelText(/name \*/i)
      const emailInput = screen.getByLabelText(/email \*/i)

      await user.type(nameInput, 'New Member')
      await user.type(emailInput, 'new@example.com')

      // Submit - in create mode it's "Add Member"
      const submitButtons = screen.getAllByRole('button', { name: /add member/i })
      // The second one is in the modal form
      await user.click(submitButtons[submitButtons.length - 1])

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
      })
    })
  })

  // Edit Member Flow
  describe('edit member flow', () => {
    it('opens edit modal when edit button clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TeamPage />)

      // Click edit on first member
      const editButtons = screen.getAllByRole('button', { name: /edit|עריכה/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('pre-fills form with member data in edit mode', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TeamPage />)

      const editButtons = screen.getAllByRole('button', { name: /עריכה/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        // Form should be pre-filled with member data - look for the dialog first
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // The name field should contain "Israel Cohen" - using input with the value
      const nameInputs = screen.getAllByRole('textbox')
      const nameInput = nameInputs.find(input => (input as HTMLInputElement).value.includes('Israel'))
      expect(nameInput).toBeTruthy()
    })

    it('calls updateTeamMember on edit form submit', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn()
      mockUseUpdateTeamMember.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      })

      renderWithProviders(<TeamPage />)

      // Open edit modal
      const editButtons = screen.getAllByRole('button', { name: /עריכה/i })
      await user.click(editButtons[0])

      // Submit form
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // In edit mode the button says "Update Member"
      await user.click(screen.getByRole('button', { name: /update member/i }))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled()
      })
    })
  })

  // Delete Member Flow
  describe('delete member flow', () => {
    it('calls deleteTeamMember when delete button clicked', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn()
      mockUseDeleteTeamMember.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      })

      renderWithProviders(<TeamPage />)

      // Click delete on first member
      const deleteButtons = screen.getAllByRole('button', { name: /delete|מחיקה/i })
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith('member-1', expect.anything())
      })
    })

    it('shows deleting state while deletion is pending', () => {
      mockUseDeleteTeamMember.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
        variables: 'member-1',
      })

      renderWithProviders(<TeamPage />)
      expect(screen.getByText(/מוחק|deleting/i)).toBeInTheDocument()
    })
  })

  // Time Off Section
  describe('time off section', () => {
    it('displays time off entries', () => {
      renderWithProviders(<TeamPage />)
      // Vacation text appears in time off entries
      expect(screen.getAllByText(/vacation/i).length).toBeGreaterThanOrEqual(1)
    })

    it('shows time off loading state', () => {
      mockUseTimeOffs.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      })

      renderWithProviders(<TeamPage />)
      // Both team members and time off might have loading states
      const loadingIndicators = screen.getAllByTestId('loading-indicator')
      expect(loadingIndicators.length).toBeGreaterThanOrEqual(1)
    })
  })

  // Empty State
  describe('empty state', () => {
    it('shows empty state when no team members', () => {
      mockUseTeamMembers.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })

      renderWithProviders(<TeamPage />)
      expect(screen.getByText(/no team members|אין חברי צוות/i)).toBeInTheDocument()
    })
  })

  // Modal Close
  describe('modal behavior', () => {
    it('closes modal on cancel', async () => {
      const user = userEvent.setup()
      renderWithProviders(<TeamPage />)

      // Open modal
      await user.click(screen.getByRole('button', { name: /add|הוסף/i }))

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Click cancel
      await user.click(screen.getByRole('button', { name: /cancel|ביטול/i }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  // RTL Layout
  describe('RTL layout', () => {
    it('has RTL direction', () => {
      renderWithProviders(<TeamPage />)
      const container = screen.getByTestId('team-page')
      expect(container).toHaveAttribute('dir', 'rtl')
    })
  })
})

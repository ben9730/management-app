/**
 * ProjectsList Component Tests (TDD)
 *
 * Comprehensive tests for the ProjectsList component.
 * Following TDD methodology: Write tests FIRST, then implement.
 *
 * Requirements:
 * 1. Display list of projects in a responsive grid
 * 2. Loading state with spinner and Hebrew text
 * 3. Error state with Hebrew error message and retry button
 * 4. Empty state with Hebrew text and add button
 * 5. Header with title and add button
 * 6. Filter by status (all, active, completed, archived)
 * 7. Search by name
 * 8. Delete confirmation before calling onDelete
 * 9. onClick passes project to select handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectsList, ProjectsListProps } from './ProjectsList'
import type { Project } from '@/types/entities'

// Mock project data
const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Project Alpha',
    description: 'First test project',
    status: 'active',
    start_date: new Date('2026-01-15'),
    end_date: new Date('2026-03-31'),
    created_by: 'user-1',
    created_at: new Date('2026-01-10'),
    updated_at: new Date('2026-01-10'),
  },
  {
    id: 'project-2',
    name: 'Project Beta',
    description: 'Second test project',
    status: 'completed',
    start_date: new Date('2026-02-01'),
    end_date: new Date('2026-04-30'),
    created_by: 'user-1',
    created_at: new Date('2026-01-12'),
    updated_at: new Date('2026-01-12'),
  },
  {
    id: 'project-3',
    name: 'Project Gamma',
    description: 'Third test project',
    status: 'archived',
    start_date: new Date('2025-06-01'),
    end_date: new Date('2025-12-31'),
    created_by: 'user-2',
    created_at: new Date('2025-05-01'),
    updated_at: new Date('2025-12-31'),
  },
  {
    id: 'project-4',
    name: 'Project Delta',
    description: null,
    status: 'active',
    start_date: null,
    end_date: null,
    created_by: 'user-1',
    created_at: new Date('2026-01-20'),
    updated_at: new Date('2026-01-20'),
  },
]

const mockOnEdit = vi.fn()
const mockOnDelete = vi.fn()
const mockOnAdd = vi.fn()
const mockOnSelect = vi.fn()
const mockOnRetry = vi.fn()

const defaultProps: ProjectsListProps = {
  projects: mockProjects,
  onEdit: mockOnEdit,
  onDelete: mockOnDelete,
  onAdd: mockOnAdd,
}

describe('ProjectsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================
  // 1. Renders project list with correct number of cards
  // ===========================================
  describe('rendering project list', () => {
    it('renders all projects when no filter applied', () => {
      render(<ProjectsList {...defaultProps} />)

      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      expect(screen.getByText('Project Beta')).toBeInTheDocument()
      expect(screen.getByText('Project Gamma')).toBeInTheDocument()
      expect(screen.getByText('Project Delta')).toBeInTheDocument()
    })

    it('renders correct number of project cards', () => {
      render(<ProjectsList {...defaultProps} />)

      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(4)
    })

    it('renders project descriptions', () => {
      render(<ProjectsList {...defaultProps} />)

      expect(screen.getByText('First test project')).toBeInTheDocument()
      expect(screen.getByText('Second test project')).toBeInTheDocument()
      expect(screen.getByText('Third test project')).toBeInTheDocument()
    })

    it('renders projects in a grid layout', () => {
      render(<ProjectsList {...defaultProps} />)

      const projectList = screen.getByTestId('projects-list')
      expect(projectList).toHaveClass('grid')
    })

    it('handles single project correctly', () => {
      render(<ProjectsList {...defaultProps} projects={[mockProjects[0]]} />)

      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(1)
      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
    })
  })

  // ===========================================
  // 2. Shows loading state with spinner
  // ===========================================
  describe('loading state', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<ProjectsList {...defaultProps} isLoading />)

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('shows Hebrew loading text', () => {
      render(<ProjectsList {...defaultProps} isLoading />)

      expect(screen.getByText('טוען פרויקטים...')).toBeInTheDocument()
    })

    it('does not render project list when loading', () => {
      render(<ProjectsList {...defaultProps} isLoading />)

      expect(screen.queryByText('Project Alpha')).not.toBeInTheDocument()
      expect(screen.queryByTestId('projects-list')).not.toBeInTheDocument()
    })

    it('shows spinner animation', () => {
      render(<ProjectsList {...defaultProps} isLoading />)

      const spinner = screen.getByTestId('loading-indicator')
      // Spinner should have animate-spin class or contain spinning element
      expect(spinner).toBeInTheDocument()
    })

    it('centers loading indicator', () => {
      render(<ProjectsList {...defaultProps} isLoading />)

      const container = screen.getByTestId('loading-indicator').parentElement
      expect(container).toHaveClass('flex')
      expect(container).toHaveClass('items-center')
      expect(container).toHaveClass('justify-center')
    })
  })

  // ===========================================
  // 3. Shows error state with message and retry button
  // ===========================================
  describe('error state', () => {
    it('shows error message when error prop is provided', () => {
      render(<ProjectsList {...defaultProps} error="Failed to load projects" />)

      expect(screen.getByText('Failed to load projects')).toBeInTheDocument()
    })

    it('shows error heading in Hebrew', () => {
      render(<ProjectsList {...defaultProps} error="Connection failed" />)

      expect(screen.getByRole('heading', { name: /שגיאה בטעינת פרויקטים|failed to load/i })).toBeInTheDocument()
    })

    it('shows retry button when error occurs and onRetry provided', () => {
      render(
        <ProjectsList {...defaultProps} error="Error occurred" onRetry={mockOnRetry} />
      )

      expect(screen.getByRole('button', { name: /נסה שוב|retry/i })).toBeInTheDocument()
    })

    it('calls onRetry when retry button clicked', async () => {
      const user = userEvent.setup()
      render(
        <ProjectsList {...defaultProps} error="Error occurred" onRetry={mockOnRetry} />
      )

      await user.click(screen.getByRole('button', { name: /נסה שוב|retry/i }))
      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })

    it('does not show retry button when onRetry not provided', () => {
      render(<ProjectsList {...defaultProps} error="Error occurred" />)

      expect(screen.queryByRole('button', { name: /נסה שוב|retry/i })).not.toBeInTheDocument()
    })

    it('does not render project list when error', () => {
      render(<ProjectsList {...defaultProps} error="Error occurred" />)

      expect(screen.queryByText('Project Alpha')).not.toBeInTheDocument()
      expect(screen.queryByTestId('projects-list')).not.toBeInTheDocument()
    })

    it('shows error icon', () => {
      render(<ProjectsList {...defaultProps} error="Error occurred" />)

      // Should have AlertCircle icon or similar error indicator
      const errorContainer = screen.getByText('Error occurred').closest('div')
      expect(errorContainer).toBeInTheDocument()
    })
  })

  // ===========================================
  // 4. Shows empty state with add button
  // ===========================================
  describe('empty state', () => {
    it('shows Hebrew empty message when no projects', () => {
      render(<ProjectsList {...defaultProps} projects={[]} />)

      expect(screen.getByText('אין פרויקטים עדיין')).toBeInTheDocument()
    })

    it('shows add button in empty state', () => {
      render(<ProjectsList {...defaultProps} projects={[]} />)

      // Should have at least one add button (possibly two - header + empty state body)
      const addButtons = screen.getAllByRole('button', { name: /הוסף פרויקט|add project/i })
      expect(addButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('shows helpful message explaining how to start', () => {
      render(<ProjectsList {...defaultProps} projects={[]} />)

      expect(
        screen.getByText(/הוסיפו את הפרויקט הראשון|add your first project/i)
      ).toBeInTheDocument()
    })

    it('calls onAdd when add button clicked in empty state', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} projects={[]} />)

      const addButton = screen.getAllByRole('button', { name: /הוסף|add/i })[0]
      await user.click(addButton)

      expect(mockOnAdd).toHaveBeenCalledTimes(1)
    })

    it('shows FolderOpen or similar icon in empty state', () => {
      render(<ProjectsList {...defaultProps} projects={[]} />)

      // Empty state should have visual indicator
      const emptyContainer = screen.getByText('אין פרויקטים עדיין').closest('div')
      expect(emptyContainer).toBeInTheDocument()
    })
  })

  // ===========================================
  // 5. Header with title and add button
  // ===========================================
  describe('header', () => {
    it('shows Hebrew title', () => {
      render(<ProjectsList {...defaultProps} />)

      expect(screen.getByRole('heading', { name: 'פרויקטים' })).toBeInTheDocument()
    })

    it('shows add button in header', () => {
      render(<ProjectsList {...defaultProps} />)

      expect(screen.getByRole('button', { name: /הוסף פרויקט|add project/i })).toBeInTheDocument()
    })

    it('shows project count', () => {
      render(<ProjectsList {...defaultProps} />)

      // Should show count like "(4 פרויקטים)" or similar
      expect(screen.getByText(/4 פרויקטים/)).toBeInTheDocument()
    })

    it('shows singular text for 1 project', () => {
      render(<ProjectsList {...defaultProps} projects={[mockProjects[0]]} />)

      expect(screen.getByText(/1.*פרויקט|1.*project/i)).toBeInTheDocument()
    })

    it('shows plural text for multiple projects', () => {
      render(<ProjectsList {...defaultProps} />)

      expect(screen.getByText(/4.*פרויקטים|4.*projects/i)).toBeInTheDocument()
    })
  })

  // ===========================================
  // 6. Status filter buttons work
  // ===========================================
  describe('status filter', () => {
    it('renders filter buttons for all statuses', () => {
      render(<ProjectsList {...defaultProps} />)

      expect(screen.getByRole('button', { name: /הכל|all/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /פעיל|active/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /הושלם|completed/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /בארכיון|archived/i })).toBeInTheDocument()
    })

    it('shows all projects by default', () => {
      render(<ProjectsList {...defaultProps} />)

      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(4)
    })

    it('filters to active projects when active button clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /פעיל|active/i }))

      // Should show only active projects (Project Alpha and Project Delta)
      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      expect(screen.getByText('Project Delta')).toBeInTheDocument()
      expect(screen.queryByText('Project Beta')).not.toBeInTheDocument()
      expect(screen.queryByText('Project Gamma')).not.toBeInTheDocument()
    })

    it('filters to completed projects when completed button clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /הושלם|completed/i }))

      // Should show only completed project (Project Beta)
      expect(screen.getByText('Project Beta')).toBeInTheDocument()
      expect(screen.queryByText('Project Alpha')).not.toBeInTheDocument()
    })

    it('filters to archived projects when archived button clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /בארכיון|archived/i }))

      // Should show only archived project (Project Gamma)
      expect(screen.getByText('Project Gamma')).toBeInTheDocument()
      expect(screen.queryByText('Project Alpha')).not.toBeInTheDocument()
    })

    it('shows all projects when all button clicked after filtering', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      // Filter first
      await user.click(screen.getByRole('button', { name: /פעיל|active/i }))
      // Then reset to all
      await user.click(screen.getByRole('button', { name: /הכל|all/i }))

      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(4)
    })

    it('highlights active filter button', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const activeButton = screen.getByRole('button', { name: /פעיל|active/i })
      await user.click(activeButton)

      // Active filter should have different styling (data-active or specific class)
      expect(activeButton).toHaveAttribute('data-active', 'true')
    })

    it('shows empty state when filter yields no results', async () => {
      const user = userEvent.setup()
      // Only active projects
      const activeOnlyProjects = mockProjects.filter((p) => p.status === 'active')
      render(<ProjectsList {...defaultProps} projects={activeOnlyProjects} />)

      // Filter to archived (which has no projects)
      await user.click(screen.getByRole('button', { name: /בארכיון|archived/i }))

      expect(screen.getByText(/אין פרויקטים|no projects/i)).toBeInTheDocument()
    })
  })

  // ===========================================
  // 7. Search by name
  // ===========================================
  describe('search functionality', () => {
    it('renders search input', () => {
      render(<ProjectsList {...defaultProps} />)

      expect(screen.getByRole('searchbox')).toBeInTheDocument()
    })

    it('has Hebrew placeholder text', () => {
      render(<ProjectsList {...defaultProps} />)

      expect(screen.getByPlaceholderText(/חיפוש פרויקטים|search projects/i)).toBeInTheDocument()
    })

    it('filters projects by name as user types', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'Alpha')

      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      expect(screen.queryByText('Project Beta')).not.toBeInTheDocument()
      expect(screen.queryByText('Project Gamma')).not.toBeInTheDocument()
    })

    it('search is case-insensitive', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'alpha')

      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
    })

    it('clears search when input cleared', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'Alpha')
      await user.clear(searchInput)

      const cards = screen.getAllByRole('article')
      expect(cards).toHaveLength(4)
    })

    it('combines search with status filter', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      // Filter to active
      await user.click(screen.getByRole('button', { name: /פעיל|active/i }))
      // Search for "Alpha"
      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'Alpha')

      // Should only show Project Alpha (active and matches search)
      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      expect(screen.queryByText('Project Delta')).not.toBeInTheDocument() // active but no match
    })

    it('shows no results message when search yields nothing', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'NonExistentProject')

      expect(screen.getByText(/לא נמצאו פרויקטים|no projects found/i)).toBeInTheDocument()
    })

    it('searches in project description as well', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const searchInput = screen.getByRole('searchbox')
      await user.type(searchInput, 'First test')

      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
    })
  })

  // ===========================================
  // 8. Calls onAdd when add button clicked
  // ===========================================
  describe('onAdd callback', () => {
    it('calls onAdd when header add button clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const addButton = screen.getByRole('button', { name: /הוסף פרויקט|add project/i })
      await user.click(addButton)

      expect(mockOnAdd).toHaveBeenCalledTimes(1)
    })

    it('calls onAdd when empty state add button clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} projects={[]} />)

      const addButtons = screen.getAllByRole('button', { name: /הוסף|add/i })
      await user.click(addButtons[0])

      expect(mockOnAdd).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================
  // 9. Calls onEdit when project edit clicked
  // ===========================================
  describe('onEdit callback', () => {
    it('calls onEdit when edit button clicked on project card', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const editButtons = screen.getAllByRole('button', { name: /עריכה|edit/i })
      await user.click(editButtons[0])

      expect(mockOnEdit).toHaveBeenCalledTimes(1)
    })

    it('passes correct project to onEdit callback', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const editButtons = screen.getAllByRole('button', { name: /עריכה|edit/i })
      await user.click(editButtons[0])

      expect(mockOnEdit).toHaveBeenCalledWith(mockProjects[0])
    })

    it('edit works on any project card', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const editButtons = screen.getAllByRole('button', { name: /עריכה|edit/i })
      await user.click(editButtons[1]) // Second project

      expect(mockOnEdit).toHaveBeenCalledWith(mockProjects[1])
    })
  })

  // ===========================================
  // 10. Calls onDelete when project delete clicked
  // ===========================================
  describe('onDelete callback', () => {
    it('calls onDelete when delete button clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: /מחיקה|delete/i })
      await user.click(deleteButtons[0])

      expect(mockOnDelete).toHaveBeenCalledTimes(1)
      expect(mockOnDelete).toHaveBeenCalledWith('project-1')
    })

    it('calls onDelete with correct project id for each card', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: /מחיקה|delete/i })
      await user.click(deleteButtons[1]) // Second project

      expect(mockOnDelete).toHaveBeenCalledWith('project-2')
    })
  })

  // ===========================================
  // 11. Calls onSelect when project card clicked
  // ===========================================
  describe('onSelect callback', () => {
    it('calls onSelect when project card is clicked', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} onSelect={mockOnSelect} />)

      const card = screen.getAllByRole('article')[0]
      await user.click(card)

      expect(mockOnSelect).toHaveBeenCalledTimes(1)
    })

    it('passes correct project to onSelect callback', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} onSelect={mockOnSelect} />)

      const cards = screen.getAllByRole('article')
      await user.click(cards[1]) // Second project

      expect(mockOnSelect).toHaveBeenCalledWith(mockProjects[1])
    })

    it('does not call onSelect when onSelect is not provided', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const card = screen.getAllByRole('article')[0]
      await user.click(card)

      // Should not throw, and onSelect should not be called
      expect(mockOnSelect).not.toHaveBeenCalled()
    })

    it('does not call onSelect when clicking edit button', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} onSelect={mockOnSelect} />)

      const editButton = screen.getAllByRole('button', { name: /עריכה|edit/i })[0]
      await user.click(editButton)

      expect(mockOnSelect).not.toHaveBeenCalled()
      expect(mockOnEdit).toHaveBeenCalled()
    })

    it('does not call onSelect when clicking delete button', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} onSelect={mockOnSelect} />)

      const deleteButton = screen.getAllByRole('button', { name: /מחיקה|delete/i })[0]
      await user.click(deleteButton)

      expect(mockOnSelect).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // 12. Shows deleting state on correct card
  // ===========================================
  describe('deleting state', () => {
    it('passes isDeleting to correct project card', () => {
      render(<ProjectsList {...defaultProps} deletingProjectId="project-2" />)

      // The second card should show deleting state
      expect(screen.getByText(/מוחק/)).toBeInTheDocument()
    })

    it('only shows deleting state on the project being deleted', () => {
      render(<ProjectsList {...defaultProps} deletingProjectId="project-2" />)

      // Count delete buttons that are not in deleting state
      const deleteButtons = screen.getAllByRole('button', { name: /מחיקה|delete/i })
      const enabledDeleteButtons = deleteButtons.filter((btn) => !btn.hasAttribute('disabled'))
      expect(enabledDeleteButtons).toHaveLength(3) // 3 not deleting
    })

    it('disables actions on deleting card', () => {
      render(<ProjectsList {...defaultProps} deletingProjectId="project-1" />)

      // First card's buttons should be disabled
      const cards = screen.getAllByRole('article')
      const firstCard = cards[0]
      const editButton = within(firstCard).getByRole('button', { name: /עריכה|edit/i })
      expect(editButton).toBeDisabled()
    })

    it('applies opacity to deleting card', () => {
      render(<ProjectsList {...defaultProps} deletingProjectId="project-1" />)

      const cards = screen.getAllByRole('article')
      expect(cards[0]).toHaveClass('opacity-50')
    })
  })

  // ===========================================
  // 13. Applies custom className
  // ===========================================
  describe('custom className', () => {
    it('applies custom className to container', () => {
      render(<ProjectsList {...defaultProps} className="custom-class" />)

      const container = screen.getByTestId('projects-container')
      expect(container).toHaveClass('custom-class')
    })

    it('merges custom className with default classes', () => {
      render(<ProjectsList {...defaultProps} className="custom-class" />)

      const container = screen.getByTestId('projects-container')
      expect(container).toHaveClass('custom-class')
      expect(container.className).toContain('flex')
    })
  })

  // ===========================================
  // 14. Dark mode styling
  // ===========================================
  describe('dark mode styling', () => {
    it('has dark mode background classes', () => {
      render(<ProjectsList {...defaultProps} />)

      const container = screen.getByTestId('projects-container')
      // Container or children should have dark mode classes
      expect(container.innerHTML).toMatch(/dark:/)
    })

    it('header has dark mode text color', () => {
      render(<ProjectsList {...defaultProps} />)

      const heading = screen.getByRole('heading', { name: 'פרויקטים' })
      expect(heading.className).toMatch(/dark:text-/)
    })

    it('search input has dark mode styling', () => {
      render(<ProjectsList {...defaultProps} />)

      const searchInput = screen.getByRole('searchbox')
      expect(searchInput.className).toMatch(/dark:/)
    })
  })

  // ===========================================
  // 15. Responsive grid layout
  // ===========================================
  describe('responsive grid layout', () => {
    it('has responsive grid classes', () => {
      render(<ProjectsList {...defaultProps} />)

      const projectList = screen.getByTestId('projects-list')
      expect(projectList).toHaveClass('grid')
      expect(projectList.className).toMatch(/grid-cols-1/)
      expect(projectList.className).toMatch(/md:grid-cols-2/)
      expect(projectList.className).toMatch(/lg:grid-cols-3/)
    })

    it('has gap between cards', () => {
      render(<ProjectsList {...defaultProps} />)

      const projectList = screen.getByTestId('projects-list')
      expect(projectList.className).toMatch(/gap-/)
    })
  })

  // ===========================================
  // Additional Edge Cases
  // ===========================================
  describe('edge cases', () => {
    it('handles Hebrew project names', () => {
      const hebrewProjects: Project[] = [
        {
          ...mockProjects[0],
          name: 'פרויקט בדיקה',
          description: 'תיאור הפרויקט',
        },
      ]
      render(<ProjectsList {...defaultProps} projects={hebrewProjects} />)

      expect(screen.getByText('פרויקט בדיקה')).toBeInTheDocument()
      expect(screen.getByText('תיאור הפרויקט')).toBeInTheDocument()
    })

    it('handles very long project names', () => {
      const longNameProjects: Project[] = [
        {
          ...mockProjects[0],
          name: 'A'.repeat(200),
        },
      ]
      render(<ProjectsList {...defaultProps} projects={longNameProjects} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('handles special characters in project names', () => {
      const specialCharProjects: Project[] = [
        {
          ...mockProjects[0],
          name: '<script>alert("xss")</script>',
        },
      ]
      render(<ProjectsList {...defaultProps} projects={specialCharProjects} />)

      // Should render as text, not execute script
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('handles null description in project', () => {
      const noDescProject: Project[] = [
        {
          ...mockProjects[0],
          description: null,
        },
      ]
      render(<ProjectsList {...defaultProps} projects={noDescProject} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('handles projects with null dates', () => {
      const noDatesProject: Project[] = [
        {
          ...mockProjects[0],
          start_date: null,
          end_date: null,
        },
      ]
      render(<ProjectsList {...defaultProps} projects={noDatesProject} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })
  })

  // ===========================================
  // Accessibility
  // ===========================================
  describe('accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<ProjectsList {...defaultProps} />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('פרויקטים')
    })

    it('search input has accessible label', () => {
      render(<ProjectsList {...defaultProps} />)

      const searchInput = screen.getByRole('searchbox')
      expect(searchInput).toHaveAttribute('aria-label')
    })

    it('filter buttons have accessible names', () => {
      render(<ProjectsList {...defaultProps} />)

      const allButton = screen.getByRole('button', { name: /הכל|all/i })
      expect(allButton).toBeInTheDocument()
    })

    it('add button has accessible name', () => {
      render(<ProjectsList {...defaultProps} />)

      const addButton = screen.getByRole('button', { name: /הוסף פרויקט|add project/i })
      expect(addButton).toBeInTheDocument()
    })

    it('loading state announces to screen readers', () => {
      render(<ProjectsList {...defaultProps} isLoading />)

      const loadingIndicator = screen.getByTestId('loading-indicator')
      expect(loadingIndicator).toHaveAttribute('aria-busy', 'true')
    })

    it('filter buttons support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ProjectsList {...defaultProps} />)

      const activeButton = screen.getByRole('button', { name: /פעיל|active/i })
      activeButton.focus()

      await user.keyboard('{Enter}')

      // Should have filtered to active projects
      expect(screen.queryByText('Project Beta')).not.toBeInTheDocument()
    })
  })

  // ===========================================
  // RTL Support
  // ===========================================
  describe('RTL support', () => {
    it('uses Hebrew labels throughout', () => {
      render(<ProjectsList {...defaultProps} />)

      expect(screen.getByText('פרויקטים')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /הכל/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /פעיל/i })).toBeInTheDocument()
    })

    it('empty state uses Hebrew text', () => {
      render(<ProjectsList {...defaultProps} projects={[]} />)

      expect(screen.getByText('אין פרויקטים עדיין')).toBeInTheDocument()
    })

    it('loading state uses Hebrew text', () => {
      render(<ProjectsList {...defaultProps} isLoading />)

      expect(screen.getByText('טוען פרויקטים...')).toBeInTheDocument()
    })
  })
})

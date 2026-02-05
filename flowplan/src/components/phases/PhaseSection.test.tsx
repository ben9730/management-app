/**
 * PhaseSection Component Tests (TDD)
 *
 * PhaseSection displays a project phase with its tasks,
 * progress bar, and metadata. Supports collapsible view.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhaseSection } from './PhaseSection'
import type { ProjectPhase, Task, TeamMember } from '@/types/entities'

// Mock phase data
const mockPhase: ProjectPhase = {
  id: 'phase-1',
  project_id: 'proj-1',
  name: 'Planning',
  description: 'Initial planning and requirements gathering',
  order_index: 0,
  status: 'active',
  start_date: '2026-01-15',
  end_date: '2026-02-15',
  task_count: 5,
  completed_task_count: 2,
  created_at: '2026-01-10T10:00:00Z',
  updated_at: '2026-01-20T14:00:00Z',
} as unknown as ProjectPhase // Casting to bypass Date/string mismatches in test mocks

const mockTasks: Task[] = [
  {
    id: 'task-1',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Define scope',
    description: 'Define project scope and objectives',
    task_type: 'task',
    status: 'done', // Changed from 'completed'
    priority: 'high',
    start_date: '2026-01-15',
    due_date: '2026-01-20',
    estimated_hours: 8,
    actual_hours: 10,
    progress_percent: 100,
    wbs_number: '1.1',
    order_index: 0,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-20T00:00:00Z',
  } as unknown as Task,
  {
    id: 'task-2',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Gather requirements',
    description: 'Gather and document requirements',
    task_type: 'task',
    status: 'done', // Changed from 'completed'
    priority: 'high',
    start_date: '2026-01-20',
    due_date: '2026-01-25',
    estimated_hours: 16,
    actual_hours: 14,
    progress_percent: 100,
    wbs_number: '1.2',
    order_index: 1,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-25T00:00:00Z',
  } as unknown as Task,
  {
    id: 'task-3',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Create timeline',
    description: 'Create project timeline and milestones',
    task_type: 'task',
    status: 'in_progress',
    priority: 'medium',
    start_date: '2026-01-25',
    due_date: '2026-01-30',
    estimated_hours: 8,
    actual_hours: 4,
    progress_percent: 50,
    wbs_number: '1.3',
    order_index: 2,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-27T00:00:00Z',
  } as unknown as Task,
]

const mockAssignees: Record<string, TeamMember[]> = {
  'task-1': [{
    id: 'member-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    email: 'john@example.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'member',
    employment_type: 'full_time',
    weekly_capacity_hours: 40,
    work_days: [0, 1, 2, 3, 4],
    hourly_rate: 100,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  } as unknown as TeamMember],
}

describe('PhaseSection', () => {
  describe('Basic Rendering', () => {
    it('renders phase name', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      expect(screen.getByText('Planning')).toBeInTheDocument()
    })

    it('renders phase description', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      expect(screen.getByText('Initial planning and requirements gathering')).toBeInTheDocument()
    })

    it('does not render description when not provided', () => {
      const phaseWithoutDesc = { ...mockPhase, description: null }
      render(<PhaseSection phase={phaseWithoutDesc} tasks={[]} />)
      expect(screen.queryByText('Initial planning and requirements gathering')).not.toBeInTheDocument()
    })

    it('renders all tasks', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} />)
      expect(screen.getByText('Define scope')).toBeInTheDocument()
      expect(screen.getByText('Gather requirements')).toBeInTheDocument()
      expect(screen.getByText('Create timeline')).toBeInTheDocument()
    })
  })

  describe('Progress Display', () => {


    it('displays progress percentage', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} />)
      expect(screen.getByText('40%')).toBeInTheDocument()
    })

    it('renders progress bar with correct width', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} />)
      const progressBar = screen.getByTestId('phase-progress-bar')
      expect(progressBar).toHaveStyle({ width: '40%' })
    })

    it('shows 0% when no tasks completed', () => {
      const emptyPhase = { ...mockPhase, completed_task_count: 0 }
      render(<PhaseSection phase={emptyPhase} tasks={[]} />)
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('shows 100% when all tasks completed', () => {
      const completedPhase = { ...mockPhase, task_count: 3, completed_task_count: 3 }
      render(<PhaseSection phase={completedPhase} tasks={mockTasks} />)
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('Status Display', () => {
    it('shows pending status badge', () => {
      const pendingPhase = { ...mockPhase, status: 'pending' as const }
      render(<PhaseSection phase={pendingPhase} tasks={[]} />)
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('shows active status badge', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('shows completed status badge', () => {
      const completedPhase = { ...mockPhase, status: 'completed' as const }
      render(<PhaseSection phase={completedPhase} tasks={[]} />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  describe('Date Display', () => {
    it('displays start date', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      expect(screen.getByText(/15.*01.*2026/)).toBeInTheDocument()
    })

    it('displays end date', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      expect(screen.getByText(/15.*02.*2026/)).toBeInTheDocument()
    })

    it('shows no dates when not provided', () => {
      const phaseWithoutDates = { ...mockPhase, start_date: null, end_date: null }
      render(<PhaseSection phase={phaseWithoutDates} tasks={[]} />)
      expect(screen.queryByText(/No dates set/)).not.toBeInTheDocument()
    })
  })

  describe('Collapsible Behavior', () => {
    it('starts expanded by default', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} />)
      expect(screen.getByText('Define scope')).toBeVisible()
    })

    it('collapses when header is clicked', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} />)

      fireEvent.click(screen.getByTestId('phase-header'))

      expect(screen.queryByText('Define scope')).not.toBeInTheDocument()
    })

    it('expands when header is clicked again', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} />)

      fireEvent.click(screen.getByTestId('phase-header'))
      fireEvent.click(screen.getByTestId('phase-header'))

      expect(screen.getByText('Define scope')).toBeInTheDocument()
    })

    it('can start collapsed with defaultCollapsed prop', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} defaultCollapsed />)
      expect(screen.queryByText('Define scope')).not.toBeInTheDocument()
    })

    it('shows collapse indicator when expanded', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} />)
      const indicator = screen.getByTestId('collapse-indicator')
      // Expect finding an SVG (Lucide icon)
      expect(indicator.querySelector('svg')).toBeInTheDocument()
      expect(indicator).toHaveStyle('transform: rotate(0deg)')
    })

    it('shows expand indicator when collapsed', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} defaultCollapsed />)
      const indicator = screen.getByTestId('collapse-indicator')
      expect(indicator.querySelector('svg')).toBeInTheDocument()
      expect(indicator).toHaveStyle('transform: rotate(-90deg)')
    })
  })

  describe('Interactions', () => {
    it('calls onTaskClick when a task is clicked', () => {
      const handleTaskClick = vi.fn()
      render(
        <PhaseSection
          phase={mockPhase}
          tasks={mockTasks}
          onTaskClick={handleTaskClick}
        />
      )

      fireEvent.click(screen.getByText('Define scope'))

      expect(handleTaskClick).toHaveBeenCalledWith(mockTasks[0])
    })

    it('calls onAddTask when add button is clicked', () => {
      const handleAddTask = vi.fn()
      render(
        <PhaseSection
          phase={mockPhase}
          tasks={mockTasks}
          onAddTask={handleAddTask}
        />
      )

      const button = screen.getByTestId('add-task-button')
      expect(button.querySelector('svg')).toBeInTheDocument()
      fireEvent.click(button)

      expect(handleAddTask).toHaveBeenCalledWith(mockPhase.id)
    })

    it('calls onStatusChange when task status changes', () => {
      const handleStatusChange = vi.fn()
      render(
        <PhaseSection
          phase={mockPhase}
          tasks={mockTasks}
          onTaskStatusChange={handleStatusChange}
        />
      )

      fireEvent.click(screen.getAllByTestId('status-checkbox')[0])

      expect(handleStatusChange).toHaveBeenCalled()
    })
  })

  describe('Critical Path', () => {
    it('highlights critical path tasks', () => {
      const criticalPathTaskIds = ['task-1', 'task-3']
      render(
        <PhaseSection
          phase={mockPhase}
          tasks={mockTasks}
          criticalPathTaskIds={criticalPathTaskIds}
        />
      )

      const taskCards = screen.getAllByTestId('task-card')
      // Critical Path in Monday style is highlighted via left border strip
      expect(taskCards[0]).toHaveClass('border-l-8')
      expect(taskCards[1]).not.toHaveClass('border-l-8')
      expect(taskCards[2]).toHaveClass('border-l-8')
    })
  })

  describe('Slack Values', () => {
    it('displays slack values for tasks', () => {
      const slackValues: Record<string, number> = {
        'task-1': 0,
        'task-2': 2,
        'task-3': 5,
      }
      render(
        <PhaseSection
          phase={mockPhase}
          tasks={mockTasks}
          taskSlackValues={slackValues}
        />
      )

      expect(screen.getByText('0 days slack')).toBeInTheDocument()
      expect(screen.getByText('2 days slack')).toBeInTheDocument()
      expect(screen.getByText('5 days slack')).toBeInTheDocument()
    })
  })

  describe('Assignees', () => {
    it('displays assignees for tasks', () => {
      render(
        <PhaseSection
          phase={mockPhase}
          tasks={mockTasks}
          taskAssignees={mockAssignees}
        />
      )

      // TaskCard shows initials, so we check for title attribute on the specific task card's assignee avatar
      // Or simply check that the initials are present
      expect(screen.getByText('JD')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no tasks', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      expect(screen.getByText('No tasks in this phase')).toBeInTheDocument()
    })

    it('shows add task prompt in empty state', () => {
      const handleAddTask = vi.fn()
      render(
        <PhaseSection
          phase={mockPhase}
          tasks={[]}
          onAddTask={handleAddTask}
        />
      )
      expect(screen.getByText(/Add a task/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA role for section', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('has accessible name from phase name', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      expect(screen.getByRole('region')).toHaveAccessibleName(/Phase: Planning/)
    })

    it('header button has aria-expanded attribute', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} />)
      expect(screen.getByTestId('phase-header')).toHaveAttribute('aria-expanded', 'true')
    })

    it('header button has aria-controls attribute', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} />)
      expect(screen.getByTestId('phase-header')).toHaveAttribute('aria-controls')
    })
  })

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} className="custom-class" />)
      expect(screen.getByTestId('phase-section')).toHaveClass('custom-class')
    })

    it('applies completed phase styling', () => {
      const completedPhase = { ...mockPhase, status: 'completed' as const }
      render(<PhaseSection phase={completedPhase} tasks={[]} />)
      const section = screen.getByTestId('phase-section')
      expect(section.getAttribute('style')).toContain('border-left-color: var(--fp-status-success)')
    })

    it('applies active phase styling', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      const section = screen.getByTestId('phase-section')
      expect(section.getAttribute('style')).toContain('border-left-color: var(--fp-brand-primary)')
    })
  })

  describe('High Contrast & Visibility', () => {
    it('has high contrast header background', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      const header = screen.getByTestId('phase-header').parentElement
      // We want to avoid highly translucent backgrounds like /30
      expect(header).toHaveClass('bg-gray-100')
      expect(header).not.toHaveClass('bg-[var(--fp-bg-primary)]/30')
    })

    it('has high contrast text in header', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      const title = screen.getByText('Planning')
      expect(title).toHaveClass('text-gray-900')
    })

    it('has high contrast secondary text in header', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      const description = screen.getByText('Initial planning and requirements gathering')
      expect(description).toHaveClass('text-gray-700')
    })
  })
})

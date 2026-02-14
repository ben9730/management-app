/**
 * PhaseSection Component Tests
 *
 * PhaseSection displays a project phase with its tasks,
 * progress bar, and metadata. Supports collapsible view.
 * Tests reconciled with actual component markup (2026-02-14).
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhaseSection } from './PhaseSection'
import type { ProjectPhase, Task, TeamMember, PhaseLockInfo } from '@/types/entities'

// Mock phase data - use correct ProjectPhase field names
const mockPhase: ProjectPhase = {
  id: 'phase-1',
  project_id: 'proj-1',
  name: 'Planning',
  description: 'Initial planning and requirements gathering',
  phase_order: 0,
  order_index: 0,
  status: 'active',
  start_date: '2026-01-15',
  end_date: '2026-02-15',
  total_tasks: 5,
  completed_tasks: 2,
  task_count: 5,
  completed_task_count: 2,
  created_at: new Date('2026-01-10T10:00:00Z'),
  updated_at: '2026-01-20T14:00:00Z',
} as ProjectPhase

const mockTasks: Task[] = [
  {
    id: 'task-1',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Define scope',
    description: 'Define project scope and objectives',
    status: 'done',
    priority: 'high',
    start_date: '2026-01-15',
    end_date: '2026-01-20',
    duration: 5,
    estimated_hours: 8,
    slack: 0,
    is_critical: false,
    assignee_id: null,
    es: null, ef: null, ls: null, lf: null,
    created_at: new Date('2026-01-10T00:00:00Z'),
    updated_at: '2026-01-20T00:00:00Z',
  } as Task,
  {
    id: 'task-2',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Gather requirements',
    description: 'Gather and document requirements',
    status: 'done',
    priority: 'high',
    start_date: '2026-01-20',
    end_date: '2026-01-25',
    duration: 5,
    estimated_hours: 16,
    slack: 0,
    is_critical: false,
    assignee_id: null,
    es: null, ef: null, ls: null, lf: null,
    created_at: new Date('2026-01-10T00:00:00Z'),
    updated_at: '2026-01-25T00:00:00Z',
  } as Task,
  {
    id: 'task-3',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Create timeline',
    description: 'Create project timeline and milestones',
    status: 'in_progress',
    priority: 'medium',
    start_date: '2026-01-25',
    end_date: '2026-01-30',
    duration: 5,
    estimated_hours: 8,
    slack: 0,
    is_critical: false,
    assignee_id: null,
    es: null, ef: null, ls: null, lf: null,
    created_at: new Date('2026-01-10T00:00:00Z'),
    updated_at: '2026-01-27T00:00:00Z',
  } as Task,
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
    created_at: new Date('2026-01-01T00:00:00Z'),
  } as unknown as TeamMember],
}

describe('PhaseSection', () => {
  describe('Basic Rendering', () => {
    it('renders phase name', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      // Phase name is rendered as "1. Planning" with phase_order+1 prefix
      expect(screen.getByText(/Planning/)).toBeInTheDocument()
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
    it('displays progress percentage derived from tasks array', () => {
      // 2 of 3 tasks are done = 67%
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} />)
      expect(screen.getByText('67%')).toBeInTheDocument()
    })

    it('renders progress bar with correct width', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} />)
      // The progress bar inner div has a style with the percentage width
      const progressBars = document.querySelectorAll('[style*="width"]')
      const found = Array.from(progressBars).some(el => el.getAttribute('style')?.includes('67%'))
      expect(found).toBe(true)
    })

    it('shows 0% when no tasks', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('shows 100% when all tasks completed', () => {
      const allDoneTasks = mockTasks.map(t => ({ ...t, status: 'done' as const }))
      render(<PhaseSection phase={mockPhase} tasks={allDoneTasks} />)
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('shows X/Y task count in header', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} />)
      expect(screen.getByText('2/3')).toBeInTheDocument()
    })
  })

  describe('Status Display', () => {
    it('shows pending status badge', () => {
      const pendingPhase = { ...mockPhase, status: 'pending' as const }
      render(<PhaseSection phase={pendingPhase} tasks={[]} />)
      expect(screen.getByText('PENDING')).toBeInTheDocument()
    })

    it('shows active status badge in Hebrew', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      expect(screen.getByText('פעיל')).toBeInTheDocument()
    })

    it('shows completed status badge in Hebrew', () => {
      const completedPhase = { ...mockPhase, status: 'completed' as const }
      render(<PhaseSection phase={completedPhase} tasks={[]} />)
      expect(screen.getByText('הושלם')).toBeInTheDocument()
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

    it('shows collapse indicator via material icon', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} />)
      // The collapse button uses a material-icons span with 'expand_more'
      expect(screen.getByText('expand_more')).toBeInTheDocument()
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
    it('highlights critical path tasks with right border', () => {
      const criticalPathTaskIds = ['task-1', 'task-3']
      render(
        <PhaseSection
          phase={mockPhase}
          tasks={mockTasks}
          criticalPathTaskIds={criticalPathTaskIds}
        />
      )

      const taskCards = screen.getAllByTestId('task-card')
      // Actual component uses border-r-4 border-emerald-500 for critical path
      expect(taskCards[0]).toHaveClass('border-r-4')
      expect(taskCards[0]).toHaveClass('border-emerald-500')
      expect(taskCards[1]).not.toHaveClass('border-emerald-500')
      expect(taskCards[2]).toHaveClass('border-r-4')
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

      // TaskCard shows initials via AvatarStack
      expect(screen.getByText('JD')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no tasks in Hebrew', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      expect(screen.getByText('אין משימות בשלב זה')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} className="custom-class" />)
      expect(screen.getByTestId('phase-section')).toHaveClass('custom-class')
    })

    it('applies completed phase border color class', () => {
      const completedPhase = { ...mockPhase, status: 'completed' as const }
      render(<PhaseSection phase={completedPhase} tasks={[]} />)
      const section = screen.getByTestId('phase-section')
      expect(section).toHaveClass('border-emerald-500')
    })

    it('applies active phase border color class', () => {
      render(<PhaseSection phase={mockPhase} tasks={[]} />)
      const section = screen.getByTestId('phase-section')
      expect(section).toHaveClass('border-indigo-500')
    })

    it('applies pending phase opacity', () => {
      const pendingPhase = { ...mockPhase, status: 'pending' as const }
      render(<PhaseSection phase={pendingPhase} tasks={[]} />)
      const section = screen.getByTestId('phase-section')
      expect(section).toHaveClass('opacity-70')
    })
  })

  describe('Lock State', () => {
    const lockInfo: PhaseLockInfo = {
      phaseId: 'phase-1',
      isLocked: true,
      reason: 'previous_phase_incomplete',
      blockedByPhaseId: 'phase-0',
      blockedByPhaseName: 'Previous Phase',
    }

    it('shows lock icon when phase is locked', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} isLocked={true} lockInfo={lockInfo} />)
      expect(screen.getByTestId('lock-indicator')).toBeInTheDocument()
    })

    it('does not show lock icon when phase is unlocked', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} isLocked={false} />)
      expect(screen.queryByTestId('lock-indicator')).not.toBeInTheDocument()
    })

    it('disables add task button when locked', () => {
      const handleAddTask = vi.fn()
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} isLocked={true} lockInfo={lockInfo} onAddTask={handleAddTask} />)
      const addButton = screen.getByTestId('add-task-button')
      expect(addButton).toBeDisabled()
      fireEvent.click(addButton)
      expect(handleAddTask).not.toHaveBeenCalled()
    })

    it('applies pointer-events-none to task content when locked', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} isLocked={true} lockInfo={lockInfo} />)
      const content = screen.getByTestId('phase-content')
      expect(content).toHaveClass('pointer-events-none')
      expect(content).toHaveClass('opacity-50')
    })

    it('sets aria-disabled on task content when locked', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} isLocked={true} lockInfo={lockInfo} />)
      const content = screen.getByTestId('phase-content')
      expect(content).toHaveAttribute('aria-disabled', 'true')
    })

    it('still allows accordion toggle when locked', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} isLocked={true} lockInfo={lockInfo} />)
      // Tasks visible initially
      expect(screen.getByText('Define scope')).toBeInTheDocument()
      // Click header to collapse
      fireEvent.click(screen.getByTestId('phase-header'))
      // Tasks should be hidden
      expect(screen.queryByText('Define scope')).not.toBeInTheDocument()
    })

    it('does not apply lock styling when unlocked', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} isLocked={false} />)
      const content = screen.getByTestId('phase-content')
      expect(content).not.toHaveClass('pointer-events-none')
    })

    it('sets section title with lock reason when locked', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} isLocked={true} lockInfo={lockInfo} />)
      const section = screen.getByTestId('phase-section')
      expect(section).toHaveAttribute('title', 'חסום - יש להשלים את "Previous Phase" קודם')
    })

    it('does not set section title when unlocked', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} isLocked={false} />)
      const section = screen.getByTestId('phase-section')
      expect(section).not.toHaveAttribute('title')
    })

    it('sets tabIndex -1 on content when locked', () => {
      render(<PhaseSection phase={mockPhase} tasks={mockTasks} isLocked={true} lockInfo={lockInfo} />)
      const content = screen.getByTestId('phase-content')
      expect(content).toHaveAttribute('tabindex', '-1')
    })
  })
})

/**
 * TaskCard Component Tests (TDD)
 *
 * TaskCard displays individual tasks with priority, assignee,
 * slack value, and critical path indicator.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskCard } from './TaskCard'
import type { Task, TeamMember } from '@/types/entities'

// Mock task data
const mockTask: Task = {
  id: 'task-1',
  project_id: 'proj-1',
  phase_id: 'phase-1',
  title: 'Review audit documentation',
  description: 'Review all audit documentation for completeness',
  task_type: 'task',
  status: 'in_progress',
  priority: 'high',
  start_date: '2026-01-20',
  due_date: '2026-01-28',
  estimated_hours: 8,
  actual_hours: 4,
  progress_percent: 50,
  wbs_number: '1.2.1',
  order_index: 1,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-20T14:00:00Z',
}

const mockAssignee: TeamMember = {
  id: 'member-1',
  organization_id: 'org-1',
  user_id: 'user-1',
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'auditor',
  employment_type: 'full_time',
  weekly_capacity_hours: 40,
  work_days: [0, 1, 2, 3, 4],
  hourly_rate: 100,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

describe('TaskCard', () => {
  describe('Basic Rendering', () => {
    it('renders task title', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText('Review audit documentation')).toBeInTheDocument()
    })

    it('renders task WBS number when provided', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText('1.2.1')).toBeInTheDocument()
    })

    it('does not render WBS number when not provided', () => {
      const taskWithoutWbs = { ...mockTask, wbs_number: null }
      render(<TaskCard task={taskWithoutWbs} />)
      expect(screen.queryByText('1.2.1')).not.toBeInTheDocument()
    })
  })

  describe('Priority Display', () => {
    it('renders critical priority badge', () => {
      const criticalTask = { ...mockTask, priority: 'critical' as const }
      render(<TaskCard task={criticalTask} />)
      expect(screen.getByText('CRITICAL')).toBeInTheDocument()
    })

    it('renders high priority badge', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText('HIGH')).toBeInTheDocument()
    })

    it('renders medium priority badge', () => {
      const mediumTask = { ...mockTask, priority: 'medium' as const }
      render(<TaskCard task={mediumTask} />)
      expect(screen.getByText('MEDIUM')).toBeInTheDocument()
    })

    it('renders low priority badge', () => {
      const lowTask = { ...mockTask, priority: 'low' as const }
      render(<TaskCard task={lowTask} />)
      expect(screen.getByText('LOW')).toBeInTheDocument()
    })

    it('applies correct styling for critical priority', () => {
      const criticalTask = { ...mockTask, priority: 'critical' as const }
      render(<TaskCard task={criticalTask} />)
      const badge = screen.getByText('CRITICAL')
      // Check style attribute directly to verify CSS variable usage
      expect(badge.getAttribute('style')).toContain('background-color: var(--fp-status-error)')
    })
  })

  describe('Critical Path Indicator', () => {
    it('shows filled indicator when on critical path', () => {
      render(<TaskCard task={mockTask} isCriticalPath />)
      expect(screen.getByTestId('critical-path-indicator')).toHaveTextContent('■')
    })

    it('shows empty indicator when not on critical path', () => {
      render(<TaskCard task={mockTask} isCriticalPath={false} />)
      expect(screen.getByTestId('critical-path-indicator')).toHaveTextContent('□')
    })

    it('defaults to not critical path when prop not provided', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByTestId('critical-path-indicator')).toHaveTextContent('□')
    })
  })

  describe('Slack Display', () => {
    it('displays slack value in days', () => {
      render(<TaskCard task={mockTask} slack={3} />)
      expect(screen.getByText('3 days slack')).toBeInTheDocument()
    })

    it('displays singular day for slack of 1', () => {
      render(<TaskCard task={mockTask} slack={1} />)
      expect(screen.getByText('1 day slack')).toBeInTheDocument()
    })

    it('displays 0 days slack for critical path tasks', () => {
      render(<TaskCard task={mockTask} slack={0} isCriticalPath />)
      expect(screen.getByText('0 days slack')).toBeInTheDocument()
    })

    it('does not display slack when not provided', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.queryByText(/slack/)).not.toBeInTheDocument()
    })
  })

  describe('Assignee Display', () => {
    it('displays assignee name in tooltip when provided', () => {
      render(<TaskCard task={mockTask} assignee={mockAssignee} />)
      // Name is now in title attribute of the avatar element itself
      const avatar = screen.getByText('JD')
      expect(avatar).toHaveAttribute('title', 'John Doe')
    })

    it('displays assignee initials in avatar', () => {
      render(<TaskCard task={mockTask} assignee={mockAssignee} />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('shows unassigned text when no assignee', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText('Unassigned')).toBeInTheDocument()
    })
  })

  describe('Due Date Display', () => {
    it('displays due date when provided', () => {
      render(<TaskCard task={mockTask} />)
      // Date format is DD/MM/YYYY for Hebrew locale
      expect(screen.getByText(/28.*01.*2026/)).toBeInTheDocument()
    })

    it('shows no date indicator when due_date is null', () => {
      const taskWithoutDue = { ...mockTask, due_date: null }
      render(<TaskCard task={taskWithoutDue} />)
      expect(screen.getByText('No due date')).toBeInTheDocument()
    })

    it('shows overdue styling when task is past due', () => {
      const overdueTask = { ...mockTask, due_date: '2026-01-01' }
      render(<TaskCard task={overdueTask} />)
      expect(screen.getByTestId('due-date')).toHaveClass('text-[var(--fp-status-error)]')
    })
  })

  describe('Progress Display', () => {
    it('displays progress bar', () => {
      render(<TaskCard task={mockTask} showProgress />)
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveStyle({ width: '50%' })
    })

    it('does not show progress when showProgress is false', () => {
      render(<TaskCard task={mockTask} showProgress={false} />)
      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument()
    })
  })

  describe('Status Display', () => {
    it('displays in_progress status badge', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onClick when card is clicked', () => {
      const handleClick = vi.fn()
      render(<TaskCard task={mockTask} onClick={handleClick} />)

      fireEvent.click(screen.getByTestId('task-card'))

      expect(handleClick).toHaveBeenCalledWith(mockTask)
    })

    it('calls onStatusChange when status checkbox is clicked', () => {
      const handleStatusChange = vi.fn()
      render(<TaskCard task={mockTask} onStatusChange={handleStatusChange} />)

      fireEvent.click(screen.getByTestId('status-checkbox'))

      expect(handleStatusChange).toHaveBeenCalledWith(mockTask.id, 'done')
    })

    it('changes status from done to pending when checkbox clicked', () => {
      const doneTask = { ...mockTask, status: 'done' as const }
      const handleStatusChange = vi.fn()
      render(<TaskCard task={doneTask} onStatusChange={handleStatusChange} />)

      fireEvent.click(screen.getByTestId('status-checkbox'))

      expect(handleStatusChange).toHaveBeenCalledWith(doneTask.id, 'pending')
    })
  })

  describe('Task Types', () => {
    it('shows milestone icon for milestone type', () => {
      const milestoneTask = { ...mockTask, task_type: 'milestone' as const }
      render(<TaskCard task={milestoneTask} />)
      expect(screen.getByTestId('task-type-icon')).toHaveAttribute('data-type', 'milestone')
    })

    it('shows task icon for regular task', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByTestId('task-type-icon')).toHaveAttribute('data-type', 'task')
    })
  })

  describe('Compact Mode', () => {
    it('renders in compact mode with less details', () => {
      render(<TaskCard task={mockTask} compact />)
      // In compact mode, description should not be visible
      expect(screen.queryByText(mockTask.description!)).not.toBeInTheDocument()
    })

    it('still shows essential info in compact mode', () => {
      render(<TaskCard task={mockTask} compact assignee={mockAssignee} />)
      expect(screen.getByText('Review audit documentation')).toBeInTheDocument()
      expect(screen.getByText('HIGH')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA role', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('has accessible name from task title', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByRole('article')).toHaveAccessibleName(/Review audit documentation/)
    })

    it('status checkbox has accessible label', () => {
      render(<TaskCard task={mockTask} onStatusChange={vi.fn()} />)
      expect(screen.getByTestId('status-checkbox')).toHaveAccessibleName(/Mark task/)
    })
  })

  it('applies custom className', () => {
    render(<TaskCard task={mockTask} className="custom-class" />)
    expect(screen.getByTestId('task-card')).toHaveClass('custom-class')
  })

  it('renders as a row with bottom border', () => {
    render(<TaskCard task={mockTask} />)
    const card = screen.getByTestId('task-card')
    expect(card).toHaveClass('border-b')
    // Check specific custom border class by attribute to avoid JSDOM parsing issues
    expect(card.className).toContain('border-[var(--fp-border-light)]')
    expect(card).not.toHaveClass('border-2', 'border-black')
  })

  it('highlights critical path with left border strip', () => {
    render(<TaskCard task={mockTask} isCriticalPath />)
    const card = screen.getByTestId('task-card')
    // Check style attribute directly
    expect(card.getAttribute('style')).toContain('border-left-color: var(--fp-critical)')
    expect(card).toHaveClass('border-l-4')
  })

})


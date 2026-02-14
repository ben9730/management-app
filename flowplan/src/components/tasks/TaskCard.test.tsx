/**
 * TaskCard Component Tests
 *
 * TaskCard displays individual tasks with priority, assignee,
 * and critical path indicator.
 * Tests reconciled with actual component markup (2026-02-14).
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskCard } from './TaskCard'
import type { Task, TeamMember } from '@/types/entities'

// Mock task data - use correct Task field names
const mockTask: Task = {
  id: 'task-1',
  project_id: 'proj-1',
  phase_id: 'phase-1',
  title: 'Review audit documentation',
  description: 'Review all audit documentation for completeness',
  status: 'in_progress',
  priority: 'high',
  start_date: '2026-01-20',
  end_date: '2026-01-28',
  duration: 8,
  estimated_hours: 8,
  slack: 0,
  is_critical: false,
  assignee_id: null,
  es: null, ef: null, ls: null, lf: null,
  created_at: new Date('2026-01-15T10:00:00Z'),
  updated_at: '2026-01-20T14:00:00Z',
} as Task

const mockAssignees: TeamMember[] = [{
  id: 'member-1',
  organization_id: 'org-1',
  user_id: 'user-1',
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'member',
  employment_type: 'full_time',
  weekly_capacity_hours: 40,
  work_days: [0, 1, 2, 3, 4],
  hourly_rate: 100,
  is_active: true,
  created_at: new Date('2026-01-01T00:00:00Z'),
} as unknown as TeamMember]

describe('TaskCard', () => {
  describe('Basic Rendering', () => {
    it('renders task title', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText('Review audit documentation')).toBeInTheDocument()
    })

    it('renders task description', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText('Review all audit documentation for completeness')).toBeInTheDocument()
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
  })

  describe('Assignee Display', () => {
    it('displays assignee initials in avatar via assignees prop', () => {
      render(<TaskCard task={mockTask} assignees={mockAssignees} />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('shows placeholder when no assignee', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText('?')).toBeInTheDocument()
    })
  })

  describe('Status Display', () => {
    it('shows Hebrew status for done tasks', () => {
      const doneTask = { ...mockTask, status: 'done' as const }
      render(<TaskCard task={doneTask} />)
      expect(screen.getByText('הושלם')).toBeInTheDocument()
    })

    it('shows Hebrew status for in_progress tasks', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText('בתהליך')).toBeInTheDocument()
    })

    it('shows Hebrew status for pending tasks', () => {
      const pendingTask = { ...mockTask, status: 'pending' as const }
      render(<TaskCard task={pendingTask} />)
      expect(screen.getByText('ממתין')).toBeInTheDocument()
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
      expect(handleStatusChange).toHaveBeenCalledWith('task-1', 'done')
    })

    it('toggles status back to pending when done task checkbox is clicked', () => {
      const handleStatusChange = vi.fn()
      const doneTask = { ...mockTask, status: 'done' as const }
      render(<TaskCard task={doneTask} onStatusChange={handleStatusChange} />)
      fireEvent.click(screen.getByTestId('status-checkbox'))
      expect(handleStatusChange).toHaveBeenCalledWith('task-1', 'pending')
    })

    it('shows a check icon when task is done', () => {
      const doneTask = { ...mockTask, status: 'done' as const }
      render(<TaskCard task={doneTask} />)
      const checkbox = screen.getByTestId('status-checkbox')
      // Uses material-icons span with 'check' text
      expect(checkbox.querySelector('.material-icons')).toBeTruthy()
    })
  })

  describe('Styling and Contrast', () => {
    it('highlights critical path with right border', () => {
      render(<TaskCard task={mockTask} isCriticalPath />)
      const card = screen.getByTestId('task-card')
      expect(card).toHaveClass('border-r-4')
      expect(card).toHaveClass('border-emerald-500')
    })

    it('does not have critical path border when not on critical path', () => {
      render(<TaskCard task={mockTask} />)
      const card = screen.getByTestId('task-card')
      expect(card).not.toHaveClass('border-emerald-500')
    })

    it('applies line-through to done task titles', () => {
      const doneTask = { ...mockTask, status: 'done' as const }
      render(<TaskCard task={doneTask} />)
      const title = screen.getByText('Review audit documentation')
      expect(title).toHaveClass('line-through')
    })

    it('has task-card testid on root element', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByTestId('task-card')).toBeInTheDocument()
    })
  })
})

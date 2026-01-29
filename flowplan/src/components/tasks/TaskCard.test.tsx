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
} as unknown as Task

const mockAssignee: TeamMember = {
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
  created_at: '2026-01-01T00:00:00Z',
} as unknown as TeamMember

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
  })

  describe('Slack Display', () => {
    it('displays slack value in days', () => {
      render(<TaskCard task={mockTask} slack={3} />)
      expect(screen.getByText('3 days slack')).toBeInTheDocument()
    })
  })

  describe('Assignee Display', () => {
    it('displays assignee initials in avatar', () => {
      render(<TaskCard task={mockTask} assignee={mockAssignee} />)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })
  })

  describe('Due Date Display', () => {
    it('displays due date when provided', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText(/28.*01.*2026/)).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onClick when card is clicked', () => {
      const handleClick = vi.fn()
      render(<TaskCard task={mockTask} onClick={handleClick} />)
      fireEvent.click(screen.getByTestId('task-card'))
      expect(handleClick).toHaveBeenCalled()
    })

    it('calls onStatusChange when status checkbox is clicked', () => {
      const handleStatusChange = vi.fn()
      render(<TaskCard task={mockTask} onStatusChange={handleStatusChange} />)
      fireEvent.click(screen.getByTestId('status-checkbox'))
      expect(handleStatusChange).toHaveBeenCalled()
    })

    it('shows a check icon when task is done', () => {
      const doneTask = { ...mockTask, status: 'done' as const }
      render(<TaskCard task={doneTask} />)
      const checkbox = screen.getByTestId('status-checkbox')
      expect(checkbox.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Styling and Contrast', () => {
    it('highlights critical path with left border strip', () => {
      render(<TaskCard task={mockTask} isCriticalPath />)
      const card = screen.getByTestId('task-card')
      expect(card.getAttribute('style')).toContain('border-left-color: var(--fp-critical)')
      expect(card).toHaveClass('border-l-8')
    })

    it('has high contrast title text', () => {
      render(<TaskCard task={mockTask} />)
      const title = screen.getByText('Review audit documentation')
      expect(title).toHaveClass('text-gray-900', 'font-bold')
    })

    it('has high contrast secondary text', () => {
      render(<TaskCard task={mockTask} />)
      const description = screen.getByText('Review all audit documentation for completeness')
      expect(description).toHaveClass('text-gray-700')
    })

    it('has high contrast date text', () => {
      render(<TaskCard task={mockTask} />)
      const date = screen.getByTestId('due-date')
      expect(date).toHaveClass('text-gray-800')
    })

    it('has brutalist border and shadow', () => {
      render(<TaskCard task={mockTask} />)
      const card = screen.getByTestId('task-card')
      expect(card).toHaveClass('border-2')
      expect(card).toHaveClass('border-gray-900')
      expect(card).toHaveClass('shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]')
    })
  })
})

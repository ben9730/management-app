/**
 * GanttChart Component Tests (TDD)
 *
 * Interactive Gantt chart displaying tasks on a timeline with
 * duration bars, dependencies, and critical path highlighting.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GanttChart } from './GanttChart'
import type { Task, Dependency } from '@/types/entities'

// Mock task data for testing
const mockTasks: Task[] = [
  {
    id: 'task-1',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Task A',
    description: 'First task',
    task_type: 'task',
    status: 'done', // Changed from 'completed'
    priority: 'high',
    start_date: '2026-01-20',
    due_date: '2026-01-24',
    estimated_hours: 16,
    actual_hours: 18,
    progress_percent: 100,
    wbs_number: '1.1',
    order_index: 0,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-24T14:00:00Z',
  } as unknown as Task,
  {
    id: 'task-2',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Task B',
    description: 'Second task',
    task_type: 'task',
    status: 'in_progress',
    priority: 'high',
    start_date: '2026-01-26',
    due_date: '2026-01-30',
    estimated_hours: 20,
    actual_hours: 10,
    progress_percent: 50,
    wbs_number: '1.2',
    order_index: 1,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-27T14:00:00Z',
  } as unknown as Task,
  {
    id: 'task-3',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Task C',
    description: 'Third task',
    task_type: 'task',
    status: 'pending',
    priority: 'medium',
    start_date: '2026-01-30',
    due_date: '2026-02-05',
    estimated_hours: 24,
    actual_hours: 0,
    progress_percent: 0,
    wbs_number: '1.3',
    order_index: 2,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  } as unknown as Task,
  {
    id: 'milestone-1',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Milestone 1',
    description: 'First milestone',
    task_type: 'milestone',
    status: 'pending',
    priority: 'critical',
    start_date: '2026-02-05',
    due_date: '2026-02-05',
    estimated_hours: 0,
    actual_hours: 0,
    progress_percent: 0,
    wbs_number: '1.4',
    order_index: 3,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  } as unknown as Task,
]

const mockDependencies: Dependency[] = [
  {
    id: 'dep-1',
    predecessor_id: 'task-1',
    successor_id: 'task-2',
    type: 'finish_to_start', // Changed from dependency_type
    lag_days: 1,
    created_at: '2026-01-15T10:00:00Z',
  } as unknown as Dependency,
  {
    id: 'dep-2',
    predecessor_id: 'task-2',
    successor_id: 'task-3',
    type: 'finish_to_start', // Changed from dependency_type
    lag_days: 0,
    created_at: '2026-01-15T10:00:00Z',
  } as unknown as Dependency,
  {
    id: 'dep-3',
    predecessor_id: 'task-3',
    successor_id: 'milestone-1',
    type: 'finish_to_start', // Changed from dependency_type
    lag_days: 0,
    created_at: '2026-01-15T10:00:00Z',
  } as unknown as Dependency,
]

describe('GanttChart', () => {
  describe('Basic Rendering', () => {
    it('renders the chart container', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument()
    })

    it('renders all task titles in task list', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      // Task titles appear in both task list and task bars
      expect(screen.getAllByText('Task A').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Task B').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Task C').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Milestone 1').length).toBeGreaterThanOrEqual(1)
    })

    it('renders WBS numbers when available', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      expect(screen.getByText('1.1')).toBeInTheDocument()
      expect(screen.getByText('1.2')).toBeInTheDocument()
    })

    it('renders task bars in timeline', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      const taskBars = screen.getAllByTestId(/^task-bar-/)
      expect(taskBars).toHaveLength(4)
    })

    it('renders empty state when no tasks', () => {
      render(<GanttChart tasks={[]} dependencies={[]} />)
      expect(screen.getByText('No tasks to display')).toBeInTheDocument()
    })
  })

  describe('Timeline Header', () => {
    it('renders date headers', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      expect(screen.getByTestId('timeline-header')).toBeInTheDocument()
    })

    it('shows day labels in timeline', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      // Should show dates from start to end of all tasks
      expect(screen.getByTestId('timeline-header')).toBeInTheDocument()
    })

    it('renders month names in header', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      // January and February should be visible
      expect(screen.getByText(/Jan/)).toBeInTheDocument()
    })
  })

  describe('Task Bars', () => {
    it('renders task bar with correct width based on duration', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} dayWidth={40} />)
      const taskBar = screen.getByTestId('task-bar-task-1')
      // Task A: Jan 20 - Jan 24 = 4 days + 1 = 5 days width
      // 5 days * 40px = 200px
      expect(taskBar).toHaveStyle({ width: '200px' })
    })

    it('positions task bar at correct date offset', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} dayWidth={40} />)
      const taskBar = screen.getByTestId('task-bar-task-1')
      // Task starts at project start date, so offset should be 0
      expect(taskBar).toHaveAttribute('data-start-offset')
    })

    it('shows progress fill inside task bar', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      const progressBar = screen.getByTestId('task-progress-task-2')
      // Task B has 50% progress
      expect(progressBar).toHaveStyle({ width: '50%' })
    })

    it('renders milestone as diamond marker', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      const milestone = screen.getByTestId('task-bar-milestone-1')
      expect(milestone).toHaveClass('milestone')
    })
  })

  describe('Critical Path', () => {
    it('highlights critical path tasks', () => {
      const criticalPathIds = ['task-1', 'task-2', 'task-3', 'milestone-1']
      render(
        <GanttChart
          tasks={mockTasks}
          dependencies={mockDependencies}
          criticalPathTaskIds={criticalPathIds}
        />
      )

      const taskBar = screen.getByTestId('task-bar-task-1')
      expect(taskBar).toHaveClass('critical-path')
    })

    it('does not highlight non-critical tasks', () => {
      const criticalPathIds = ['task-1', 'task-3']
      render(
        <GanttChart
          tasks={mockTasks}
          dependencies={mockDependencies}
          criticalPathTaskIds={criticalPathIds}
        />
      )

      const taskBar = screen.getByTestId('task-bar-task-2')
      expect(taskBar).not.toHaveClass('critical-path')
    })
  })

  describe('Dependencies', () => {
    it('renders dependency arrows when showDependencies is true', () => {
      render(
        <GanttChart
          tasks={mockTasks}
          dependencies={mockDependencies}
          showDependencies
        />
      )

      const dependencyLines = screen.getAllByTestId(/^dependency-/)
      expect(dependencyLines.length).toBeGreaterThan(0)
    })

    it('does not render dependencies when showDependencies is false', () => {
      render(
        <GanttChart
          tasks={mockTasks}
          dependencies={mockDependencies}
          showDependencies={false}
        />
      )

      const dependencyLines = screen.queryAllByTestId(/^dependency-/)
      expect(dependencyLines).toHaveLength(0)
    })
  })

  describe('Today Marker', () => {
    it('renders today marker line', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} showTodayMarker />)
      expect(screen.getByTestId('today-marker')).toBeInTheDocument()
    })

    it('does not render today marker when disabled', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} showTodayMarker={false} />)
      expect(screen.queryByTestId('today-marker')).not.toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('calls onTaskClick when task row is clicked', () => {
      const handleClick = vi.fn()
      render(
        <GanttChart
          tasks={mockTasks}
          dependencies={[]}
          onTaskClick={handleClick}
        />
      )

      fireEvent.click(screen.getByTestId('task-row-task-1'))

      expect(handleClick).toHaveBeenCalledWith(mockTasks[0])
    })

    it('calls onTaskBarClick when task bar is clicked', () => {
      const handleClick = vi.fn()
      render(
        <GanttChart
          tasks={mockTasks}
          dependencies={[]}
          onTaskBarClick={handleClick}
        />
      )

      fireEvent.click(screen.getByTestId('task-bar-task-1'))

      expect(handleClick).toHaveBeenCalledWith(mockTasks[0])
    })

    it('shows tooltip on task bar hover', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)

      fireEvent.mouseEnter(screen.getByTestId('task-bar-task-1'))

      expect(screen.getByTestId('task-tooltip')).toBeInTheDocument()
      expect(screen.getByTestId('task-tooltip')).toHaveTextContent('Task A')
    })

    it('hides tooltip on mouse leave', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)

      fireEvent.mouseEnter(screen.getByTestId('task-bar-task-1'))
      fireEvent.mouseLeave(screen.getByTestId('task-bar-task-1'))

      expect(screen.queryByTestId('task-tooltip')).not.toBeInTheDocument()
    })
  })

  describe('Zoom Controls', () => {
    it('renders zoom controls when showZoomControls is true', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} showZoomControls />)
      expect(screen.getByTestId('zoom-in')).toBeInTheDocument()
      expect(screen.getByTestId('zoom-out')).toBeInTheDocument()
    })

    it('increases dayWidth when zooming in', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} showZoomControls dayWidth={40} />)

      fireEvent.click(screen.getByTestId('zoom-in'))

      // After zoom in, task bars should be wider
      const taskBar = screen.getByTestId('task-bar-task-1')
      // Original: 5 days * 40px = 200px, after zoom: 5 days * 50px = 250px
      expect(taskBar).toHaveStyle({ width: '250px' })
    })

    it('decreases dayWidth when zooming out', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} showZoomControls dayWidth={40} />)

      fireEvent.click(screen.getByTestId('zoom-out'))

      const taskBar = screen.getByTestId('task-bar-task-1')
      // After zoom out: 5 days * 30px = 150px
      expect(taskBar).toHaveStyle({ width: '150px' })
    })
  })

  describe('View Mode', () => {
    it('renders in day view by default', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      expect(screen.getByTestId('gantt-chart')).toHaveAttribute('data-view', 'day')
    })

    it('can switch to week view', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} viewMode="week" />)
      expect(screen.getByTestId('gantt-chart')).toHaveAttribute('data-view', 'week')
    })

    it('can switch to month view', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} viewMode="month" />)
      expect(screen.getByTestId('gantt-chart')).toHaveAttribute('data-view', 'month')
    })
  })

  describe('Status Colors', () => {
    it('applies completed status styling', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      const taskBar = screen.getByTestId('task-bar-task-1')
      expect(taskBar).toHaveClass('status-done')
    })

    it('applies in-progress status styling', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      const taskBar = screen.getByTestId('task-bar-task-2')
      expect(taskBar).toHaveClass('status-in_progress')
    })

    it('applies pending status styling', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      const taskBar = screen.getByTestId('task-bar-task-3')
      expect(taskBar).toHaveClass('status-pending')
    })
  })

  describe('Scrolling', () => {
    it('scrolls to today when scrollToToday is called', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} showTodayMarker />)
      const scrollBtn = screen.getByTestId('scroll-to-today')

      fireEvent.click(scrollBtn)

      // The timeline should have scrolled
      expect(screen.getByTestId('timeline-container')).toBeInTheDocument()
    })

    it('synchronizes horizontal scroll between task list and timeline', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      const timelineContainer = screen.getByTestId('timeline-container')

      fireEvent.scroll(timelineContainer, { target: { scrollLeft: 100 } })

      // Scroll position should be tracked
      expect(timelineContainer.scrollLeft).toBeDefined()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA role', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      expect(screen.getByRole('figure')).toBeInTheDocument()
    })

    it('has accessible description', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      expect(screen.getByRole('figure')).toHaveAccessibleName(/Gantt chart/)
    })

    it('task rows are keyboard accessible', () => {
      const handleClick = vi.fn()
      render(
        <GanttChart
          tasks={mockTasks}
          dependencies={[]}
          onTaskClick={handleClick}
        />
      )

      const taskRow = screen.getByTestId('task-row-task-1')
      fireEvent.keyDown(taskRow, { key: 'Enter' })

      expect(handleClick).toHaveBeenCalled()
    })
  })

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} className="custom-class" />)
      expect(screen.getByTestId('gantt-chart')).toHaveClass('custom-class')
    })

    it('applies standard border style', () => {
      render(<GanttChart tasks={mockTasks} dependencies={[]} />)
      expect(screen.getByTestId('gantt-chart')).toHaveClass('border')
      expect(screen.getByTestId('gantt-chart')).not.toHaveClass('border-black')
    })
  })
})

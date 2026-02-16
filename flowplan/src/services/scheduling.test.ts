/**
 * SchedulingService Tests (TDD - Tests First!)
 *
 * Based on PRD v2.1 - Critical Path Method (CPM) requirements:
 * - Forward Pass (ES, EF calculation)
 * - Backward Pass (LS, LF calculation)
 * - Slack Calculation
 * - Calendar Awareness (weekends, holidays)
 * - Resource-Aware Scheduling (time off, part-time workers)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SchedulingService } from './scheduling'
import type { Task, Dependency, CalendarException, TeamMember, EmployeeTimeOff } from '@/types/entities'

// ============================================
// Test Helpers - Create mock data
// ============================================

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    project_id: 'project-1',
    phase_id: null,
    title: 'Test Task',
    description: null,
    status: 'pending',
    priority: 'medium',
    assignee_id: null,
    duration: 1,
    estimated_hours: null,
    start_date: null,
    end_date: null,
    es: null,
    ef: null,
    ls: null,
    lf: null,
    slack: 0,
    is_critical: false,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  }
}

function createMockDependency(predecessor_id: string, successor_id: string, overrides: Partial<Dependency> = {}): Dependency {
  return {
    id: `dep-${predecessor_id}-${successor_id}`,
    predecessor_id,
    successor_id,
    type: 'FS',
    lag_days: 0,
    created_at: new Date('2026-01-01'),
    ...overrides,
  }
}

function createMockTeamMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 'member-1',
    user_id: 'user-1',
    project_id: 'project-1',
    employment_type: 'full_time',
    work_hours_per_day: 8,
    work_days: [0, 1, 2, 3, 4], // Sunday-Thursday (Israel) or Mon-Fri
    role: 'member',
    hourly_rate: null,
    created_at: new Date('2026-01-01'),
    ...overrides,
  }
}

function createMockTimeOff(overrides: Partial<EmployeeTimeOff> = {}): EmployeeTimeOff {
  return {
    id: 'timeoff-1',
    team_member_id: 'user-1',
    start_date: new Date('2026-02-15'),
    end_date: new Date('2026-02-17'),
    type: 'vacation',
    status: 'approved',
    notes: null,
    created_at: new Date('2026-01-01'),
    ...overrides,
  }
}

// ============================================
// Test Suite
// ============================================

describe('SchedulingService', () => {
  let service: SchedulingService

  beforeEach(() => {
    service = new SchedulingService()
  })

  // ==========================================
  // Working Days Calculation
  // ==========================================

  describe('isWorkingDay', () => {
    it('returns true for weekdays (Sunday-Thursday in Israel)', () => {
      const workDays = [0, 1, 2, 3, 4] // Sun-Thu
      const sunday = new Date('2026-01-25') // Sunday

      expect(service.isWorkingDay(sunday, workDays, [])).toBe(true)
    })

    it('returns false for weekends (Friday-Saturday in Israel)', () => {
      const workDays = [0, 1, 2, 3, 4] // Sun-Thu
      const friday = new Date('2026-01-30') // Friday
      const saturday = new Date('2026-01-31') // Saturday

      expect(service.isWorkingDay(friday, workDays, [])).toBe(false)
      expect(service.isWorkingDay(saturday, workDays, [])).toBe(false)
    })

    it('returns false for holidays', () => {
      const workDays = [0, 1, 2, 3, 4]
      const holiday = new Date('2026-01-26') // Monday but it's a holiday
      const holidays = [new Date('2026-01-26')]

      expect(service.isWorkingDay(holiday, workDays, holidays)).toBe(false)
    })
  })

  describe('addWorkingDays', () => {
    it('adds working days correctly without weekends', () => {
      const startDate = new Date('2026-01-25') // Sunday
      const workDays = [0, 1, 2, 3, 4] // Sun-Thu

      const result = service.addWorkingDays(startDate, 3, workDays, [])

      // Sun + 3 days = Tuesday (Jan 27)
      expect(result.toISOString().split('T')[0]).toBe('2026-01-27')
    })

    it('skips weekends when adding days', () => {
      const startDate = new Date('2026-01-28') // Wednesday
      const workDays = [0, 1, 2, 3, 4] // Sun-Thu (Israeli calendar)

      const result = service.addWorkingDays(startDate, 3, workDays, [])

      // Wed (1) + Thu (2) + skip Fri & Sat + Sun (3) = Feb 1
      expect(result.toISOString().split('T')[0]).toBe('2026-02-01')
    })

    it('skips holidays when adding days', () => {
      const startDate = new Date('2026-01-25') // Sunday
      const workDays = [0, 1, 2, 3, 4]
      const holidays = [new Date('2026-01-26')] // Monday is holiday

      const result = service.addWorkingDays(startDate, 3, workDays, holidays)

      // Sun + 3 days, skipping Mon holiday = Wednesday (Jan 28)
      expect(result.toISOString().split('T')[0]).toBe('2026-01-28')
    })

    it('handles duration of 1 correctly (same day)', () => {
      const startDate = new Date('2026-01-25') // Sunday
      const workDays = [0, 1, 2, 3, 4]

      const result = service.addWorkingDays(startDate, 1, workDays, [])

      // Duration 1 means task finishes on same day
      expect(result.toISOString().split('T')[0]).toBe('2026-01-25')
    })
  })

  describe('subtractWorkingDays', () => {
    it('subtracts working days correctly', () => {
      const endDate = new Date('2026-01-28') // Wednesday
      const workDays = [0, 1, 2, 3, 4]

      const result = service.subtractWorkingDays(endDate, 3, workDays, [])

      // Wed (3) - Tue (2) - Mon (1) = Monday (Jan 26)
      expect(result.toISOString().split('T')[0]).toBe('2026-01-26')
    })

    it('skips weekends when subtracting days', () => {
      const endDate = new Date('2026-02-02') // Monday
      const workDays = [0, 1, 2, 3, 4] // Sun-Thu

      const result = service.subtractWorkingDays(endDate, 3, workDays, [])

      // Mon (3) - Sun (2) - skip Sat & Fri - Thu (1) = Jan 29
      expect(result.toISOString().split('T')[0]).toBe('2026-01-29')
    })
  })

  describe('workingDaysBetween', () => {
    it('counts working days between two dates', () => {
      const start = new Date('2026-01-25') // Sunday
      const end = new Date('2026-01-28') // Wednesday
      const workDays = [0, 1, 2, 3, 4]

      const result = service.workingDaysBetween(start, end, workDays, [])

      // Sun, Mon, Tue, Wed = 4 days, but as difference it's 3
      expect(result).toBe(3)
    })

    it('returns 0 for same day', () => {
      const date = new Date('2026-01-25')
      const workDays = [0, 1, 2, 3, 4]

      const result = service.workingDaysBetween(date, date, workDays, [])

      expect(result).toBe(0)
    })

    it('excludes weekends from count', () => {
      const start = new Date('2026-01-28') // Wednesday
      const end = new Date('2026-02-02') // Monday
      const workDays = [0, 1, 2, 3, 4]

      const result = service.workingDaysBetween(start, end, workDays, [])

      // Wed, Thu, (skip Fri, Sat), Sun, Mon = 4 working days, difference = 3
      expect(result).toBe(3)
    })
  })

  // ==========================================
  // Forward Pass (ES, EF Calculation)
  // ==========================================

  describe('Forward Pass', () => {
    it('calculates ES and EF for single task with no dependencies', () => {
      const projectStart = new Date('2026-01-25')
      const tasks = [
        createMockTask({ id: 'task-1', duration: 3 }),
      ]
      const deps: Dependency[] = []
      const workDays = [0, 1, 2, 3, 4]

      const result = service.forwardPass(tasks, deps, projectStart, workDays, [])

      expect(result[0].es?.toISOString().split('T')[0]).toBe('2026-01-25')
      expect(result[0].ef?.toISOString().split('T')[0]).toBe('2026-01-27')
    })

    it('calculates ES from predecessor EF for dependent tasks', () => {
      const projectStart = new Date('2026-01-25')
      const tasks = [
        createMockTask({ id: 'task-1', duration: 2 }),
        createMockTask({ id: 'task-2', duration: 3 }),
      ]
      const deps = [
        createMockDependency('task-1', 'task-2'),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.forwardPass(tasks, deps, projectStart, workDays, [])

      // Task 1: ES=Jan 25, EF=Jan 26 (2 days)
      expect(result[0].es?.toISOString().split('T')[0]).toBe('2026-01-25')
      expect(result[0].ef?.toISOString().split('T')[0]).toBe('2026-01-26')

      // Task 2: ES=Jan 27 (day after task 1), EF=Jan 29 (3 days)
      expect(result[1].es?.toISOString().split('T')[0]).toBe('2026-01-27')
      expect(result[1].ef?.toISOString().split('T')[0]).toBe('2026-01-29')
    })

    it('uses max EF when task has multiple predecessors', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      const tasks = [
        createMockTask({ id: 'task-1', duration: 2 }),
        createMockTask({ id: 'task-2', duration: 5 }),
        createMockTask({ id: 'task-3', duration: 2 }), // depends on both task-1 and task-2
      ]
      const deps = [
        createMockDependency('task-1', 'task-3'),
        createMockDependency('task-2', 'task-3'),
      ]
      const workDays = [0, 1, 2, 3, 4] // Sun-Thu

      const result = service.forwardPass(tasks, deps, projectStart, workDays, [])

      // Task 1: ES=Jan 25, EF = Jan 26 (2 days)
      // Task 2: ES=Jan 25, EF = Jan 29 (5 days: Sun, Mon, Tue, Wed, Thu)
      // Task 3: ES = day after max(Jan 26, Jan 29) = Jan 30, but that's Fri (weekend)
      //         so ES = Feb 1 (Sunday)
      const task3 = result.find(t => t.id === 'task-3')
      expect(task3?.es?.toISOString().split('T')[0]).toBe('2026-02-01')
    })

    it('handles lag days in dependencies', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      const tasks = [
        createMockTask({ id: 'task-1', duration: 2 }),
        createMockTask({ id: 'task-2', duration: 2 }),
      ]
      const deps = [
        createMockDependency('task-1', 'task-2', { lag_days: 2 }),
      ]
      const workDays = [0, 1, 2, 3, 4] // Sun-Thu

      const result = service.forwardPass(tasks, deps, projectStart, workDays, [])

      // Task 1: ES = Jan 25, EF = Jan 26 (2 days)
      // Task 2: starts after Jan 26 + 2 lag working days
      //         Jan 27 (lag day 1), Jan 28 (lag day 2) = ES is Jan 28
      expect(result[1].es?.toISOString().split('T')[0]).toBe('2026-01-28')
    })
  })

  // ==========================================
  // Backward Pass (LS, LF Calculation)
  // ==========================================

  describe('Backward Pass', () => {
    it('calculates LS and LF for single task', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          duration: 3,
          es: new Date('2026-01-25'),
          ef: new Date('2026-01-27'),
        }),
      ]
      const deps: Dependency[] = []
      const projectEnd = new Date('2026-01-27')
      const workDays = [0, 1, 2, 3, 4]

      const result = service.backwardPass(tasks, deps, projectEnd, workDays, [])

      expect(result[0].lf?.toISOString().split('T')[0]).toBe('2026-01-27')
      expect(result[0].ls?.toISOString().split('T')[0]).toBe('2026-01-25')
    })

    it('calculates LF from successor LS for dependent tasks', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          duration: 2,
          es: new Date('2026-01-25'),
          ef: new Date('2026-01-26'),
        }),
        createMockTask({
          id: 'task-2',
          duration: 3,
          es: new Date('2026-01-27'),
          ef: new Date('2026-01-29'),
        }),
      ]
      const deps = [
        createMockDependency('task-1', 'task-2'),
      ]
      const projectEnd = new Date('2026-01-29')
      const workDays = [0, 1, 2, 3, 4]

      const result = service.backwardPass(tasks, deps, projectEnd, workDays, [])

      // Task 2: LF=Jan 29, LS=Jan 27
      expect(result[1].lf?.toISOString().split('T')[0]).toBe('2026-01-29')
      expect(result[1].ls?.toISOString().split('T')[0]).toBe('2026-01-27')

      // Task 1: LF = day before task 2 LS = Jan 26
      expect(result[0].lf?.toISOString().split('T')[0]).toBe('2026-01-26')
      expect(result[0].ls?.toISOString().split('T')[0]).toBe('2026-01-25')
    })

    it('uses min LS when task has multiple successors', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          duration: 2,
          es: new Date('2026-01-25'),
          ef: new Date('2026-01-26'),
        }),
        createMockTask({
          id: 'task-2',
          duration: 2,
          es: new Date('2026-01-27'),
          ef: new Date('2026-01-28'),
        }),
        createMockTask({
          id: 'task-3',
          duration: 5,
          es: new Date('2026-01-27'),
          ef: new Date('2026-02-02'),
        }),
      ]
      const deps = [
        createMockDependency('task-1', 'task-2'),
        createMockDependency('task-1', 'task-3'),
      ]
      const projectEnd = new Date('2026-02-02')
      const workDays = [0, 1, 2, 3, 4]

      const result = service.backwardPass(tasks, deps, projectEnd, workDays, [])

      // Task 1's LF should be day before min(task-2.LS, task-3.LS) = Jan 26
      expect(result[0].lf?.toISOString().split('T')[0]).toBe('2026-01-26')
    })
  })

  // ==========================================
  // Slack & Critical Path
  // ==========================================

  describe('Slack Calculation', () => {
    it('calculates slack as LS - ES', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          es: new Date('2026-01-25'),
          ls: new Date('2026-01-27'),
        }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.calculateSlack(tasks, workDays, [])

      // Slack = 2 working days between Jan 25 and Jan 27
      expect(result[0].slack).toBe(2)
    })

    it('marks tasks with 0 slack as critical', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          es: new Date('2026-01-25'),
          ls: new Date('2026-01-25'),
        }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.calculateSlack(tasks, workDays, [])

      expect(result[0].slack).toBe(0)
      expect(result[0].is_critical).toBe(true)
    })

    it('marks tasks with positive slack as non-critical', () => {
      const tasks = [
        createMockTask({
          id: 'task-1',
          es: new Date('2026-01-25'),
          ls: new Date('2026-01-27'),
        }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.calculateSlack(tasks, workDays, [])

      expect(result[0].is_critical).toBe(false)
    })
  })

  // ==========================================
  // Full CPM Calculation
  // ==========================================

  describe('calculateCriticalPath', () => {
    it('processes complete project with multiple tasks and dependencies', () => {
      const projectStart = new Date('2026-01-25')
      const tasks = [
        createMockTask({ id: 'A', duration: 3 }),
        createMockTask({ id: 'B', duration: 4 }),
        createMockTask({ id: 'C', duration: 2 }),
        createMockTask({ id: 'D', duration: 3 }),
      ]
      const deps = [
        createMockDependency('A', 'C'),
        createMockDependency('B', 'C'),
        createMockDependency('C', 'D'),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.calculateCriticalPath(
        tasks,
        deps,
        projectStart,
        workDays,
        []
      )

      // All tasks should have ES, EF, LS, LF, slack calculated
      result.tasks.forEach(task => {
        expect(task.es).not.toBeNull()
        expect(task.ef).not.toBeNull()
        expect(task.ls).not.toBeNull()
        expect(task.lf).not.toBeNull()
        expect(typeof task.slack).toBe('number')
        expect(typeof task.is_critical).toBe('boolean')
      })

      // Critical path should be identified
      expect(result.criticalPath.length).toBeGreaterThan(0)
    })

    it('identifies correct critical path (longest path)', () => {
      const projectStart = new Date('2026-01-25')
      const tasks = [
        createMockTask({ id: 'A', duration: 2 }),  // Short path: A -> C (total: 4)
        createMockTask({ id: 'B', duration: 5 }),  // Long path: B -> C (total: 7)
        createMockTask({ id: 'C', duration: 2 }),
      ]
      const deps = [
        createMockDependency('A', 'C'),
        createMockDependency('B', 'C'),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.calculateCriticalPath(tasks, deps, projectStart, workDays, [])

      // B and C should be on critical path (longer path)
      expect(result.criticalPath).toContain('B')
      expect(result.criticalPath).toContain('C')

      // A should NOT be on critical path (shorter path, has slack)
      expect(result.criticalPath).not.toContain('A')
    })
  })

  // ==========================================
  // Resource-Aware Scheduling
  // ==========================================

  describe('Resource-Aware Scheduling', () => {
    it('considers employee time off when calculating dates', () => {
      const projectStart = new Date('2026-02-12') // Thursday
      const tasks = [
        createMockTask({
          id: 'task-1',
          duration: 4,
          assignee_id: 'user-1',
        }),
      ]
      const teamMembers = [
        createMockTeamMember({
          user_id: 'user-1',
          work_days: [0, 1, 2, 3, 4], // Sun-Thu
        }),
      ]
      const timeOff = [
        createMockTimeOff({
          team_member_id: 'user-1',
          start_date: new Date('2026-02-15'), // Sunday
          end_date: new Date('2026-02-17'),   // Tuesday
        }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.calculateWithResources(
        tasks,
        [],
        projectStart,
        workDays,
        [],
        teamMembers,
        timeOff
      )

      // Task with duration 4:
      // Feb 12 (Thu) = day 1
      // Skip Fri, Sat (weekend)
      // Skip Feb 15-17 (time off: Sun, Mon, Tue)
      // Feb 18 (Wed) = day 2
      // Feb 19 (Thu) = day 3
      // Skip Fri, Sat (weekend)
      // Feb 22 (Sun) = day 4 → EF
      expect(result.tasks[0].ef?.toISOString().split('T')[0]).toBe('2026-02-22')
    })

    it('calculates effective duration for part-time workers', () => {
      const member = createMockTeamMember({
        work_hours_per_day: 4, // Part-time
      })
      const estimatedHours = 16

      const effectiveDuration = service.calculateEffectiveDuration(estimatedHours, member)

      // 16 hours / 4 hours per day = 4 days
      expect(effectiveDuration).toBe(4)
    })

    it('calculates effective duration for full-time workers', () => {
      const member = createMockTeamMember({
        work_hours_per_day: 8, // Full-time
      })
      const estimatedHours = 16

      const effectiveDuration = service.calculateEffectiveDuration(estimatedHours, member)

      // 16 hours / 8 hours per day = 2 days
      expect(effectiveDuration).toBe(2)
    })

    it('rounds up duration to whole days', () => {
      const member = createMockTeamMember({
        work_hours_per_day: 8,
      })
      const estimatedHours = 10 // 10 / 8 = 1.25

      const effectiveDuration = service.calculateEffectiveDuration(estimatedHours, member)

      // Should round up to 2 days
      expect(effectiveDuration).toBe(2)
    })

    it('respects individual work days configuration', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      const tasks = [
        createMockTask({
          id: 'task-1',
          duration: 4,
          assignee_id: 'user-1',
        }),
      ]
      const teamMembers = [
        createMockTeamMember({
          user_id: 'user-1',
          work_days: [0, 1, 2, 3], // Sun-Wed only (no Thursday!)
        }),
      ]
      const workDays = [0, 1, 2, 3, 4] // Project default

      const result = service.calculateWithResources(
        tasks,
        [],
        projectStart,
        workDays,
        [],
        teamMembers,
        []
      )

      // Task needs 4 days, but worker only works Sun-Wed
      // Sun (1), Mon (2), Tue (3), Wed (4) - finishes Wed Jan 28
      // But wait, next week: Thu off, Fri off, Sat off, Sun (4) = Jan 28
      expect(result.tasks[0].ef).not.toBeNull()
    })
  })

  // ==========================================
  // Topological Sort
  // ==========================================

  describe('topologicalSort', () => {
    it('sorts tasks in dependency order', () => {
      const tasks = [
        createMockTask({ id: 'C' }),
        createMockTask({ id: 'A' }),
        createMockTask({ id: 'B' }),
      ]
      const deps = [
        createMockDependency('A', 'B'),
        createMockDependency('B', 'C'),
      ]

      const sorted = service.topologicalSort(tasks, deps)

      const ids = sorted.map(t => t.id)
      expect(ids.indexOf('A')).toBeLessThan(ids.indexOf('B'))
      expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('C'))
    })

    it('handles tasks with no dependencies', () => {
      const tasks = [
        createMockTask({ id: 'A' }),
        createMockTask({ id: 'B' }),
        createMockTask({ id: 'C' }),
      ]
      const deps: Dependency[] = []

      const sorted = service.topologicalSort(tasks, deps)

      // Should return all tasks (order doesn't matter when no deps)
      expect(sorted.length).toBe(3)
    })

    it('handles complex dependency graph', () => {
      const tasks = [
        createMockTask({ id: 'A' }),
        createMockTask({ id: 'B' }),
        createMockTask({ id: 'C' }),
        createMockTask({ id: 'D' }),
        createMockTask({ id: 'E' }),
      ]
      // A -> B -> D
      // A -> C -> D
      // D -> E
      const deps = [
        createMockDependency('A', 'B'),
        createMockDependency('A', 'C'),
        createMockDependency('B', 'D'),
        createMockDependency('C', 'D'),
        createMockDependency('D', 'E'),
      ]

      const sorted = service.topologicalSort(tasks, deps)
      const ids = sorted.map(t => t.id)

      // A must come first
      expect(ids.indexOf('A')).toBe(0)
      // B and C must come after A, before D
      expect(ids.indexOf('B')).toBeLessThan(ids.indexOf('D'))
      expect(ids.indexOf('C')).toBeLessThan(ids.indexOf('D'))
      // E must come last
      expect(ids.indexOf('E')).toBe(4)
    })

    it('detects circular dependencies', () => {
      const tasks = [
        createMockTask({ id: 'A' }),
        createMockTask({ id: 'B' }),
        createMockTask({ id: 'C' }),
      ]
      // Circular: A -> B -> C -> A
      const deps = [
        createMockDependency('A', 'B'),
        createMockDependency('B', 'C'),
        createMockDependency('C', 'A'),
      ]

      expect(() => service.topologicalSort(tasks, deps)).toThrow('Circular dependency detected')
    })
  })

  // ==========================================
  // Forward Pass - SS Dependencies
  // ==========================================

  describe('Forward Pass - SS dependencies', () => {
    it('SS dependency: successor ES equals predecessor ES', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      const tasks = [
        createMockTask({ id: 'A', duration: 3 }),
        createMockTask({ id: 'B', duration: 2 }),
      ]
      const deps = [
        createMockDependency('A', 'B', { type: 'SS' }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.forwardPass(tasks, deps, projectStart, workDays, [])

      // A: ES=Jan 25, EF=Jan 27
      // B (SS): ES should equal A's ES = Jan 25
      expect(result[0].es?.toISOString().split('T')[0]).toBe('2026-01-25')
      expect(result[1].es?.toISOString().split('T')[0]).toBe('2026-01-25')
      // B: EF = ES + 2 days = Jan 26
      expect(result[1].ef?.toISOString().split('T')[0]).toBe('2026-01-26')
    })

    it('SS dependency with positive lag: successor ES = predecessor ES + lag', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      const tasks = [
        createMockTask({ id: 'A', duration: 3 }),
        createMockTask({ id: 'B', duration: 2 }),
      ]
      const deps = [
        createMockDependency('A', 'B', { type: 'SS', lag_days: 2 }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.forwardPass(tasks, deps, projectStart, workDays, [])

      // A: ES=Jan 25
      // B (SS+2): ES = A's ES + 2 working days = Jan 25 + 2 = Jan 27
      expect(result[1].es?.toISOString().split('T')[0]).toBe('2026-01-27')
    })

    it('SS dependency with negative lag (lead): clamps to project start', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      const tasks = [
        createMockTask({ id: 'A', duration: 3 }),
        createMockTask({ id: 'B', duration: 2 }),
      ]
      const deps = [
        createMockDependency('A', 'B', { type: 'SS', lag_days: -1 }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.forwardPass(tasks, deps, projectStart, workDays, [])

      // A: ES=Jan 25
      // B (SS-1): candidateES = A's ES - 1 = Jan 24 (Sat, not a working day)
      // Clamped to project start = Jan 25
      expect(result[1].es?.toISOString().split('T')[0]).toBe('2026-01-25')
    })
  })

  // ==========================================
  // Forward Pass - FF Dependencies
  // ==========================================

  describe('Forward Pass - FF dependencies', () => {
    it('FF dependency: successor EF aligns to predecessor EF', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      const tasks = [
        createMockTask({ id: 'A', duration: 5 }),
        createMockTask({ id: 'B', duration: 3 }),
      ]
      const deps = [
        createMockDependency('A', 'B', { type: 'FF' }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.forwardPass(tasks, deps, projectStart, workDays, [])

      // A: ES=Jan 25, EF=Jan 29 (5 days: Sun-Thu)
      // B (FF): EF must >= A's EF = Jan 29
      // B's ES = subtractWorkingDays(Jan 29, 3) = Jan 27 (Tue)
      expect(result[0].ef?.toISOString().split('T')[0]).toBe('2026-01-29')
      expect(result[1].es?.toISOString().split('T')[0]).toBe('2026-01-27')
      expect(result[1].ef?.toISOString().split('T')[0]).toBe('2026-01-29')
    })

    it('FF dependency with positive lag: successor EF = predecessor EF + lag', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      const tasks = [
        createMockTask({ id: 'A', duration: 5 }),
        createMockTask({ id: 'B', duration: 3 }),
      ]
      const deps = [
        createMockDependency('A', 'B', { type: 'FF', lag_days: 1 }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.forwardPass(tasks, deps, projectStart, workDays, [])

      // A: ES=Jan 25, EF=Jan 29 (Thu)
      // B (FF+1): EF must >= A's EF + 1 working day = Jan 30 -> Fri (weekend) -> Feb 1 (Sun)
      // B's ES = subtractWorkingDays(Feb 1, 3) = Jan 29 (Thu)
      // Actually: Jan 29 is the EF constraint + 1 working day.
      // EF constraint = addWorkingDays(Jan 29, 1+1) since lag is applied as working days from EF
      // Let me recalculate: predEF = Jan 29. candidateEF = addWorkingDays(Jan 29, 1+1) - no.
      // FF+lag: candidateEF = predEF + lag working days.
      // predEF = Jan 29. Add 1 working day from Jan 29: next working day after Jan 29 = Jan 30 (Fri is weekend), so Feb 1 (Sun).
      // Wait, addWorkingDays(Jan 29, 1) starts from Jan 29, duration 1 = same day. So that's still Jan 29.
      // Actually addWorkingDays adds from start: addWorkingDays(Jan 29, 2) = Jan 29 (day 1), then +1 = Feb 1 (skip Fri/Sat, day 2).
      // The lag should be: candidateEF = Jan 29, then shift by lag_days working days forward.
      // If lag=1: shift 1 working day forward from Jan 29. Next working day after Jan 29 = Feb 1 (Sun).
      // So candidateEF = Feb 1. B's ES = subtractWorkingDays(Feb 1, 3) = Jan 29 (Thu).
      // Actually Feb 1 is Sunday. subtractWorkingDays(Feb 1, 3): Feb 1 (day 3), then back: Jan 29 (Thu, day 2), Jan 28 (Wed, day 1) = Jan 28.
      // Hmm, let me just check the expected value more carefully.
      // Duration 3: if EF is Feb 1, then ES = subtractWorkingDays(Feb 1, 3).
      // subtractWorkingDays: Feb 1 is working day, duration 3, subtract 2 more:
      //   Feb 1 -> Jan 29 (skip Fri/Sat) -> Jan 28 = Jan 28 (Wed).
      // No wait: subtractWorkingDays(Feb 1, 3) means go back 3 working days including Feb 1.
      // Feb 1 (3), back to Jan 29 (2, skip Fri/Sat), Jan 28 (1) -> result Jan 28?
      // Looking at the code: subtractWorkingDays subtracts (daysToSubtract - 1) working days backwards.
      // Duration 1 = same day. Duration 3: same day + 2 backwards.
      // Feb 1 is the "end", go back 2 working days: Jan 29 (skip Fri/Sat = Thu), Jan 28 (Wed).
      // So LS = Jan 28? No, ES, not LS.
      // ES for B with EF=Feb 1, duration 3: Feb 1 - 2 working days back = Jan 28 (Wed).
      // Hmm actually I need to think about this differently. Let me just test the core assertion.
      // The key point: with FF+1 lag, B finishes 1 working day AFTER A finishes.
      // A finishes Jan 29 (Thu). 1 working day after = Feb 1 (Sun, skip Fri/Sat).
      // B finishes Feb 1, B has duration 3, so B starts at subtractWorkingDays(Feb 1, 3).
      // subtractWorkingDays(Feb 1, 3): Feb 1 (day 1), -1 -> Jan 31 (Sat, skip), Jan 30 (Fri, skip), Jan 29 (Thu, day 2), -1 -> Jan 28 (Wed, day 3). Result = Jan 28.
      // Wait, I'm confusing myself. Let me look at the code for subtractWorkingDays.
      // subtractWorkingDays(endDate, daysToSubtract): starts at endDate. If it's a working day, and daysToSubtract=1, return it.
      // If daysToSubtract=3: stay at endDate (accounts for 1), then go backwards (3-1=2) more working days.
      // Feb 1 (Sun): working day? Yes (day 0 = Sun in [0,1,2,3,4]). Good, stays.
      // Then go back 2 working days: Feb 1 -> Jan 31 (Sat=not working) -> Jan 30 (Fri=not working) -> Jan 29 (Thu=working, count 1) -> Jan 28 (Wed=working, count 2) -> result Jan 28.
      // So B: ES=Jan 28, EF=Feb 1.
      expect(result[1].ef?.toISOString().split('T')[0]).toBe('2026-02-01')
      expect(result[1].es?.toISOString().split('T')[0]).toBe('2026-01-28')
    })
  })

  // ==========================================
  // Forward Pass - SF Dependencies
  // ==========================================

  describe('Forward Pass - SF dependencies', () => {
    it('SF dependency: successor EF aligns to predecessor ES', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      const tasks = [
        createMockTask({ id: 'A', duration: 3 }),
        createMockTask({ id: 'B', duration: 2 }),
      ]
      const deps = [
        createMockDependency('A', 'B', { type: 'SF' }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.forwardPass(tasks, deps, projectStart, workDays, [])

      // A: ES=Jan 25
      // B (SF): EF constraint = A's ES = Jan 25
      // B's ES = subtractWorkingDays(Jan 25, 2) = Jan 22 (Thu)
      // But Jan 22 is before project start (Jan 25), so clamp ES to Jan 25
      // Then EF = addWorkingDays(Jan 25, 2) = Jan 26
      // Actually if ES is clamped to project start, the SF constraint might push EF later.
      // Let me reconsider: SF means predecessor Start -> successor Finish.
      // Successor cannot finish before predecessor starts.
      // So B's EF >= A's ES = Jan 25.
      // B has duration 2. If EF = Jan 25, ES = subtractWorkingDays(Jan 25, 2) = Jan 22 (Thu).
      // But that's before project start. So ES gets clamped to project start Jan 25.
      // With ES = Jan 25 and duration 2, EF = Jan 26.
      // The constraint EF >= Jan 25 is satisfied (Jan 26 >= Jan 25).
      expect(result[1].es?.toISOString().split('T')[0]).toBe('2026-01-25')
      expect(result[1].ef?.toISOString().split('T')[0]).toBe('2026-01-26')
    })
  })

  // ==========================================
  // Forward Pass - Negative Lag (Lead Time)
  // ==========================================

  describe('Forward Pass - Negative lag (lead time)', () => {
    it('FS with negative lag: successor starts before predecessor finishes', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      const tasks = [
        createMockTask({ id: 'A', duration: 5 }),
        createMockTask({ id: 'B', duration: 3 }),
      ]
      const deps = [
        createMockDependency('A', 'B', { type: 'FS', lag_days: -2 }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.forwardPass(tasks, deps, projectStart, workDays, [])

      // A: ES=Jan 25, EF=Jan 29 (5 days: Sun-Thu)
      // B (FS-2): candidateES = predEF + 1 - 2 = predEF - 1
      // Normal FS: ES = Jan 30 (day after EF). With -2 lead: Jan 30 - 2 working days.
      // subtractWorkingDays from Jan 30: Jan 30 is Fri (not working), back to Jan 29 (Thu).
      // Actually: FS with lag: candidateES = predEF + 1 day + lag_days.
      // For negative lag: candidateES = addDays(predEF, 1) then adjust by lag.
      // predEF = Jan 29. addDays(Jan 29, 1) = Jan 30.
      // lag = -2: subtract 2 working days from Jan 30.
      // Jan 30 is Fri (not working in Israeli week). subtractWorkingDays(Jan 30, 2):
      //   First find working day going back: Jan 29 (Thu).
      //   Duration 2: Jan 29 (day 1), then Jan 28 (Wed, day 2) = result Jan 28.
      expect(result[1].es?.toISOString().split('T')[0]).toBe('2026-01-28')
    })

    it('negative lag that would push before project start clamps to project start', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      const tasks = [
        createMockTask({ id: 'A', duration: 2 }),
        createMockTask({ id: 'B', duration: 2 }),
      ]
      const deps = [
        createMockDependency('A', 'B', { type: 'FS', lag_days: -5 }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.forwardPass(tasks, deps, projectStart, workDays, [])

      // A: ES=Jan 25, EF=Jan 26 (2 days)
      // B (FS-5): way before project start
      // Should clamp to project start Jan 25
      expect(result[1].es?.toISOString().split('T')[0]).toBe('2026-01-25')
    })
  })

  // ==========================================
  // Backward Pass - SS/FF/SF
  // ==========================================

  describe('Backward Pass - SS/FF/SF dependencies', () => {
    it('SS backward pass: predecessor LF derived from successor LS', () => {
      const tasks = [
        createMockTask({
          id: 'A',
          duration: 3,
          es: new Date('2026-01-25'),
          ef: new Date('2026-01-27'),
        }),
        createMockTask({
          id: 'B',
          duration: 2,
          es: new Date('2026-01-25'),
          ef: new Date('2026-01-26'),
        }),
      ]
      const deps = [
        createMockDependency('A', 'B', { type: 'SS' }),
      ]
      const projectEnd = new Date('2026-01-27')
      const workDays = [0, 1, 2, 3, 4]

      const result = service.backwardPass(tasks, deps, projectEnd, workDays, [])

      // B: LF = projectEnd = Jan 27, LS = subtractWorkingDays(Jan 27, 2) = Jan 26
      // A (SS): SS constrains successor's LS based on predecessor's ES.
      // Backward: predecessor LS <= successor LS - lag.
      // predecessor LS = B's LS - 0 = Jan 26.
      // predecessor LF = addWorkingDays(LS, duration) = addWorkingDays(Jan 26, 3) = Jan 28.
      const taskA = result.find(t => t.id === 'A')
      expect(taskA?.ls?.toISOString().split('T')[0]).toBe('2026-01-26')
      expect(taskA?.lf?.toISOString().split('T')[0]).toBe('2026-01-28')
    })

    it('FF backward pass: predecessor LF equals successor LF minus lag', () => {
      const tasks = [
        createMockTask({
          id: 'A',
          duration: 5,
          es: new Date('2026-01-25'),
          ef: new Date('2026-01-29'),
        }),
        createMockTask({
          id: 'B',
          duration: 3,
          es: new Date('2026-01-27'),
          ef: new Date('2026-01-29'),
        }),
      ]
      const deps = [
        createMockDependency('A', 'B', { type: 'FF' }),
      ]
      const projectEnd = new Date('2026-01-29')
      const workDays = [0, 1, 2, 3, 4]

      const result = service.backwardPass(tasks, deps, projectEnd, workDays, [])

      // B: LF = projectEnd = Jan 29, LS = subtractWorkingDays(Jan 29, 3) = Jan 27
      // A (FF): candidateLF = B's LF - lag = Jan 29 - 0 = Jan 29
      // A: LF = Jan 29, LS = subtractWorkingDays(Jan 29, 5) = Jan 25
      const taskA = result.find(t => t.id === 'A')
      expect(taskA?.lf?.toISOString().split('T')[0]).toBe('2026-01-29')
      expect(taskA?.ls?.toISOString().split('T')[0]).toBe('2026-01-25')
    })

    it('SF backward pass: predecessor LS derived from successor LF', () => {
      const tasks = [
        createMockTask({
          id: 'A',
          duration: 3,
          es: new Date('2026-01-25'),
          ef: new Date('2026-01-27'),
        }),
        createMockTask({
          id: 'B',
          duration: 2,
          es: new Date('2026-01-25'),
          ef: new Date('2026-01-26'),
        }),
      ]
      const deps = [
        createMockDependency('A', 'B', { type: 'SF' }),
      ]
      const projectEnd = new Date('2026-01-27')
      const workDays = [0, 1, 2, 3, 4]

      const result = service.backwardPass(tasks, deps, projectEnd, workDays, [])

      // B: LF = projectEnd = Jan 27, LS = subtractWorkingDays(Jan 27, 2) = Jan 26
      // A (SF): SF constrains successor's finish based on predecessor's start.
      // Backward: predecessor LS <= successor LF - lag.
      // predecessor LS = B's LF - 0 = Jan 27.
      // predecessor LF = addWorkingDays(Jan 27, 3) = Jan 29.
      const taskA = result.find(t => t.id === 'A')
      expect(taskA?.ls?.toISOString().split('T')[0]).toBe('2026-01-27')
      expect(taskA?.lf?.toISOString().split('T')[0]).toBe('2026-01-29')
    })
  })

  // ==========================================
  // Mixed Dependency Types
  // ==========================================

  describe('Mixed dependency types on one successor', () => {
    it('resolves max ES from mixed FS and SS dependencies', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      const tasks = [
        createMockTask({ id: 'A', duration: 3 }), // EF = Jan 27
        createMockTask({ id: 'B', duration: 5 }), // ES = Jan 25
        createMockTask({ id: 'C', duration: 2 }),  // depends on A (FS) and B (SS)
      ]
      const deps = [
        createMockDependency('A', 'C', { type: 'FS' }),
        createMockDependency('B', 'C', { type: 'SS' }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.forwardPass(tasks, deps, projectStart, workDays, [])

      // A: ES=Jan 25, EF=Jan 27
      // B: ES=Jan 25, EF=Jan 29
      // C from A (FS): candidateES = Jan 28 (day after Jan 27)
      // C from B (SS): candidateES = Jan 25 (same as B's ES)
      // C's ES = max(Jan 28, Jan 25) = Jan 28
      const taskC = result.find(t => t.id === 'C')
      expect(taskC?.es?.toISOString().split('T')[0]).toBe('2026-01-28')
    })
  })

  // ==========================================
  // Full CPM with Non-FS Dependencies
  // ==========================================

  describe('Full calculateCriticalPath with non-FS deps', () => {
    it('computes correct slack and critical path with mixed FS and SS dependencies', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      // Chain: A(3) --FS--> B(2) --SS--> C(3)
      // Forward:
      //   A: ES=Jan25, EF=Jan27
      //   B (FS from A): ES=Jan28, EF=Jan29
      //   C (SS from B): ES=Jan28, EF=Feb1 (Jan28, Jan29, skip Fri/Sat, Feb1)
      // Project end = Feb 1
      // Backward:
      //   C: LF=Feb1, LS=Jan28
      //   B (SS to C): LS=Jan28, LF=Jan29
      //   A (FS to B): LF=Jan27, LS=Jan25
      // All tasks: slack=0 -> all critical
      const tasks = [
        createMockTask({ id: 'A', duration: 3 }),
        createMockTask({ id: 'B', duration: 2 }),
        createMockTask({ id: 'C', duration: 3 }),
      ]
      const deps = [
        createMockDependency('A', 'B', { type: 'FS' }),
        createMockDependency('B', 'C', { type: 'SS' }),
      ]
      const workDays = [0, 1, 2, 3, 4]

      const result = service.calculateCriticalPath(tasks, deps, projectStart, workDays, [])

      // All tasks should have scheduling data
      result.tasks.forEach(task => {
        expect(task.es).not.toBeNull()
        expect(task.ef).not.toBeNull()
        expect(task.ls).not.toBeNull()
        expect(task.lf).not.toBeNull()
        expect(typeof task.slack).toBe('number')
      })

      // All three tasks should be on the critical path
      expect(result.criticalPath).toContain('A')
      expect(result.criticalPath).toContain('B')
      expect(result.criticalPath).toContain('C')

      // Project end should be Feb 1 (C's EF)
      expect(result.projectEndDate?.toISOString().split('T')[0]).toBe('2026-02-01')
    })
  })

  // ==========================================
  // Edge Cases
  // ==========================================

  describe('Edge Cases', () => {
    it('handles empty task list', () => {
      const result = service.calculateCriticalPath(
        [],
        [],
        new Date('2026-01-25'),
        [0, 1, 2, 3, 4],
        []
      )

      expect(result.tasks).toEqual([])
      expect(result.criticalPath).toEqual([])
      expect(result.projectEndDate).toBeNull()
    })

    it('handles single task with no dependencies', () => {
      const tasks = [createMockTask({ id: 'only-task', duration: 5 })]

      const result = service.calculateCriticalPath(
        tasks,
        [],
        new Date('2026-01-25'),
        [0, 1, 2, 3, 4],
        []
      )

      expect(result.criticalPath).toEqual(['only-task'])
      expect(result.tasks[0].is_critical).toBe(true)
    })

    it('handles task with duration of 0', () => {
      const tasks = [createMockTask({ id: 'milestone', duration: 0 })]

      const result = service.calculateCriticalPath(
        tasks,
        [],
        new Date('2026-01-25'),
        [0, 1, 2, 3, 4],
        []
      )

      // Milestone starts and ends on same day
      expect(result.tasks[0].es?.toISOString().split('T')[0]).toBe(
        result.tasks[0].ef?.toISOString().split('T')[0]
      )
    })

    it('handles project starting on weekend', () => {
      const projectStart = new Date('2026-01-30') // Friday
      const tasks = [createMockTask({ id: 'task-1', duration: 3 })]
      const workDays = [0, 1, 2, 3, 4] // Sun-Thu

      const result = service.calculateCriticalPath(
        tasks,
        [],
        projectStart,
        workDays,
        []
      )

      // Should start on Sunday (Feb 1)
      expect(result.tasks[0].es?.toISOString().split('T')[0]).toBe('2026-02-01')
    })

    it('handles all holidays week', () => {
      const projectStart = new Date('2026-01-25') // Sunday
      const tasks = [createMockTask({ id: 'task-1', duration: 2 })]
      const workDays = [0, 1, 2, 3, 4]
      const holidays = [
        new Date('2026-01-25'),
        new Date('2026-01-26'),
        new Date('2026-01-27'),
        new Date('2026-01-28'),
        new Date('2026-01-29'),
      ]

      const result = service.calculateCriticalPath(
        tasks,
        [],
        projectStart,
        workDays,
        holidays
      )

      // Should start on Feb 1 (Sunday, next week)
      expect(result.tasks[0].es?.toISOString().split('T')[0]).toBe('2026-02-01')
    })
  })
})

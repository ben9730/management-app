/**
 * SchedulingService - Critical Path Method (CPM) Implementation
 *
 * Based on PRD v2.1 - Lean MVP + Resource-Aware Scheduling
 *
 * Features:
 * - Forward Pass (ES, EF calculation)
 * - Backward Pass (LS, LF calculation)
 * - Slack Calculation & Critical Path identification
 * - Calendar Awareness (weekends, holidays)
 * - Resource-Aware Scheduling (time off, part-time workers)
 */

import type {
  Task,
  Dependency,
  TeamMember,
  EmployeeTimeOff,
  SchedulingResult,
} from '@/types/entities'

export class SchedulingService {
  /**
   * Check if a given date is a working day
   */
  isWorkingDay(date: Date, workDays: number[], holidays: Date[]): boolean {
    const dayOfWeek = date.getDay()

    // Check if it's a work day
    if (!workDays.includes(dayOfWeek)) {
      return false
    }

    // Check if it's a holiday
    const dateStr = this.toDateString(date)
    for (const holiday of holidays) {
      if (this.toDateString(holiday) === dateStr) {
        return false
      }
    }

    return true
  }

  /**
   * Add working days to a date, skipping non-working days
   */
  addWorkingDays(
    startDate: Date,
    daysToAdd: number,
    workDays: number[],
    holidays: Date[]
  ): Date {
    if (daysToAdd <= 0) {
      return new Date(startDate)
    }

    let currentDate = new Date(startDate)
    let daysAdded = 0

    // First, find the first working day if start is not a working day
    while (!this.isWorkingDay(currentDate, workDays, holidays)) {
      currentDate = this.addDays(currentDate, 1)
    }

    // Duration of 1 means the task completes on the same day it starts
    if (daysToAdd === 1) {
      return currentDate
    }

    // Add remaining days
    while (daysAdded < daysToAdd - 1) {
      currentDate = this.addDays(currentDate, 1)
      if (this.isWorkingDay(currentDate, workDays, holidays)) {
        daysAdded++
      }
    }

    return currentDate
  }

  /**
   * Subtract working days from a date, skipping non-working days
   */
  subtractWorkingDays(
    endDate: Date,
    daysToSubtract: number,
    workDays: number[],
    holidays: Date[]
  ): Date {
    if (daysToSubtract <= 0) {
      return new Date(endDate)
    }

    let currentDate = new Date(endDate)
    let daysSubtracted = 0

    // First, find a working day if end is not a working day
    while (!this.isWorkingDay(currentDate, workDays, holidays)) {
      currentDate = this.addDays(currentDate, -1)
    }

    // Duration of 1 means start and end are the same day
    if (daysToSubtract === 1) {
      return currentDate
    }

    // Subtract remaining days
    while (daysSubtracted < daysToSubtract - 1) {
      currentDate = this.addDays(currentDate, -1)
      if (this.isWorkingDay(currentDate, workDays, holidays)) {
        daysSubtracted++
      }
    }

    return currentDate
  }

  /**
   * Count working days between two dates
   */
  workingDaysBetween(
    start: Date | string,
    end: Date | string,
    workDays: number[],
    holidays: Date[]
  ): number {
    const startDate = start instanceof Date ? start : new Date(start)
    const endDate = end instanceof Date ? end : new Date(end)

    if (this.toDateString(startDate) === this.toDateString(endDate)) {
      return 0
    }

    // Negative slack: when end < start (e.g. LS before ES due to negative lag),
    // count backward and return a negative value instead of looping infinitely.
    const forward = endDate >= startDate
    const direction = forward ? 1 : -1

    let count = 0
    let currentDate = new Date(startDate)
    const endStr = this.toDateString(endDate)

    while (this.toDateString(currentDate) !== endStr) {
      currentDate = this.addDays(currentDate, direction)
      if (this.isWorkingDay(currentDate, workDays, holidays)) {
        count++
      }
    }

    return forward ? count : -count
  }

  /**
   * Topologically sort tasks based on dependencies
   * Uses Kahn's algorithm
   */
  topologicalSort(tasks: Task[], dependencies: Dependency[]): Task[] {
    const taskMap = new Map<string, Task>()
    const inDegree = new Map<string, number>()
    const adjacencyList = new Map<string, string[]>()

    // Initialize
    for (const task of tasks) {
      taskMap.set(task.id, task)
      inDegree.set(task.id, 0)
      adjacencyList.set(task.id, [])
    }

    // Build graph
    for (const dep of dependencies) {
      const successors = adjacencyList.get(dep.predecessor_id)
      if (successors) {
        successors.push(dep.successor_id)
      }
      inDegree.set(dep.successor_id, (inDegree.get(dep.successor_id) || 0) + 1)
    }

    // Find all tasks with no incoming edges
    const queue: string[] = []
    for (const [taskId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(taskId)
      }
    }

    const result: Task[] = []

    while (queue.length > 0) {
      const taskId = queue.shift()!
      const task = taskMap.get(taskId)
      if (task) {
        result.push(task)
      }

      const successors = adjacencyList.get(taskId) || []
      for (const successorId of successors) {
        const newDegree = (inDegree.get(successorId) || 0) - 1
        inDegree.set(successorId, newDegree)
        if (newDegree === 0) {
          queue.push(successorId)
        }
      }
    }

    // Check for circular dependency
    if (result.length !== tasks.length) {
      throw new Error('Circular dependency detected')
    }

    return result
  }

  /**
   * Compute candidate ES for a single dependency in the forward pass.
   * Handles all 4 dependency types (FS, SS, FF, SF) with positive and negative lag.
   */
  private computeCandidateES(
    dep: Dependency,
    predTask: Task,
    taskDuration: number,
    projectStart: Date,
    workDays: number[],
    holidays: Date[]
  ): Date {
    const predES = predTask.es instanceof Date ? predTask.es : new Date(predTask.es!)
    const predEF = predTask.ef instanceof Date ? predTask.ef : new Date(predTask.ef!)
    const lag = dep.lag_days || 0

    let candidateES: Date

    switch (dep.type) {
      case 'FS': {
        // Finish-to-Start: successor starts after predecessor finishes
        // candidateES = predEF + 1 day + lag
        candidateES = this.addDays(predEF, 1)
        if (lag > 0) {
          candidateES = this.addWorkingDays(candidateES, lag, workDays, holidays)
        } else if (lag < 0) {
          candidateES = this.subtractWorkingDays(candidateES, Math.abs(lag), workDays, holidays)
        }
        break
      }
      case 'SS': {
        // Start-to-Start: successor starts when predecessor starts
        // candidateES = predES + lag
        candidateES = new Date(predES)
        if (lag > 0) {
          candidateES = this.addWorkingDays(candidateES, lag + 1, workDays, holidays)
        } else if (lag < 0) {
          candidateES = this.subtractWorkingDays(candidateES, Math.abs(lag) + 1, workDays, holidays)
        }
        break
      }
      case 'FF': {
        // Finish-to-Finish: successor finishes when predecessor finishes
        // candidateEF = predEF + lag, then candidateES = candidateEF - duration + 1
        let candidateEF = new Date(predEF)
        if (lag > 0) {
          candidateEF = this.addWorkingDays(candidateEF, lag + 1, workDays, holidays)
        } else if (lag < 0) {
          candidateEF = this.subtractWorkingDays(candidateEF, Math.abs(lag) + 1, workDays, holidays)
        }
        candidateES = this.subtractWorkingDays(candidateEF, taskDuration, workDays, holidays)
        break
      }
      case 'SF': {
        // Start-to-Finish: successor finishes when predecessor starts
        // candidateEF = predES + lag, then candidateES = candidateEF - duration + 1
        let candidateEF = new Date(predES)
        if (lag > 0) {
          candidateEF = this.addWorkingDays(candidateEF, lag + 1, workDays, holidays)
        } else if (lag < 0) {
          candidateEF = this.subtractWorkingDays(candidateEF, Math.abs(lag) + 1, workDays, holidays)
        }
        candidateES = this.subtractWorkingDays(candidateEF, taskDuration, workDays, holidays)
        break
      }
      default:
        // Fallback to FS behavior
        candidateES = this.addDays(predEF, 1)
        break
    }

    // Clamp to project start
    const projectStartWorking = this.findNextWorkingDay(projectStart, workDays, holidays)
    if (candidateES < projectStartWorking) {
      candidateES = projectStartWorking
    }

    // Ensure it lands on a working day
    candidateES = this.findNextWorkingDay(candidateES, workDays, holidays)

    return candidateES
  }

  /**
   * Forward Pass - Calculate Early Start (ES) and Early Finish (EF)
   * Supports all 4 dependency types: FS, SS, FF, SF with lead/lag
   */
  forwardPass(
    tasks: Task[],
    dependencies: Dependency[],
    projectStart: Date,
    workDays: number[],
    holidays: Date[]
  ): Task[] {
    const sortedTasks = this.topologicalSort(tasks, dependencies)
    const taskMap = new Map<string, Task>()

    // Clone tasks to avoid mutation
    const resultTasks = sortedTasks.map(t => ({ ...t }))
    for (const task of resultTasks) {
      taskMap.set(task.id, task)
    }

    // Get predecessors for each task
    const predecessorMap = new Map<string, Dependency[]>()
    for (const dep of dependencies) {
      const deps = predecessorMap.get(dep.successor_id) || []
      deps.push(dep)
      predecessorMap.set(dep.successor_id, deps)
    }

    for (const task of resultTasks) {
      // Step A: Manual task skip -- preserve user start date, compute EF from start + duration
      if (task.scheduling_mode === 'manual') {
        task.es = this.toDate(task.start_date) || task.es
        // Compute EF from start + duration (not stale end_date) so Gantt bar width is correct
        const esDate = this.toDate(task.es)
        if (esDate) {
          task.ef = this.addWorkingDays(esDate, task.duration, workDays, holidays)
        } else {
          task.ef = this.toDate(task.end_date) || task.ef
        }
        continue
      }

      const predecessors = predecessorMap.get(task.id) || []

      if (predecessors.length === 0) {
        // No predecessors - start at project start
        task.es = this.findNextWorkingDay(projectStart, workDays, holidays)
      } else {
        // ES = max(candidateES from all predecessors)
        let maxDate: Date | null = null

        for (const dep of predecessors) {
          const predTask = taskMap.get(dep.predecessor_id)
          if (predTask && predTask.ef) {
            const candidateES = this.computeCandidateES(
              dep, predTask, task.duration, projectStart, workDays, holidays
            )

            if (!maxDate || candidateES > maxDate) {
              maxDate = candidateES
            }
          }
        }

        task.es = maxDate || this.findNextWorkingDay(projectStart, workDays, holidays)
      }

      // Step B: Apply constraint logic (dependencies already resolved)
      const constraintDate = this.toDate(task.constraint_date)

      if (constraintDate && (task.constraint_type === 'MSO' || task.constraint_type === 'SNET')) {
        const depES = task.es as Date
        const constraintWorking = this.findNextWorkingDay(constraintDate, workDays, holidays)
        // Dependencies win: take the later date (locked decision)
        if (constraintWorking > depES) {
          task.es = constraintWorking
        }
        // Track whether constraint was overridden (transient, not persisted)
        ;(task as unknown as Record<string, unknown>)._constraintOverridden = depES > constraintWorking
      }

      // Calculate EF (after any constraint adjustment)
      task.ef = this.addWorkingDays(task.es!, task.duration, workDays, holidays)

      // FNLT check (after EF is known)
      if (task.constraint_type === 'FNLT' && constraintDate) {
        ;(task as unknown as Record<string, unknown>)._fnltViolation = (task.ef as Date) > constraintDate
      }
    }

    return resultTasks
  }

  /**
   * Compute candidate LF for a single dependency in the backward pass.
   * Handles all 4 dependency types (FS, SS, FF, SF) with positive and negative lag.
   */
  private computeCandidateLF(
    dep: Dependency,
    succTask: Task,
    taskDuration: number,
    workDays: number[],
    holidays: Date[]
  ): Date {
    const succLS = succTask.ls instanceof Date ? succTask.ls : new Date(succTask.ls!)
    const succLF = succTask.lf instanceof Date ? succTask.lf : new Date(succTask.lf!)
    const lag = dep.lag_days || 0

    let candidateLF: Date

    switch (dep.type) {
      case 'FS': {
        // Finish-to-Start: predecessor LF = successor LS - 1 - lag
        candidateLF = this.addDays(succLS, -1)
        if (lag > 0) {
          candidateLF = this.subtractWorkingDays(candidateLF, lag, workDays, holidays)
        } else if (lag < 0) {
          candidateLF = this.addWorkingDays(candidateLF, Math.abs(lag), workDays, holidays)
        }
        // Find previous working day
        candidateLF = this.findPreviousWorkingDay(candidateLF, workDays, holidays)
        break
      }
      case 'SS': {
        // Start-to-Start: predecessor LS = successor LS - lag
        // Then predecessor LF = addWorkingDays(predecessor LS, duration)
        let constrainedLS = new Date(succLS)
        if (lag > 0) {
          constrainedLS = this.subtractWorkingDays(constrainedLS, lag + 1, workDays, holidays)
        } else if (lag < 0) {
          constrainedLS = this.addWorkingDays(constrainedLS, Math.abs(lag) + 1, workDays, holidays)
        }
        candidateLF = this.addWorkingDays(constrainedLS, taskDuration, workDays, holidays)
        break
      }
      case 'FF': {
        // Finish-to-Finish: predecessor LF = successor LF - lag
        candidateLF = new Date(succLF)
        if (lag > 0) {
          candidateLF = this.subtractWorkingDays(candidateLF, lag + 1, workDays, holidays)
        } else if (lag < 0) {
          candidateLF = this.addWorkingDays(candidateLF, Math.abs(lag) + 1, workDays, holidays)
        }
        break
      }
      case 'SF': {
        // Start-to-Finish: predecessor LS = successor LF - lag
        // Then predecessor LF = addWorkingDays(predecessor LS, duration)
        let constrainedLS = new Date(succLF)
        if (lag > 0) {
          constrainedLS = this.subtractWorkingDays(constrainedLS, lag + 1, workDays, holidays)
        } else if (lag < 0) {
          constrainedLS = this.addWorkingDays(constrainedLS, Math.abs(lag) + 1, workDays, holidays)
        }
        candidateLF = this.addWorkingDays(constrainedLS, taskDuration, workDays, holidays)
        break
      }
      default:
        // Fallback to FS behavior
        candidateLF = this.addDays(succLS, -1)
        candidateLF = this.findPreviousWorkingDay(candidateLF, workDays, holidays)
        break
    }

    return candidateLF
  }

  /**
   * Backward Pass - Calculate Late Start (LS) and Late Finish (LF)
   * Supports all 4 dependency types: FS, SS, FF, SF with lead/lag
   */
  backwardPass(
    tasks: Task[],
    dependencies: Dependency[],
    projectEnd: Date,
    workDays: number[],
    holidays: Date[]
  ): Task[] {
    // Sort in reverse order for backward pass
    const sortedTasks = this.topologicalSort(tasks, dependencies).reverse()
    const taskMap = new Map<string, Task>()

    // Clone tasks to avoid mutation
    const resultTasks = sortedTasks.map(t => ({ ...t }))
    for (const task of resultTasks) {
      taskMap.set(task.id, task)
    }

    // Get successors for each task
    const successorMap = new Map<string, Dependency[]>()
    for (const dep of dependencies) {
      const deps = successorMap.get(dep.predecessor_id) || []
      deps.push(dep)
      successorMap.set(dep.predecessor_id, deps)
    }

    for (const task of resultTasks) {
      // Manual task: use ES/EF (already set in forward pass) as LS/LF
      if (task.scheduling_mode === 'manual') {
        task.ls = task.es || this.toDate(task.start_date) || task.ls
        task.lf = task.ef || this.toDate(task.end_date) || task.lf
        continue
      }

      const successors = successorMap.get(task.id) || []

      if (successors.length === 0) {
        // No successors - LF is project end
        task.lf = new Date(projectEnd)
      } else {
        // LF = min(candidateLF from all successors)
        let minDate: Date | null = null

        for (const dep of successors) {
          const succTask = taskMap.get(dep.successor_id)
          if (succTask && succTask.ls) {
            const candidateLF = this.computeCandidateLF(
              dep, succTask, task.duration, workDays, holidays
            )

            if (!minDate || candidateLF < minDate) {
              minDate = candidateLF
            }
          }
        }

        task.lf = minDate || new Date(projectEnd)
      }

      // Calculate LS
      task.ls = this.subtractWorkingDays(task.lf!, task.duration, workDays, holidays)
    }

    // Return in original order
    return resultTasks.reverse()
  }

  /**
   * Calculate slack and mark critical tasks
   */
  calculateSlack(
    tasks: Task[],
    workDays: number[],
    holidays: Date[]
  ): Task[] {
    return tasks.map(task => {
      const newTask = { ...task }

      if (task.es && task.ls) {
        newTask.slack = this.workingDaysBetween(task.es, task.ls, workDays, holidays)
        // Critical = zero slack OR negative slack (over-constrained from negative lag)
        newTask.is_critical = newTask.slack <= 0
      }

      return newTask
    })
  }

  /**
   * Calculate effective duration based on work hours per day
   */
  calculateEffectiveDuration(estimatedHours: number, member: TeamMember): number {
    const workHoursPerDay = member.work_hours_per_day || 8 // Default to 8 hours/day
    const daysNeeded = estimatedHours / workHoursPerDay
    return Math.ceil(daysNeeded)
  }

  /**
   * Calculate effective duration considering time-off in the task period.
   * Returns the extended duration and information about conflicting time-off.
   *
   * @param estimatedHours - The estimated hours for the task
   * @param startDate - The task start date
   * @param member - The team member assigned
   * @param timeOff - Array of approved time-off periods for the member
   * @param workDays - Working days of the week (0=Sunday, etc.)
   * @param holidays - Project-level holidays
   * @returns Object with effectiveDuration and any overlapping time-off days
   */
  calculateDurationWithTimeOff(
    estimatedHours: number,
    startDate: Date,
    member: TeamMember,
    timeOff: EmployeeTimeOff[],
    workDays: number[] = [0, 1, 2, 3, 4], // Default: Sunday-Thursday
    holidays: Date[] = []
  ): {
    baseDuration: number
    effectiveDuration: number
    timeOffDays: number
    affectedTimeOff: EmployeeTimeOff[]
  } {
    // Calculate base duration from hours
    const baseDuration = this.calculateEffectiveDuration(estimatedHours, member)

    // Get member's work days
    const memberWorkDays = member.work_days || workDays

    // Filter to approved time-off only
    const approvedTimeOff = timeOff.filter(to => to.status === 'approved')

    if (approvedTimeOff.length === 0) {
      return {
        baseDuration,
        effectiveDuration: baseDuration,
        timeOffDays: 0,
        affectedTimeOff: [],
      }
    }

    // Calculate the initial end date without time-off
    const initialEndDate = this.addWorkingDays(startDate, baseDuration, memberWorkDays, holidays)

    // Find time-off that overlaps with the task period
    const affectedTimeOff: EmployeeTimeOff[] = []
    let timeOffDays = 0

    for (const to of approvedTimeOff) {
      const toStart = new Date(to.start_date)
      const toEnd = new Date(to.end_date)

      // Check if time-off overlaps with task period
      if (toEnd >= startDate && toStart <= initialEndDate) {
        affectedTimeOff.push(to)

        // Count the time-off days that fall on working days within the task period
        let current = new Date(Math.max(toStart.getTime(), startDate.getTime()))
        const periodEnd = new Date(Math.min(toEnd.getTime(), initialEndDate.getTime()))

        while (current <= periodEnd) {
          if (this.isWorkingDay(current, memberWorkDays, holidays)) {
            timeOffDays++
          }
          current = this.addDays(current, 1)
        }
      }
    }

    // Effective duration = base duration + time-off days that fall on working days
    const effectiveDuration = baseDuration + timeOffDays

    return {
      baseDuration,
      effectiveDuration,
      timeOffDays,
      affectedTimeOff,
    }
  }

  /**
   * Main method: Calculate complete critical path
   */
  calculateCriticalPath(
    tasks: Task[],
    dependencies: Dependency[],
    projectStart: Date,
    workDays: number[],
    holidays: Date[]
  ): SchedulingResult {
    if (tasks.length === 0) {
      return {
        tasks: [],
        criticalPath: [],
        projectEndDate: null,
      }
    }

    // Step 1: Forward Pass
    let processedTasks = this.forwardPass(tasks, dependencies, projectStart, workDays, holidays)

    // Find project end date (max EF)
    let projectEnd: Date | null = null
    for (const task of processedTasks) {
      const taskEf = this.toDate(task.ef)
      if (taskEf && (!projectEnd || taskEf > projectEnd)) {
        projectEnd = taskEf
      }
    }

    if (!projectEnd) {
      return {
        tasks: processedTasks,
        criticalPath: [],
        projectEndDate: null,
      }
    }

    // Step 2: Backward Pass
    processedTasks = this.backwardPass(processedTasks, dependencies, projectEnd, workDays, holidays)

    // Step 3: Calculate Slack & Mark Critical
    processedTasks = this.calculateSlack(processedTasks, workDays, holidays)

    // Get critical path (tasks with slack = 0)
    const criticalPath = processedTasks
      .filter(t => t.is_critical)
      .map(t => t.id)

    return {
      tasks: processedTasks,
      criticalPath,
      projectEndDate: projectEnd,
    }
  }

  /**
   * Calculate with resource availability (time off, part-time workers)
   */
  calculateWithResources(
    tasks: Task[],
    dependencies: Dependency[],
    projectStart: Date,
    workDays: number[],
    holidays: Date[],
    teamMembers: TeamMember[],
    timeOff: EmployeeTimeOff[]
  ): SchedulingResult {
    // Create a map of user to their unavailable dates
    const userTimeOff = new Map<string, Date[]>()

    for (const to of timeOff) {
      if (to.status !== 'approved') continue

      const dates: Date[] = []
      let current = new Date(to.start_date)
      const end = new Date(to.end_date)

      while (current <= end) {
        dates.push(new Date(current))
        current = this.addDays(current, 1)
      }

      const existing = userTimeOff.get(to.team_member_id) || []
      userTimeOff.set(to.team_member_id, [...existing, ...dates])
    }

    // Create user work days map
    const userWorkDays = new Map<string, number[]>()
    for (const member of teamMembers) {
      if (member.user_id) {
        userWorkDays.set(member.user_id, member.work_days || [0, 1, 2, 3, 4])
      }
    }

    // Process tasks with resource constraints
    const sortedTasks = this.topologicalSort(tasks, dependencies)
    const taskMap = new Map<string, Task>()
    const resultTasks = sortedTasks.map(t => ({ ...t }))

    for (const task of resultTasks) {
      taskMap.set(task.id, task)
    }

    // Get predecessors for each task
    const predecessorMap = new Map<string, Dependency[]>()
    for (const dep of dependencies) {
      const deps = predecessorMap.get(dep.successor_id) || []
      deps.push(dep)
      predecessorMap.set(dep.successor_id, deps)
    }

    // Forward pass with resource constraints (supports all 4 dependency types)
    for (const task of resultTasks) {
      const predecessors = predecessorMap.get(task.id) || []

      // Get user-specific constraints
      const userId = task.assignee_id
      const memberWorkDays = userId ? (userWorkDays.get(userId) || workDays) : workDays
      const memberTimeOff = userId ? (userTimeOff.get(userId) || []) : []

      // Combine project holidays with user time off
      const allHolidays = [...holidays, ...memberTimeOff]

      if (predecessors.length === 0) {
        task.es = this.findNextWorkingDay(projectStart, memberWorkDays, allHolidays)
      } else {
        // ES = max(candidateES from all predecessors) using dependency-type-aware computation
        let maxDate: Date | null = null

        for (const dep of predecessors) {
          const predTask = taskMap.get(dep.predecessor_id)
          if (predTask && predTask.ef) {
            const candidateES = this.computeCandidateES(
              dep, predTask, task.duration, projectStart, memberWorkDays, allHolidays
            )

            if (!maxDate || candidateES > maxDate) {
              maxDate = candidateES
            }
          }
        }

        task.es = maxDate || this.findNextWorkingDay(projectStart, memberWorkDays, allHolidays)
      }

      task.ef = this.addWorkingDays(task.es!, task.duration, memberWorkDays, allHolidays)
    }

    // Find project end date
    let projectEnd: Date | null = null
    for (const task of resultTasks) {
      const taskEf = this.toDate(task.ef)
      if (taskEf && (!projectEnd || taskEf > projectEnd)) {
        projectEnd = taskEf
      }
    }

    if (!projectEnd) {
      return {
        tasks: resultTasks,
        criticalPath: [],
        projectEndDate: null,
      }
    }

    // Backward pass (simplified - using project work days)
    const backwardTasks = this.backwardPass(resultTasks, dependencies, projectEnd, workDays, holidays)

    // Calculate slack
    const finalTasks = this.calculateSlack(backwardTasks, workDays, holidays)

    const criticalPath = finalTasks
      .filter(t => t.is_critical)
      .map(t => t.id)

    return {
      tasks: finalTasks,
      criticalPath,
      projectEndDate: projectEnd,
    }
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private toDate(value: Date | string | null): Date | null {
    if (!value) return null
    if (value instanceof Date) return value
    return new Date(value)
  }

  private addDays(date: Date | string, days: number): Date {
    const d = date instanceof Date ? date : new Date(date)
    const result = new Date(d)
    result.setDate(result.getDate() + days)
    return result
  }

  private toDateString(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  private findNextWorkingDay(date: Date, workDays: number[], holidays: Date[]): Date {
    let current = new Date(date)
    while (!this.isWorkingDay(current, workDays, holidays)) {
      current = this.addDays(current, 1)
    }
    return current
  }

  private findPreviousWorkingDay(date: Date, workDays: number[], holidays: Date[]): Date {
    let current = new Date(date)
    while (!this.isWorkingDay(current, workDays, holidays)) {
      current = this.addDays(current, -1)
    }
    return current
  }
}

// Export singleton instance for convenience
export const schedulingService = new SchedulingService()

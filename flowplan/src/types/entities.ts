/**
 * FlowPlan Entity Types
 * Based on PRD v2.1 - Lean MVP + Resource-Aware
 */

// ============================================
// Enums
// ============================================

export type ProjectStatus = 'active' | 'completed' | 'archived'
export type TaskStatus = 'pending' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF' // Finish-Start, Start-Start, etc.
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low'
export type FindingStatus = 'open' | 'in_progress' | 'closed'
export type CalendarExceptionType = 'holiday' | 'non_working'
export type EmploymentType = 'full_time' | 'part_time' | 'contractor'
export type TimeOffType = 'vacation' | 'sick' | 'personal' | 'other'
export type TimeOffStatus = 'pending' | 'approved' | 'rejected'
export type UserRole = 'admin' | 'member'
export type PhaseStatus = 'pending' | 'active' | 'completed'

// ============================================
// Base Types
// ============================================

export interface BaseEntity {
  id: string
  created_at: Date
}

// ============================================
// 1. Project
// ============================================

export interface Project extends BaseEntity {
  name: string
  organization_id: string
  methodology: string
  description: string | null
  status: ProjectStatus
  start_date: Date | null
  end_date: Date | null
  target_end_date: Date | null
  actual_end_date: Date | null
  budget_amount: number | null
  budget_currency: string
  owner_id: string
  working_days: number[]
  default_work_hours: number
  created_by: string
  updated_at: Date
}

export interface CreateProjectInput {
  name: string
  description?: string | null
  start_date?: Date | null
  end_date?: Date | null
}

// ============================================
// 2. Task
// ============================================

export type TaskType = 'task' | 'milestone'

export interface Task extends BaseEntity {
  project_id: string
  phase_id: string | null
  title: string
  description: string | null
  task_type: TaskType
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null

  // Scheduling fields (CPM)
  duration: number // Duration in working days
  estimated_hours: number | null // Total hours needed
  actual_hours: number // Hours actually spent
  start_date: Date | string | null
  end_date: Date | string | null
  due_date: Date | string | null
  es: Date | null // Early Start
  ef: Date | null // Early Finish
  ls: Date | null // Late Start
  lf: Date | null // Late Finish
  slack: number // Slack = LS - ES (in working days)
  is_critical: boolean // On Critical Path?

  // Display fields
  progress_percent: number
  wbs_number: string | null
  order_index: number

  updated_at: Date
}

export interface CreateTaskInput {
  project_id: string
  phase_id?: string | null
  title: string
  description?: string | null
  priority?: TaskPriority
  assignee_id?: string | null
  duration?: number
  estimated_hours?: number | null
  start_date?: Date | null
}

// ============================================
// 3. Dependency
// ============================================

export interface Dependency extends BaseEntity {
  predecessor_id: string
  successor_id: string
  type: DependencyType
  lag_days: number
}

export interface CreateDependencyInput {
  predecessor_id: string
  successor_id: string
  type?: DependencyType
  lag_days?: number
}

// ============================================
// 4. Audit Finding
// ============================================

export interface AuditFinding extends BaseEntity {
  task_id: string
  severity: FindingSeverity
  finding: string
  root_cause: string | null
  capa: string | null // Corrective Action / Preventive Action
  due_date: Date | null
  status: FindingStatus
}

export interface CreateAuditFindingInput {
  task_id: string
  severity: FindingSeverity
  finding: string
  root_cause?: string | null
  capa?: string | null
  due_date?: Date | null
}

// ============================================
// 5. Calendar Exception
// ============================================

export interface CalendarException extends BaseEntity {
  project_id: string
  date: Date
  type: CalendarExceptionType
  name: string | null
}

export interface CreateCalendarExceptionInput {
  project_id: string
  date: Date
  type: CalendarExceptionType
  name?: string | null
}

// ============================================
// 6. Team Member
// ============================================

export interface TeamMember extends BaseEntity {
  user_id: string
  project_id: string
  first_name: string
  last_name: string
  email: string
  employment_type: EmploymentType
  work_hours_per_day: number // e.g., 8.0, 4.0
  work_days: number[] // Days of week (1=Sunday, 7=Saturday)
  role: UserRole
  hourly_rate: number | null
}

export interface CreateTeamMemberInput {
  user_id: string
  project_id: string
  employment_type?: EmploymentType
  work_hours_per_day?: number
  work_days?: number[]
  role?: UserRole
  hourly_rate?: number | null
}

// ============================================
// 7. Employee Time Off
// ============================================

export interface EmployeeTimeOff extends BaseEntity {
  user_id: string
  start_date: Date
  end_date: Date
  type: TimeOffType
  status: TimeOffStatus
  notes: string | null
}

export interface CreateEmployeeTimeOffInput {
  user_id: string
  start_date: Date
  end_date: Date
  type: TimeOffType
  notes?: string | null
}

// ============================================
// 8. Project Phase
// ============================================

export interface ProjectPhase extends BaseEntity {
  project_id: string
  name: string
  description: string | null
  phase_order: number
  order_index: number
  status: PhaseStatus
  start_date: Date | string | null
  end_date: Date | string | null
  total_tasks: number
  completed_tasks: number
  task_count: number
  completed_task_count: number
  updated_at: Date | string
}

export interface CreateProjectPhaseInput {
  project_id: string
  name: string
  description?: string | null
  phase_order: number
  start_date?: Date | null
  end_date?: Date | null
}

// ============================================
// 9. Task Assignment
// ============================================

export interface TaskAssignment extends BaseEntity {
  task_id: string
  user_id: string
  allocated_hours: number
  actual_hours: number
  start_date: Date | null
  end_date: Date | null
  notes: string | null
}

export interface CreateTaskAssignmentInput {
  task_id: string
  user_id: string
  allocated_hours: number
  start_date?: Date | null
  notes?: string | null
}

// ============================================
// Computed/Derived Types
// ============================================

export interface TaskWithDependencies extends Task {
  predecessors: Dependency[]
  successors: Dependency[]
}

export interface ProjectWithPhases extends Project {
  phases: ProjectPhase[]
}

export interface PhaseWithTasks extends ProjectPhase {
  tasks: Task[]
}

export interface TeamMemberWithTimeOff extends TeamMember {
  time_off: EmployeeTimeOff[]
}

// ============================================
// Scheduling Types
// ============================================

export interface SchedulingResult {
  tasks: Task[]
  criticalPath: string[] // Task IDs on critical path
  projectEndDate: Date | null
}

export interface WorkingDayConfig {
  workDays: number[] // Default: [1,2,3,4,5] (Sun-Thu in Israel, or Mon-Fri)
  holidays: Date[]
}

export interface ResourceAvailability {
  userId: string
  workHoursPerDay: number
  workDays: number[]
  timeOff: { start: Date; end: Date }[]
}
